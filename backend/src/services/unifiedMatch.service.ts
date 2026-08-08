import pool from '../config/database';
import { ATSService } from './ats.service';
import { EmbeddingCacheService } from './embeddingCache.service';
import { ResumeService } from './resume.service';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import { parseResume } from '../utils/resumeParser';
import { cosineSimilarity, similarityToScore } from '../utils/embedding';
import { SkillMatchingService } from './matching/skillMatching.service';
import { ResumeModel } from '../models/resume.model';

const LOG_PREFIX = '[UnifiedMatch]';

export interface FuzzyMatch {
  candidateSkill: string;
  requiredSkill: string;
  score: number;
}

export interface HybridScoreResult {
  finalMatchScore: number;      // 0-100 hybrid score
  semanticScore: number;         // 0-100 embedding cosine similarity
  skillsScore: number;           // 0-100 skills match
  experienceScore: number;       // 0-100 experience match
  keywordScore: number;          // 0-100 keyword overlap
  educationScore: number;        // 0-100 education keyword match
  matchedSkills: string[];
  missingSkills: string[];
  fuzzyMatchedSkills: FuzzyMatch[];
  keywordOverlap: string[];
  recommendations: string[];
  scoringVersion: string;
  embeddingAvailable: boolean;
}

function scoreEducation(
  resumeEducation: any[],
  jobDescription: string,
): { score: number; overlap: string[] } {
  if (!resumeEducation || resumeEducation.length === 0 || !jobDescription) {
    return { score: 0, overlap: [] };
  }

  // Common education keywords to look for
  const eduKeywords = [
    'computer science', 'engineering', 'science', 'mathematics', 'physics',
    'bachelor', 'master', 'phd', 'doctorate', 'degree', 'diploma',
    'bs', 'ms', 'ba', 'ma', 'btech', 'mtech', 'mca', 'bca', 'mba'
  ];

  const jobDescLower = jobDescription.toLowerCase();
  
  // Find which of these keywords are present in the job description
  const requiredKeywords = eduKeywords.filter(kw => jobDescLower.includes(kw));
  if (requiredKeywords.length === 0) {
    // If the job description does not specify any education keywords, return 100 as default pass
    return { score: 100, overlap: [] };
  }

  // Combine all candidate education text (degree, field of study, institution)
  const candidateEduText = resumeEducation.map(edu => {
    if (typeof edu === 'string') return edu;
    return `${edu.degree || ''} ${edu.field || ''} ${edu.institution || ''}`;
  }).join(' ').toLowerCase();

  // Find overlaps
  const overlap = requiredKeywords.filter(kw => candidateEduText.includes(kw));

  const score = Math.round((overlap.length / requiredKeywords.length) * 100);
  return { score, overlap };
}

/**
 * Compute job-specific text overlap between resume text and job description.
 *
 * Used ONLY inside UnifiedMatchService for the `finalMatchScore` calculation.
 * This replaces the old ATS section score usage — since ATSService now returns
 * job-independent resume quality scores, job-specific overlap must be computed
 * separately here.
 *
 * Uses BM25-style saturation (k=0.3) to prevent score collapse caused by
 * vocabulary mismatch between concise resumes and verbose job descriptions.
 * Example: a resume with 20% token overlap will score ~45 instead of 20.
 */
