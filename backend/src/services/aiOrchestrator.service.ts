import { ATSService } from './ats.service';
import { AiParserService } from './aiParser.service';
import { PromptTemplatesService } from './promptTemplates.service';
import { AIService } from './ai.service';
import { aiConfig } from '../config/ai.config';
import { AppError } from '../utils/appError';
import { BiasAuditService } from './ai/biasAudit.service';

export interface AIOrchestratorRequest {
  type: 'ats_analysis' | 'resume_processing' | 'matching_workflow' | 'job_ingestion';
  data: Record<string, any>;
}

export interface AIOrchestratorResponse {
  success: boolean;
  result: any;
  metadata?: {
    service: string;
    processingTime: number;
    timestamp: Date;
  };
}

export type AITaskHandler = (data: Record<string, any>) => Promise<any>;

interface AtsScoringPromptResult {
  keywordDensity?: Record<string, number>;
  explanation?: string;
  feedback?: { missingSections: string[]; weakAreas: string[]; improvements: string[] };
  qualityScore?: number;
  rolePrediction?: string;
  experience?: string;
}

interface SkillGapAnalysisResult {
  matchedSkills: string[];
  missingSkills: string[];
  skillGapPercentage: number;
  recommendations: string[];
  prioritySkills: string[];
}

/**
 * AI Orchestrator Service
 *
 * Central orchestration layer for AI-related tasks:
 * - ATS analysis
 * - Resume processing
 * - Candidate/job matching workflows
 *
 * Routes requests to appropriate AI services and manages prompt templates.
 */
