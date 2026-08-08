import { LocalLLMGapAnalysis } from './providers/LocalLLMGapAnalysis';
import { SkillGapResult } from './types';
import { LearningAuditService } from './LearningAuditService';
import prisma from '../../config/prisma';

export class SkillGapService {
  private static provider = new LocalLLMGapAnalysis();

  /**
   * Fetches the candidate's existing skills from the DB.
   */
  private static async getExistingSkills(candidateId: string): Promise<string[]> {
    const candidateSkills = await prisma.candidate_skills.findMany({
      where: { candidate_id: candidateId },
      include: { skills: true }
    });

    if (candidateSkills.length > 0) {
      return candidateSkills.map(cs => cs.skills.name);
    }

    // Fallback to applicant_profiles if candidate_skills is empty
    const profile = await prisma.applicant_profiles.findUnique({
      where: { user_id: candidateId }
    });

    return profile?.skills || [];
  }

  /**
   * Analyzes skill gaps for a candidate against a target role.
   */
  public static async analyzeCandidateGaps(candidateId: string, targetRole: string): Promise<SkillGapResult[]> {
    const existingSkills = await this.getExistingSkills(candidateId);
    
    // Perform AI analysis
    const gaps = await this.provider.analyzeGaps(existingSkills, targetRole);

    // Audit log the reasoning
    await LearningAuditService.logAction({
      candidateId,
      actionType: 'gap_analysis',
      targetRole,
      skillGaps: gaps,
      reasoning: { inputSkills: existingSkills, provider: 'LocalLLMGapAnalysis' }
    });

    return gaps;
  }
}