function scoreJobTextOverlap(resumeText: string, jobDescription: string): number {
  if (!resumeText?.trim() || !jobDescription?.trim()) return 0;

  const stopwords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was',
    'one', 'our', 'out', 'has', 'have', 'been', 'will', 'with', 'that', 'this', 'from',
    'they', 'would', 'make', 'like', 'just', 'over', 'such', 'take', 'than', 'them',
    'very', 'some', 'could', 'what', 'there', 'their', 'about', 'which', 'when',
    'were', 'into', 'more', 'other', 'your', 'able', 'work', 'team', 'role', 'years',
    'year', 'experience', 'working',
  ]);

  const tokenize = (text: string): Set<string> =>
    new Set(
      text.toLowerCase()
        .replace(/[^a-z0-9#+.\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 2 && !stopwords.has(t)),
    );

  const resumeTokens = tokenize(resumeText);
  const jobTokens = tokenize(jobDescription);
  if (jobTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of jobTokens) {
    if (resumeTokens.has(token)) overlap++;
  }

  const ratio = overlap / jobTokens.size;
  // BM25 saturation k=0.3 — prevents score collapse for legitimate vocabulary mismatch
  const k = 0.3;
  const saturated = (ratio * (1 + k)) / (ratio + k);
  return Math.round(Math.min(100, saturated * 100));
}

function emptyHybridScoreResult(): HybridScoreResult {
  return {
    finalMatchScore: 0,
    semanticScore: 0,
    skillsScore: 0,
    experienceScore: 0,
    keywordScore: 0,
    educationScore: 0,
    matchedSkills: [],
    missingSkills: [],
    fuzzyMatchedSkills: [],
    keywordOverlap: [],
    recommendations: ['Analysis is processing or failed due to missing details.'],
    scoringVersion: 'v1.0',
    embeddingAvailable: false,
  };
}

export const UnifiedMatchService = {

  /**
   * Score a candidate against a job without persisting to applications (Auto-Apply, preview).
   */
  async scoreCandidateForJob(
    applicantId: string,
    jobId: string,
    resumeId: string | null,
  ): Promise<HybridScoreResult> {
    const startMs = Date.now();
    console.log(`${LOG_PREFIX} Scoring candidate ${applicantId} for job ${jobId}...`);

    try {
      const result = await UnifiedMatchService.computeHybridScoreForCandidate(
        applicantId,
        jobId,
        resumeId,
      );
      const elapsed = Date.now() - startMs;
      console.log(`${LOG_PREFIX} Scored candidate for job ${jobId}: ${result.finalMatchScore}/100 in ${elapsed}ms`);
      return result;
    } catch (err) {
      console.error(`${LOG_PREFIX} Error scoring candidate for job ${jobId}:`, err);
      return emptyHybridScoreResult();
    }
  },

  async computeHybridScoreForCandidate(
    applicantId: string,
    jobId: string,
    resumeId: string | null,
  ): Promise<HybridScoreResult> {
      // 1. Fetch job details
      const { rows: jobRows } = await pool.query(
        'SELECT title, description, skills FROM jobs WHERE id = $1',
        [jobId]
      );
      if (jobRows.length === 0) {
        throw new Error(`Job ${jobId} not found`);
      }
      const job = jobRows[0];
      const jobSkills: string[] = Array.isArray(job.skills) ? job.skills : [];
      const jobDescription: string = job.description || '';

      // 2. Fetch candidate details from resume file or profile fallback
      let candidateSkills: string[] = [];
      let candidateEducation: any[] = [];
      let candidateExperienceText = '';
      let candidateFullText = '';

      if (resumeId) {
        try {
          const resume = await ResumeModel.findByUserAndId(applicantId, resumeId);
          if (resume) {
            const buffer = await ResumeService.loadResumeFileBuffer(resume.file_url);
            const parsed = await parseResume(buffer, {
              filename: resume.file_name,
              mimeType: resume.mime_type || undefined,
            });
            candidateSkills = parsed.skills || [];
            candidateEducation = parsed.education || [];
            
            // Build experience text
            candidateExperienceText = (parsed.experience || [])
              .map(exp => `${exp.role || ''} at ${exp.company || ''}`)
              .join(', ');
            
            // Use extracted text as fullText if available, otherwise join
            candidateFullText = parsed.rawText || [
              candidateSkills.join(', '),
              candidateExperienceText,
              (parsed.education || []).map(edu => `${edu.degree || ''} ${edu.institution || ''}`).join(', ')
            ].join('\n');
          }
        } catch (err) {
          console.warn(`${LOG_PREFIX} Failed to parse resume file ${resumeId}, falling back to profile:`, err);
        }
      }

      // Profile fallback if resume parsing yielded nothing or no resumeId was provided
      if (candidateSkills.length === 0) {
        const profile = await ApplicantProfileModel.findByUserId(applicantId);
        if (profile) {
          candidateSkills = profile.skills || [];
          candidateEducation = profile.education || [];
          candidateExperienceText = JSON.stringify(profile.experience || []);
          candidateFullText = [
            profile.name || '',
            profile.bio || '',
            candidateSkills.join(', '),
            candidateExperienceText,
            JSON.stringify(profile.education || [])
          ].join('\n');
        }
      }

      // 3. Compute resume quality baseline (job-independent ATS score)
      const baseline = ATSService.calculateATSScore(
        {
          skills: candidateSkills,
          experienceText: candidateExperienceText,
          fullText: candidateFullText,
          education: candidateEducation,
        },
        {
          skills: jobSkills,
          description: jobDescription,
        }
      );

      // 4. Compute education score (5% weight in finalMatchScore)
      const eduResult = scoreEducation(candidateEducation, jobDescription);

      // 4b. Compute job-specific text overlap for finalMatchScore components.
      //     These are SEPARATE from baseline.sectionScores (which are now resume quality).
      const jobExpOverlapScore  = scoreJobTextOverlap(candidateExperienceText, jobDescription);
      const jobKwOverlapScore   = scoreJobTextOverlap(candidateFullText, jobDescription);

      // 4c. Compute job-specific skill match (used for finalMatchScore AND explainability)
      const skillMatchDetail = SkillMatchingService.calculateSkillMatch(candidateSkills, jobSkills);
      const fuzzyMatchedSkills: FuzzyMatch[] = (skillMatchDetail as any).fuzzyMatches || [];

      // 5. Attempt semantic scoring
      let semanticScore = 0;
      let embeddingAvailable = false;

      try {
        let resumeEmbedding = null;
        if (resumeId) {
          resumeEmbedding = await EmbeddingCacheService.getResumeEmbedding(resumeId, applicantId);
        }
        if (!resumeEmbedding) {
          resumeEmbedding = await EmbeddingCacheService.getOrGenerate(candidateFullText);
        }

        let jobEmbedding = await EmbeddingCacheService.getJobEmbedding(jobId);
        if (!jobEmbedding) {
          jobEmbedding = await EmbeddingCacheService.getOrGenerate(jobDescription);
          if (jobEmbedding) {
            await EmbeddingCacheService.storeJobEmbedding(jobId, jobEmbedding).catch(
              err => console.warn(`${LOG_PREFIX} Failed to cache job embedding:`, err)
            );
          }
        }

        if (resumeEmbedding && jobEmbedding) {
          const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding);
          semanticScore = similarityToScore(similarity);
          embeddingAvailable = true;
        }
      } catch (err) {
        console.warn(`${LOG_PREFIX} Semantic scoring failed, using keyword fallback:`, err);
      }

      // 6. Compute hybrid finalMatchScore using job-specific components.
      //    NOTE: baseline.sectionScores are now resume-quality metrics (job-independent).
      //    We use skillMatchDetail.matchPercentage and jobXxxOverlapScore for job-specific fit.
      let finalMatchScore = 0;
      if (embeddingAvailable) {
        // With embeddings: semantic=35%, skills=30%, experience=20%, keywords=10%, education=5%
        finalMatchScore = Math.round(
          semanticScore                      * 0.35 +
          skillMatchDetail.matchPercentage   * 0.30 +
          jobExpOverlapScore                 * 0.20 +
          jobKwOverlapScore                  * 0.10 +
          eduResult.score                    * 0.05
        );
      } else {
        // Fallback: skills=50%, experience=30%, keywords=15%, education=5%
        finalMatchScore = Math.round(
          skillMatchDetail.matchPercentage   * 0.50 +
          jobExpOverlapScore                 * 0.30 +
          jobKwOverlapScore                  * 0.15 +
          eduResult.score                    * 0.05
        );
      }

      // Ensure score is bounded between 0 and 100
      finalMatchScore = Math.max(0, Math.min(100, finalMatchScore));


      // 8. Generate dynamic recommendations
      const recommendations: string[] = [];
      if (skillMatchDetail.missingSkills.length > 0) {
        recommendations.push(
          `Consider adding missing skills to improve alignment: ${skillMatchDetail.missingSkills.slice(0, 4).join(', ')}`
        );
      } else if (jobSkills.length > 0) {
        recommendations.push('Excellent! You possess all required technical skills for this role.');
      }

      if (baseline.sectionScores.experienceScore < 40) {
        recommendations.push('Consider elaborating more on your roles, projects, and impact in the experience section.');
      }

      if (eduResult.score < 50) {
        recommendations.push('Highlight any degrees or coursework related to Computer Science, Engineering, or technical fields.');
      }

      return {
        finalMatchScore,
        semanticScore,
        skillsScore: baseline.sectionScores.skillsScore,
        experienceScore: baseline.sectionScores.experienceScore,
        keywordScore: baseline.sectionScores.keywordsScore,
        educationScore: eduResult.score,
        matchedSkills: skillMatchDetail.matchedSkills,
        missingSkills: skillMatchDetail.missingSkills,
        fuzzyMatchedSkills,
        keywordOverlap: baseline.keywordOverlap,
        recommendations,
        scoringVersion: 'v1.0',
        embeddingAvailable,
      };
  },

  /**
   * Run the unified hybrid scoring pipeline for a given application.
   */
  async scoreApplication(
    applicationId: string,
    jobId: string,
    resumeId: string | null,
    applicantId: string,
  ): Promise<HybridScoreResult> {
    const startMs = Date.now();
    console.log(`${LOG_PREFIX} Scoring application ${applicationId} for job ${jobId}...`);

    try {
      const result = await UnifiedMatchService.computeHybridScoreForCandidate(
        applicantId,
        jobId,
        resumeId,
      );

      await pool.query(
        `UPDATE applications 
         SET final_match_score = $1,
             semantic_score = $2,
             skills_score = $3,
             experience_score = $4,
             keyword_score = $5,
             education_score = $6,
             scoring_version = $7,
             scored_at = NOW()
         WHERE id = $8`,
        [
          result.finalMatchScore,
          result.semanticScore,
          result.skillsScore,
          result.experienceScore,
          result.keywordScore,
          result.educationScore,
          result.scoringVersion,
          applicationId,
        ],
      );

      const elapsed = Date.now() - startMs;
      console.log(`${LOG_PREFIX} Scored application ${applicationId}: ${result.finalMatchScore}/100 in ${elapsed}ms`);
      return result;
    } catch (err) {
      console.error(`${LOG_PREFIX} Error scoring application ${applicationId}:`, err);
      return emptyHybridScoreResult();
    }
  },

  /**
   * Non-blocking, fire-and-forget async wrapper for background scoring.
   */
  scoreApplicationAsync(
    applicationId: string,
    jobId: string,
    resumeId: string | null,
    applicantId: string,
  ): void {
    setImmediate(() => {
      UnifiedMatchService.scoreApplication(applicationId, jobId, resumeId, applicantId)
        .then(() => console.log(`${LOG_PREFIX} Async scoring completed for application ${applicationId}`))
        .catch(err => console.error(`${LOG_PREFIX} Async scoring failed for application ${applicationId}:`, err));
    });
  },

  /**
   * Retrieve the persisted score breakdown from DB if it exists.
   */
  async getPersistedScore(applicationId: string): Promise<HybridScoreResult | null> {
    const { rows } = await pool.query(
      `SELECT final_match_score, semantic_score, skills_score, experience_score, 
              keyword_score, education_score, scoring_version, job_id, applicant_id, resume_id
       FROM applications 
       WHERE id = $1`,
      [applicationId]
    );

    if (rows.length === 0 || rows[0].final_match_score === null) {
      return null;
    }

    const row = rows[0];

    // To construct matched/missing skills and other details, we need candidate & job info.
    // We fetch them and compute/extract details cleanly.
    const { rows: jobRows } = await pool.query('SELECT skills, description FROM jobs WHERE id = $1', [row.job_id]);
    const jobSkills = jobRows.length > 0 && Array.isArray(jobRows[0].skills) ? jobRows[0].skills : [];
    const _jobDescription = jobRows.length > 0 ? jobRows[0].description : '';

    let candidateSkills: string[] = [];
    if (row.resume_id) {
      try {
        const resume = await ResumeModel.findByUserAndId(row.applicant_id, row.resume_id);
        if (resume) {
          const buffer = await ResumeService.loadResumeFileBuffer(resume.file_url);
          const parsed = await parseResume(buffer, {
            filename: resume.file_name,
            mimeType: resume.mime_type || undefined,
          });
          candidateSkills = parsed.skills || [];
        }
      } catch {
        // Fallback to profile
      }
    }

    if (candidateSkills.length === 0) {
      const profile = await ApplicantProfileModel.findByUserId(row.applicant_id);
      if (profile) {
        candidateSkills = profile.skills || [];
      }
    }

    const skillMatchDetail = SkillMatchingService.calculateSkillMatch(candidateSkills, jobSkills);
    const fuzzyMatchedSkills: FuzzyMatch[] = (skillMatchDetail as any).fuzzyMatches || [];

    const recommendations: string[] = [];
    if (skillMatchDetail.missingSkills.length > 0) {
      recommendations.push(
        `Consider adding missing skills to improve alignment: ${skillMatchDetail.missingSkills.slice(0, 4).join(', ')}`
      );
    } else if (jobSkills.length > 0) {
      recommendations.push('Excellent! You possess all required technical skills for this role.');
    }

    return {
      finalMatchScore: row.final_match_score,
      semanticScore: row.semantic_score || 0,
      skillsScore: row.skills_score || 0,
      experienceScore: row.experience_score || 0,
      keywordScore: row.keyword_score || 0,
      educationScore: row.education_score || 0,
      matchedSkills: skillMatchDetail.matchedSkills,
      missingSkills: skillMatchDetail.missingSkills,
      fuzzyMatchedSkills,
      keywordOverlap: [],
      recommendations,
      scoringVersion: row.scoring_version || 'v1.0',
      embeddingAvailable: row.semantic_score !== null && row.semantic_score > 0,
    };
  }
};
