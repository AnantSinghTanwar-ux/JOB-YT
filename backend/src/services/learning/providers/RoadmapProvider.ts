import { RoadmapResult, SkillGapResult } from '../types';

export interface RoadmapProvider {
  /**
   * Generate a comprehensive learning roadmap for a candidate aiming for a target role.
   */
  generateRoadmap(
    targetRole: string,
    existingSkills: string[],
    skillGaps: SkillGapResult[]
  ): Promise<RoadmapResult>;
}