export const AIOrchestratorService = {
  async processRequest(request: AIOrchestratorRequest): Promise<AIOrchestratorResponse> {
    const startTime = Date.now();

    if (!this.validateRequest(request)) {
      throw new AppError('Invalid AI request structure', 400);
    }

    const handler = this.getHandler(request.type);
    if (!handler) {
      throw new AppError(`Unsupported AI request type: ${request.type}`, 400);
    }

    try {
      const result = await handler.call(this, request.data);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        result,
        metadata: {
          service: request.type,
          processingTime,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      console.error('[AIOrchestrator] Processing error:', error);
      throw error;
    }
  },

  getHandler(type: AIOrchestratorRequest['type']): AITaskHandler | null {
    switch (type) {
      case 'ats_analysis':
        return this.handleATSAnalysis.bind(this);
      case 'resume_processing':
        return this.handleResumeProcessing.bind(this);
      case 'matching_workflow':
        return this.handleMatchingWorkflow.bind(this);
      case 'job_ingestion':
        return this.handleJobIngestion.bind(this);
      default:
        return null;
    }
  },

  async handleATSAnalysis(data: any) {
    const { resumeData, jobData } = data;

    if (!resumeData || !jobData) {
      throw new AppError('ATS analysis requires resumeData and jobData', 400);
    }

    const scoreResult = await ATSService.calculateATSScoreWithEmbedding(resumeData, jobData);
    const llmInsights = await this.generateAtsInsights(
      resumeData.fullText || resumeData.experienceText || '',
      jobData.description || '',
    );

    const finalResult = {
      ...scoreResult,
      llmInsights,
    };

    // Log decision for Bias Auditing
    BiasAuditService.logDecision({
      module: 'ats',
      originalDecision: finalResult,
      biasFlags: []
    }).catch(() => {});

    return finalResult;
  },

  async handleResumeProcessing(data: any) {
    const { rawText } = data;

    if (!rawText) {
      throw new AppError('Resume processing requires rawText', 400);
    }

    return AiParserService.parseJobText(rawText);
  },

  async handleJobIngestion(data: any) {
    const { rawText } = data;

    if (!rawText) {
      throw new AppError('Job ingestion requires rawText', 400);
    }

    return AiParserService.parseJobText(rawText);
  },

  async handleMatchingWorkflow(data: any) {
    const { userSkills, jobSkills, resumeText, jobDescription } = data;

    if (!Array.isArray(userSkills) || !Array.isArray(jobSkills)) {
      throw new AppError('Matching workflow requires userSkills and jobSkills', 400);
    }

    const skillMatch = this.calculateSkillMatch(userSkills, jobSkills);
    const skillGapAnalysis = await this.generateSkillGapAnalysis(userSkills, jobSkills);

    let atsScore = null;
    if (resumeText && jobDescription) {
      atsScore = await ATSService.calculateATSScoreWithEmbedding(
        {
          skills: userSkills,
          experienceText: resumeText,
          fullText: resumeText,
        },
        {
          skills: jobSkills,
          description: jobDescription,
        },
      );
    }

    return {
      skillMatch,
      skillGapAnalysis,
      atsScore,
      recommendations: this.generateMatchingRecommendations(skillMatch, atsScore, skillGapAnalysis),
    };
  },

  async generateAtsInsights(resumeText: string, jobDescription: string): Promise<AtsScoringPromptResult | null> {
    if (!aiConfig.isConfigured || !resumeText || !jobDescription) {
      return null;
    }

    try {
      const prompt = await PromptTemplatesService.renderTemplate('ats_scoring', {
        resumeText: resumeText.slice(0, 3000),
        jobDescription: jobDescription.slice(0, 1500),
      });

      const parsed = await AIService.generateJSON<AtsScoringPromptResult>(prompt, { module: 'ats' });
      return parsed ?? null;
    } catch (error) {
      console.warn('[AIOrchestrator] ATS enrichment failed:', error);
      return null;
    }
  },

  async generateSkillGapAnalysis(userSkills: string[], jobSkills: string[]): Promise<SkillGapAnalysisResult> {
    if (aiConfig.isConfigured) {
      try {
        const prompt = await PromptTemplatesService.renderTemplate('skill_gap_analysis', {
          userSkills: userSkills.join(', '),
          requiredSkills: jobSkills.join(', '),
        });
        const parsed = await AIService.generateJSON<SkillGapAnalysisResult>(prompt, { module: 'ats' });
        if (parsed && Array.isArray(parsed.matchedSkills)) {
          return parsed;
        }
      } catch (error) {
        console.warn('[AIOrchestrator] Skill gap analysis AI fallback:', error);
      }
    }

    const matchedSkills = jobSkills.filter(jobSkill =>
      userSkills.some(userSkill =>
        userSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(userSkill.toLowerCase()),
      ),
    );

    const missingSkills = jobSkills.filter(skill => !matchedSkills.includes(skill));
    const skillGapPercentage = jobSkills.length === 0 ? 0 : Math.round((missingSkills.length / jobSkills.length) * 100);

    return {
      matchedSkills,
      missingSkills,
      skillGapPercentage,
      recommendations: missingSkills.length
        ? [`Focus on learning: ${missingSkills.slice(0, 5).join(', ')}`]
        : ['Your skills align well with the role requirements.'],
      prioritySkills: missingSkills.slice(0, 5),
    };
  },

  calculateSkillMatch(userSkills: string[], jobSkills: string[]): number {
    if (!jobSkills.length) return 0;

    const matchedSkills = jobSkills.filter(jobSkill =>
      userSkills.some(userSkill =>
        userSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(userSkill.toLowerCase()),
      ),
    );

    return Math.round((matchedSkills.length / jobSkills.length) * 100);
  },

  generateMatchingRecommendations(
    skillMatch: number,
    atsScore: any,
    skillGapAnalysis: SkillGapAnalysisResult,
  ) {
    const recommendations: string[] = [];

    if (skillMatch < 50) {
      recommendations.push('Consider upskilling in required technologies.');
    }

    if (atsScore && atsScore.totalScore < 60) {
      recommendations.push('Review and optimize resume content.');
      recommendations.push('Highlight relevant experience more prominently.');
    }

    if (skillMatch >= 80 && (!atsScore || atsScore.totalScore >= 70)) {
      recommendations.push('Strong match - consider applying.');
    }

    if (skillGapAnalysis.missingSkills.length > 0) {
      recommendations.push(
        `Skill gap detected: ${skillGapAnalysis.missingSkills.slice(0, 5).join(', ')}.`,
      );
    }

    return recommendations.length > 0 ? recommendations : ['No specific recommendations available.'];
  },

  getAvailableTaskTypes(): AIOrchestratorRequest['type'][] {
    return ['ats_analysis', 'resume_processing', 'matching_workflow', 'job_ingestion'];
  },

  validateRequest(request: AIOrchestratorRequest): boolean {
    if (!request.type || !this.getAvailableTaskTypes().includes(request.type)) {
      return false;
    }

    if (!request.data || typeof request.data !== 'object') {
      return false;
    }

    return true;
  },
};
