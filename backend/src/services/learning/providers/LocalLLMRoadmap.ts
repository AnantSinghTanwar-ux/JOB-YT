import { RoadmapProvider } from './RoadmapProvider';
import { RoadmapResult, SkillGapResult } from '../types';
import { OllamaProvider } from '../../ai/OllamaProvider';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class LocalLLMRoadmap implements RoadmapProvider {
  async generateRoadmap(
    targetRole: string,
    existingSkills: string[],
    skillGaps: SkillGapResult[]
  ): Promise<RoadmapResult> {
    const prompt = `
    You are a principal software architect and career coach.
    Create a highly optimized learning roadmap for a candidate transitioning to a "${targetRole}" role.
    
    Existing Skills: [${existingSkills.join(', ')}]
    Identified Skill Gaps: ${JSON.stringify(skillGaps.map(g => g.skillName))}

    Generate a structured JSON response EXACTLY matching this format (no markdown code blocks, just raw JSON):
    {
      "learningSequence": ["Skill A", "Skill B", "Skill C"], // Logical step-by-step order to learn the missing skills
      "estimatedHours": number // Total estimated hours to complete the roadmap
    }
    `;

    try {
      const response = await OllamaProvider.generate(prompt, 'json');
      const parsed = JSON.parse(response);

      return {
        targetRole,
        missingSkills: skillGaps,
        recommendedCourses: [], // This will be populated by the RecommendationProvider in the orchestration layer
        learningSequence: parsed.learningSequence || skillGaps.map(g => g.skillName),
        estimatedHours: parsed.estimatedHours || 40
      };
    } catch (error: any) {
      logger.error(`Error generating roadmap: ${error.message}`);
      return {
        targetRole,
        missingSkills: skillGaps,
        recommendedCourses: [],
        learningSequence: skillGaps.map(g => g.skillName),
        estimatedHours: 40
      };
    }
  }
}
