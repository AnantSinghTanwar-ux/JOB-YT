import pool from '../config/database';
import { ResumeModel } from '../models/resume.model';
import { UnifiedMatchService, HybridScoreResult } from './unifiedMatch.service';
import {
  AutoApplyPreferences,
  AutoApplyPreferencesInput,
  MatchReason,
  RankedJob,
} from '../types/autoApply.types';

const LOG_PREFIX = '[AutoApplyMatchService]';

interface JobRow {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  type: string;
  description: string;
  skills: string[];
}

function normalizeList(items?: string[]): string[] {
  return (items || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function buildMatchReason(
  hybrid: HybridScoreResult,
  job: { location?: string | null },
  prefs: AutoApplyPreferences | AutoApplyPreferencesInput,
): MatchReason {
  const overall = hybrid.finalMatchScore;
  const locationMatched = matchesLocation(job.location, prefs.target_locations || []);

  let humanSummary = `Overall match ${overall}%.`;
  if (hybrid.matchedSkills.length > 0) {
    humanSummary += ` Strong skills: ${hybrid.matchedSkills.slice(0, 3).join(', ')}.`;
  }
  if (hybrid.missingSkills.length > 0) {
    humanSummary += ` Missing: ${hybrid.missingSkills.slice(0, 2).join(', ')}.`;
  }
  if (locationMatched) {
    humanSummary += ' Location preference met.';
  }

  return {
    overall,
    skills: {
      score: hybrid.skillsScore,
      matchedSkills: hybrid.matchedSkills,
      missing: hybrid.missingSkills,
    },
    experience: {
      score: hybrid.experienceScore,
      summary: hybrid.experienceScore >= 60 ? 'Relevant experience' : 'Experience below preferred level',
    },
    location: {
      score: locationMatched ? 100 : 50,
      matched: locationMatched,
      detail: job.location || 'Not specified',
    },
    semantic: { score: hybrid.semanticScore },
    education: { score: hybrid.educationScore },
    exclusion_reason: null,
    human_summary: humanSummary.trim(),
  };
}

function matchesLocation(jobLocation: string | null | undefined, targets: string[]): boolean {
  if (!targets.length) return true;
  const loc = (jobLocation || '').toLowerCase();
  if (!loc) return false;
  return targets.some((t) => loc.includes(t.toLowerCase()) || t.toLowerCase().includes('remote') && loc.includes('remote'));
}

function getExclusionReason(
  job: JobRow,
  prefs: AutoApplyPreferences | AutoApplyPreferencesInput,
  score: number,
): string | null {
  const threshold = prefs.match_threshold ?? 70;
  if (score < threshold) return 'below_threshold';

  const company = (job.company_name || '').toLowerCase();
  const excludedCompanies = normalizeList(prefs.excluded_companies);
  if (excludedCompanies.some((c) => company.includes(c))) return 'company_excluded';

  const titleDesc = `${job.title} ${job.description}`.toLowerCase();
  const excludedKeywords = normalizeList(prefs.excluded_keywords);
  if (excludedKeywords.some((k) => titleDesc.includes(k))) return 'keyword_excluded';

  const targetRoles = normalizeList(prefs.target_roles);
  if (targetRoles.length > 0) {
    const title = job.title.toLowerCase();
    if (!targetRoles.some((r) => title.includes(r) || title.includes(r.split(' ')[0]))) {
      return 'role_mismatch';
    }
  }

  const targetLocations = prefs.target_locations || [];
  if (targetLocations.length > 0 && !matchesLocation(job.location, targetLocations)) {
    return 'location_mismatch';
  }

  const targetTypes = prefs.target_job_types || [];
  if (targetTypes.length > 0 && !targetTypes.includes(job.type as never)) {
    return 'job_type_mismatch';
  }

  return null;
}

export const AutoApplyMatchService = {
  buildMatchReason,

  async resolveResumeId(userId: string, prefs: AutoApplyPreferences | AutoApplyPreferencesInput): Promise<string | null> {
    if (prefs.base_resume_id) {
      const resume = await ResumeModel.findByUserAndId(userId, prefs.base_resume_id);
      if (resume) return resume.id;
    }
    const { rows } = await pool.query(
      'SELECT id FROM resumes WHERE user_id = $1 AND is_default = true LIMIT 1',
      [userId],
    );
    return rows[0] ? String(rows[0].id) : null;
  },

  async fetchEligibleJobs(userId: string): Promise<JobRow[]> {
    const { rows } = await pool.query(
      `SELECT j.id, j.title, j.company_name, j.location, j.type::text AS type, j.description, j.skills
       FROM jobs j
       WHERE j.status = 'active'
         AND j.deleted_at IS NULL
         AND COALESCE(j.disallow_auto_apply, false) = false
         AND (j.external_url IS NULL OR j.source = 'recruiter')
         AND NOT EXISTS (
           SELECT 1 FROM applications a WHERE a.job_id = j.id AND a.applicant_id = $1
         )
         AND NOT EXISTS (
           SELECT 1 FROM auto_apply_queue_items q
           WHERE q.user_id = $1 AND q.job_id = j.id AND q.status IN ('submitted', 'pending_approval', 'tailoring', 'submitting')
         )
         AND NOT EXISTS (
           SELECT 1 FROM auto_apply_queue_items q
           WHERE q.user_id = $1 AND q.job_id = j.id
             AND q.status = 'failed'
             AND q.failed_at > NOW() - INTERVAL '7 days'
         )
       ORDER BY j.created_at DESC
       LIMIT 100`,
      [userId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      company_name: String(r.company_name || 'Unknown Company'),
      location: r.location ? String(r.location) : null,
      type: String(r.type),
      description: String(r.description || ''),
      skills: Array.isArray(r.skills) ? r.skills : [],
    }));
  },

  async rankJobsForUser(
    userId: string,
    prefs: AutoApplyPreferences | AutoApplyPreferencesInput,
  ): Promise<{ eligible: RankedJob[]; excluded: Array<{ job_id: string; title: string; company: string; exclusion_reason: string }> }> {
    const resumeId = await this.resolveResumeId(userId, prefs);
    if (!resumeId) {
      console.warn(`${LOG_PREFIX} No resume for user ${userId}`);
      return { eligible: [], excluded: [] };
    }

    const jobs = await this.fetchEligibleJobs(userId);
    const eligible: RankedJob[] = [];
    const excluded: Array<{ job_id: string; title: string; company: string; exclusion_reason: string }> = [];

    // Score jobs in parallel batches of 10 to avoid sequential 50s+ bottleneck
    const CONCURRENCY = 10;
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      const chunk = jobs.slice(i, i + CONCURRENCY);
      const scored = await Promise.all(
        chunk.map((job) =>
          UnifiedMatchService.scoreCandidateForJob(userId, job.id, resumeId).then((hybrid) => ({ job, hybrid })),
        ),
      );

      for (const { job, hybrid } of scored) {
        const exclusion = getExclusionReason(job, prefs, hybrid.finalMatchScore);

        if (exclusion) {
          excluded.push({
            job_id: job.id,
            title: job.title,
            company: job.company_name,
            exclusion_reason: exclusion,
          });
          continue;
        }

        const matchReason = buildMatchReason(hybrid, job, prefs);
        eligible.push({
          job_id: job.id,
          title: job.title,
          company: job.company_name,
          location: job.location,
          type: job.type,
          match_score: hybrid.finalMatchScore,
          match_reason: matchReason,
          match_breakdown: hybrid,
        });
      }
    }

    eligible.sort((a, b) => b.match_score - a.match_score);
    return { eligible, excluded };
  },
};
