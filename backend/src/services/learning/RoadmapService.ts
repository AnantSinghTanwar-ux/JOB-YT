import { LocalLLMRoadmap } from './providers/LocalLLMRoadmap';
import { SkillGapService } from './SkillGapService';
import { CourseRecommendationService } from './CourseRecommendationService';
import { LearningAuditService } from './LearningAuditService';
import prisma from '../../config/prisma';

export class RoadmapService {
  private static provider = new LocalLLMRoadmap();

  /**
   * Generates a full learning roadmap for a candidate for a target role.
   */
  public static async generateRoadmapForCandidate(candidateId: string, targetRole: string, experienceLevel: string = 'Beginner') {
    // 1. Analyze Gaps
    const skillGaps = await SkillGapService.analyzeCandidateGaps(candidateId, targetRole);

    // 2. Get Course Recommendations (and cache them)
    const recommendations = await CourseRecommendationService.recommendAndCacheCourses(skillGaps, experienceLevel, targetRole);

    // 3. Generate Roadmap Sequence
    // Needs existing skills for the prompt
    const existingSkillsRows = await prisma.candidate_skills.findMany({
      where: { candidate_id: candidateId },
      include: { skills: true }
    });
    const existingSkills = existingSkillsRows.map(cs => cs.skills.name);

    const roadmapData = await this.provider.generateRoadmap(targetRole, existingSkills, skillGaps);
    roadmapData.recommendedCourses = recommendations;

    // 4. Store Roadmap in DB
    const roadmap = await prisma.learning_roadmaps.create({
      data: {
        candidate_id: candidateId,
        target_role: targetRole,
        missing_skills: skillGaps as any,
        recommended_courses: recommendations as any,
        learning_sequence: roadmapData.learningSequence,
        estimated_hours: roadmapData.estimatedHours
      }
    });

    await LearningAuditService.logAction({
      candidateId,
      actionType: 'roadmap_generated',
      targetRole,
      roadmapVersion: '1.0',
      reasoning: { 
        gapCount: skillGaps.length, 
        recommendationCount: recommendations.length 
      }
    });

    return roadmap;
  }
}
