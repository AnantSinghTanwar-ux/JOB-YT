import { SkillGapResult } from '../types';

export interface SkillGapProvider {
  /**
   * Analyze the candidate's existing skills against a target Job Description
   * or a Target Role, returning the missing skills.
   */
  analyzeGaps(
    existingSkills: string[],
    targetRoleOrJdText: string
  ): Promise<SkillGapResult[]>;
}
