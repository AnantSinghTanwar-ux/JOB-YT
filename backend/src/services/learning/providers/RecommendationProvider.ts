import { CourseRecommendation, SkillGapResult } from '../types';

export interface RecommendationProvider {
  /**
   * Recommend courses based on the candidate's skill gaps and existing profile.
   */
  recommendCourses(
    skillGaps: SkillGapResult[],
    candidateExperienceLevel: string,
    targetRole: string
  ): Promise<CourseRecommendation[]>;
}
