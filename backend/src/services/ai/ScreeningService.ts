import pool from '../../config/database';
import { ATSService } from '../ats.service';
import { EmbeddingCacheService } from '../embeddingCache.service';
import { cosineSimilarity, similarityToScore } from '../../utils/embedding';
import { SkillMatchingService } from '../matching/skillMatching.service';
import { ExplanationProvider } from './ExplanationProvider';

const LOG_PREFIX = '[Screening]';

export interface EmployerSettings {
  scoringWeights: {
    experience: number;
    skills: number;
    education: number;
    semantic: number;
    keywords: number;
  };
  recommendedPercentage: number;
  digestEnabled: boolean;
}

export interface ScreeningResult {
  screeningScore: number;
  scoringBreakdown: any;
  explanation: any;
}

export class ScreeningService {
  /**
   * Fetches the employer's dynamic screening settings.
   */
  public static async getEmployerSettings(recruiterId: string): Promise<EmployerSettings> {
    const { rows } = await pool.query(
      'SELECT scoring_weights, recommended_percentage, digest_enabled FROM employer_settings WHERE recruiter_id = $1',
      [recruiterId]
    );

    if (rows.length > 0) {
      return {
        scoringWeights: rows[0].scoring_weights,
        recommendedPercentage: rows[0].recommended_percentage,
        digestEnabled: rows[0].digest_enabled
      };
    }

    // Default weights if none found
    return {
      scoringWeights: {
        experience: 0.22,
        skills: 0.17,
        education: 0.12,
        semantic: 0.20,
        keywords: 0.14
      },
      recommendedPercentage: 10,
      digestEnabled: true
    };
  }

  /**
   * Orchestrates the dynamic screening pipeline.
   */
  public static async screenCandidate(
    jobId: string,
    recruiterId: string,
    candidateData: {
      skills: string[];
      experienceText: string;
      fullText: string;
      education: any[];
    },
    jobData: {
      skills: string[];
      description: string;
    }
  ): Promise<ScreeningResult> {
    const settings = await this.getEmployerSettings(recruiterId);
    
    // 1. Compute Base ATS heuristics (Experience, Education, Keyword Overlap, etc)
    const baseline = ATSService.calculateATSScore(
      candidateData,
      jobData
    );

    // 2. Skill Matching (Specific required vs present skills)
    const skillMatchDetail = SkillMatchingService.calculateSkillMatch(candidateData.skills, jobData.skills);
    const skillsScore = skillMatchDetail.matchPercentage; // 0-100

    // 3. Compute Embeddings & Semantic Similarity
    let semanticScore = 0;
    try {
      let candidateEmbedding = await EmbeddingCacheService.getOrGenerate(candidateData.fullText);
      let jobEmbedding = await EmbeddingCacheService.getJobEmbedding(jobId);
      
      if (!jobEmbedding) {
        jobEmbedding = await EmbeddingCacheService.getOrGenerate(jobData.description);
        if (jobEmbedding) {
          await EmbeddingCacheService.storeJobEmbedding(jobId, jobEmbedding);
        }
      }

      if (candidateEmbedding && jobEmbedding) {
        const similarity = cosineSimilarity(candidateEmbedding, jobEmbedding);
        semanticScore = similarityToScore(similarity);
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} Semantic scoring failed:`, err);
    }

    // 4. Compute Dynamic Final Match Score
    const w = settings.scoringWeights;
    
    // Normalize weights to ensure they sum to 1 in case of user error
    const totalWeight = w.experience + w.skills + w.education + w.semantic + w.keywords;
    const factor = totalWeight > 0 ? 1 / totalWeight : 1;

    let finalScore = 
      (baseline.sectionScores.experienceScore * w.experience * factor) +
      (skillsScore * w.skills * factor) +
      (baseline.sectionScores.educationScore * w.education * factor) +
      (semanticScore * w.semantic * factor) +
      (baseline.sectionScores.keywordsScore * w.keywords * factor);
      
    finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));

    // 5. Generate Explanation using Local LLM
    const explanation = await ExplanationProvider.generateExplanation(
      jobData.description,
      jobData.skills,
      candidateData.fullText,
      candidateData.skills,
      finalScore
    );

    const breakdown = {
      experienceScore: baseline.sectionScores.experienceScore,
      educationScore: baseline.sectionScores.educationScore,
      keywordsScore: baseline.sectionScores.keywordsScore,
      skillsScore,
      semanticScore,
      weightsUsed: w
    };

    return {
      screeningScore: finalScore,
      scoringBreakdown: breakdown,
      explanation
    };
  }
}
