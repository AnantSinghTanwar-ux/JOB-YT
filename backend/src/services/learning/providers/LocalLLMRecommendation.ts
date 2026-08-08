import { RecommendationProvider } from './RecommendationProvider';
import { CourseRecommendation, SkillGapResult, CourseMetadata } from '../types';
import { OllamaProvider } from '../../ai/OllamaProvider';
import { YouTubeProvider } from './YouTubeProvider';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class LocalLLMRecommendation implements RecommendationProvider {
  private youtubeProvider = new YouTubeProvider();

  async recommendCourses(
    skillGaps: SkillGapResult[],
    candidateExperienceLevel: string,
    targetRole: string
  ): Promise<CourseRecommendation[]> {
    if (skillGaps.length === 0) return [];

    const recommendations: CourseRecommendation[] = [];

    // Prioritize critical gaps
    const criticalGaps = skillGaps.filter(g => g.importance === 'Critical');
    const gapsToProcess = criticalGaps.length > 0 ? criticalGaps : skillGaps.slice(0, 3);

    for (const gap of gapsToProcess) {
      // 1. Fetch raw courses from provider
      const courses = await this.youtubeProvider.searchCourses(`${gap.skillName} ${candidateExperienceLevel}`);
      
      if (courses.length === 0) continue;

      // 2. Ask LLM to evaluate and reason about the best course
      const prompt = `
        You are an AI learning coach. The candidate needs to learn "${gap.skillName}" for a "${targetRole}" role.
        Their experience level is "${candidateExperienceLevel}".
        
        Here are the available courses:
        ${JSON.stringify(courses, null, 2)}
        
        Evaluate these courses and select the SINGLE best course.
        Return ONLY a JSON object with this exact structure:
        {
          "selectedExternalId": "string (the externalId of the selected course)",
          "reasoning": "string (Explain why this course is the best fit for their experience and target role)",
          "relevanceScore": number (1-100)
        }
      `;

      try {
        const response = await OllamaProvider.generate(prompt, 'json');
        const parsed = JSON.parse(response);

        const selectedCourse = courses.find(c => c.externalId === parsed.selectedExternalId) || courses[0];

        recommendations.push({
          metadata: selectedCourse,
          reasoning: parsed.reasoning || `Highly relevant for learning ${gap.skillName}`,
          relevanceScore: parsed.relevanceScore || 85
        });
      } catch (error: any) {
        logger.error(`Error generating recommendation reasoning for gap ${gap.skillName}: ${error.message}`);
        // Fallback
        recommendations.push({
          metadata: courses[0],
          reasoning: `Recommended based on basic keyword matching for ${gap.skillName}.`,
          relevanceScore: 70
        });
      }
    }

    return recommendations;
  }
}
