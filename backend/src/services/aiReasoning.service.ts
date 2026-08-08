/**
 * AI Reasoning Service
 *
 * Generates concise, recruiter-friendly AI insights for a candidate–job match.
 * Produced insights:
 *   - strengths   (string[], max 5)
 *   - weaknesses  (string[], max 5)
 *   - summary     (string, 1-2 sentences)
 *
 * Generation strategy:
 *   - Lazy: generated once on the first recruiter view of an application.
 *   - Cached: stored in the `applications` row; never regenerated unless forceRefresh=true.
 *   - Grounded: the prompt uses ONLY facts already available in the DB (skills, job description,
 *     ATS scores). The AI is instructed never to invent experience or qualifications.
 *
 * Safety:
 *   - Falls back to a safe empty response on any AI failure or malformed JSON.
 *   - Never throws to callers — all errors are caught and logged.
 *   - Does NOT call AIService if the result is already cached (minimises API quota usage).
 */

import pool from '../config/database';
import { AIService } from './ai.service';

const LOG_PREFIX = '[AIReasoning]';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AiReasoningResult {
  strengths: string[];
  weaknesses: string[];
  summary: string;
  generatedAt: string | null;
}

/** Safe fallback returned whenever AI generation fails. */
const FALLBACK_RESULT: AiReasoningResult = {
  strengths: [],
  weaknesses: [],
  summary: 'AI analysis unavailable.',
  generatedAt: null,
};

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(params: {
  candidateName: string;
  candidateSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  jobTitle: string;
  jobDescription: string;
  jobSkills: string[];
  finalMatchScore: number;
  skillsScore: number;
  experienceScore: number;
}): string {
  const {
    candidateName,
    candidateSkills,
    matchedSkills,
    missingSkills,
    jobTitle,
    jobDescription,
    jobSkills,
    finalMatchScore,
    skillsScore,
    experienceScore,
  } = params;

  // Truncate job description to keep prompt lean
  const truncatedDesc = jobDescription.slice(0, 800);

  return `You are a senior technical recruiter AI. Analyse this candidate–job match and return ONLY valid JSON.

STRICT RULES:
- Output ONLY a raw JSON object. No markdown, no code fences, no extra text.
- Base ALL claims exclusively on the data provided below.
- NEVER invent skills, experience, certifications, or qualifications not listed.
- Maximum 5 strengths, maximum 5 weaknesses, one 1–2 sentence summary.
- Each strength/weakness must be a concise, recruiter-friendly sentence (under 15 words).

CANDIDATE DATA:
- Name: ${candidateName}
- Skills listed: ${candidateSkills.join(', ') || 'None listed'}
- Matched job skills: ${matchedSkills.join(', ') || 'None'}
- Missing job skills: ${missingSkills.join(', ') || 'None'}
- Overall match score: ${finalMatchScore}/100
- Skills sub-score: ${skillsScore}/100
- Experience keyword sub-score: ${experienceScore}/100

JOB DATA:
- Title: ${jobTitle}
- Required skills: ${jobSkills.join(', ') || 'Not specified'}
- Description (excerpt): ${truncatedDesc}

REQUIRED JSON SCHEMA (respond with exactly this shape, no other keys):
{
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "summary": "One to two sentence overall assessment."
}`;
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateAndNormalize(raw: unknown): AiReasoningResult | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;

  const strengths = obj.strengths;
  const weaknesses = obj.weaknesses;
  const summary = obj.summary;

  if (
    !Array.isArray(strengths) ||
    !Array.isArray(weaknesses) ||
    typeof summary !== 'string'
  ) {
    return null;
  }

  // Filter to pure strings, cap at 5 each
  const cleanStrengths = strengths
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .slice(0, 5)
    .map((s) => s.trim());

  const cleanWeaknesses = weaknesses
    .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
    .slice(0, 5)
    .map((w) => w.trim());

  const cleanSummary = summary.trim() || 'AI analysis unavailable.';

  return {
    strengths: cleanStrengths,
    weaknesses: cleanWeaknesses,
    summary: cleanSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── DB helpers ───────────────────────────────────────────────────────────────

async function fetchApplicationData(applicationId: string): Promise<{
  applicant_name: string;
  candidate_skills: string[];
  job_title: string;
  job_description: string;
  job_skills: string[];
  final_match_score: number;
  skills_score: number;
  experience_score: number;
  ai_reasoning_generated_at: Date | null;
} | null> {
  const { rows } = await pool.query(
    `SELECT
       ap.name                       AS applicant_name,
       ap.skills                     AS candidate_skills,
       j.title                       AS job_title,
       j.description                 AS job_description,
       j.skills                      AS job_skills,
       COALESCE(a.final_match_score, 0)  AS final_match_score,
       COALESCE(a.skills_score, 0)       AS skills_score,
       COALESCE(a.experience_score, 0)   AS experience_score,
       a.ai_reasoning_generated_at
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN applicant_profiles ap ON ap.user_id = a.applicant_id
     WHERE a.id = $1
     LIMIT 1`,
    [applicationId],
  );
  return rows[0] || null;
}

async function persistReasoning(
  applicationId: string,
  result: AiReasoningResult,
): Promise<void> {
  await pool.query(
    `UPDATE applications
       SET ai_strengths               = $1,
           ai_weaknesses              = $2,
           ai_summary                 = $3,
           ai_reasoning_generated_at  = NOW()
     WHERE id = $4`,
    [
      JSON.stringify(result.strengths),
      JSON.stringify(result.weaknesses),
      result.summary,
      applicationId,
    ],
  );
}

async function fetchCachedReasoning(
  applicationId: string,
): Promise<AiReasoningResult | null> {
  const { rows } = await pool.query(
    `SELECT ai_strengths, ai_weaknesses, ai_summary, ai_reasoning_generated_at
     FROM applications
     WHERE id = $1 AND ai_reasoning_generated_at IS NOT NULL
     LIMIT 1`,
    [applicationId],
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  const strengths = Array.isArray(row.ai_strengths)
    ? row.ai_strengths
    : typeof row.ai_strengths === 'string'
      ? JSON.parse(row.ai_strengths)
      : [];
  const weaknesses = Array.isArray(row.ai_weaknesses)
    ? row.ai_weaknesses
    : typeof row.ai_weaknesses === 'string'
      ? JSON.parse(row.ai_weaknesses)
      : [];

  return {
    strengths,
    weaknesses,
    summary: row.ai_summary || 'AI analysis unavailable.',
    generatedAt: row.ai_reasoning_generated_at?.toISOString() ?? null,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export const AiReasoningService = {
  /**
   * Generate and cache AI reasoning for a candidate–job application.
   *
   * Lazy strategy:
   *   - If cached reasoning exists and forceRefresh=false, returns the cache immediately.
   *   - Otherwise calls Gemini to generate fresh reasoning and stores it.
   *   - Always returns a safe fallback on any failure.
   *
   * @param applicationId  UUID of the application row
   * @param forceRefresh   When true, ignores cache and regenerates
   */
  async generateReasoning(
    applicationId: string,
    forceRefresh = false,
  ): Promise<AiReasoningResult> {
    const startMs = Date.now();
    try {
      // 1. Return cached result if available and not forcing refresh
      if (!forceRefresh) {
        const cached = await fetchCachedReasoning(applicationId);
        if (cached) {
          console.log(
            `${LOG_PREFIX} Cache HIT for application ${applicationId} — skipping AI call`,
          );
          return cached;
        }
      }

      // 2. Fetch application + job + candidate data
      const data = await fetchApplicationData(applicationId);
      if (!data) {
        console.warn(
          `${LOG_PREFIX} Application ${applicationId} not found — returning fallback`,
        );
        return FALLBACK_RESULT;
      }

      const candidateSkills: string[] = Array.isArray(data.candidate_skills)
        ? data.candidate_skills
        : [];
      const jobSkills: string[] = Array.isArray(data.job_skills)
        ? data.job_skills
        : [];

      // Derive matched/missing from existing skill lists (reuse ATS data, no extra calls)
      const jobSkillsNorm = new Set(jobSkills.map((s) => s.toLowerCase().trim()));
      const matchedSkills = candidateSkills.filter((s) =>
        jobSkillsNorm.has(s.toLowerCase().trim()),
      );
      const missingSkills = jobSkills.filter(
        (s) => !candidateSkills.map((c) => c.toLowerCase().trim()).includes(s.toLowerCase().trim()),
      );

      // 3. Build prompt
      const prompt = buildPrompt({
        candidateName: data.applicant_name || 'Candidate',
        candidateSkills,
        matchedSkills,
        missingSkills,
        jobTitle: data.job_title,
        jobDescription: data.job_description,
        jobSkills,
        finalMatchScore: Number(data.final_match_score),
        skillsScore: Number(data.skills_score),
        experienceScore: Number(data.experience_score),
      });

      // 4. Call AI (returns null on failure — never throws)
      console.log(`${LOG_PREFIX} Calling AI for application ${applicationId}…`);
      const raw = await AIService.generateJSON<unknown>(prompt);

      // 5. Validate response
      const validated = raw ? validateAndNormalize(raw) : null;

      if (!validated) {
        console.warn(
          `${LOG_PREFIX} Invalid AI response for application ${applicationId} — using fallback. Raw:`,
          typeof raw === 'object' ? JSON.stringify(raw).slice(0, 200) : raw,
        );
        return FALLBACK_RESULT;
      }

      // 6. Persist to DB
      await persistReasoning(applicationId, validated);

      const elapsed = Date.now() - startMs;
      console.log(
        `${LOG_PREFIX} Generated reasoning for application ${applicationId} in ${elapsed}ms`,
      );

      return validated;
    } catch (err) {
      const elapsed = Date.now() - startMs;
      console.error(
        `${LOG_PREFIX} Unexpected error for application ${applicationId} in ${elapsed}ms:`,
        err,
      );
      return FALLBACK_RESULT;
    }
  },

  /**
   * Returns the cached reasoning without triggering generation.
   * Returns null if no reasoning has been generated yet.
   */
  async getCachedReasoning(applicationId: string): Promise<AiReasoningResult | null> {
    try {
      return await fetchCachedReasoning(applicationId);
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to fetch cached reasoning:`, err);
      return null;
    }
  },
};
