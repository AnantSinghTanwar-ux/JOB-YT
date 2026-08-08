import { LocalLLMRecommendation } from './providers/LocalLLMRecommendation';
import { CourseRecommendation, SkillGapResult } from './types';
import prisma from '../../config/prisma';

export class CourseRecommendationService {
  private static provider = new LocalLLMRecommendation();

  /**
   * Recommends courses for a candidate based on their skill gaps.
   * Upserts the courses into the database to act as a cache.
   */
  public static async recommendAndCacheCourses(
    skillGaps: SkillGapResult[],
    candidateExperienceLevel: string,
    targetRole: string
  ): Promise<CourseRecommendation[]> {
    const recommendations = await this.provider.recommendCourses(skillGaps, candidateExperienceLevel, targetRole);

    // Upsert courses to local DB to avoid re-scraping
    for (const rec of recommendations) {
      const courseRecord = await prisma.courses.upsert({
        where: {
          provider_external_id: {
            provider: rec.metadata.provider,
            external_id: rec.metadata.externalId
          }
        },
        create: {
          provider: rec.metadata.provider,
          external_id: rec.metadata.externalId,
          title: rec.metadata.title,
          url: rec.metadata.url,
          thumbnail_url: rec.metadata.thumbnailUrl,
          instructor: rec.metadata.instructor,
          duration_mins: rec.metadata.durationMins,
          rating: rec.metadata.rating,
          review_count: rec.metadata.reviewCount,
          price_amount: rec.metadata.priceAmount,
          price_currency: rec.metadata.priceCurrency,
          skill_tags: rec.metadata.skillTags,
          difficulty: rec.metadata.difficulty,
          language: rec.metadata.language,
          last_updated: rec.metadata.lastUpdated,
          cache_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Cache for 7 days
        },
        update: {
          // If it exists, we could just update the cache_expiry and rating
          rating: rec.metadata.rating,
          review_count: rec.metadata.reviewCount,
          scraped_at: new Date(),
          cache_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      
      rec.courseId = courseRecord.id;
    }

    return recommendations;
  }
}
