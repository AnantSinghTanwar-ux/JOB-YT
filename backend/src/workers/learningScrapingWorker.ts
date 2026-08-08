import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import { CourseRecommendationService } from '../services/learning/CourseRecommendationService';
import { SkillGapResult } from '../services/learning/types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export const SCRAPING_QUEUE_NAME = 'learning-course-scraping-queue';

export interface ScrapeCoursePayload {
  candidateId: string;
  skillGaps: SkillGapResult[];
  targetRole: string;
  experienceLevel: string;
}

export const learningScrapingWorker = new Worker<ScrapeCoursePayload>(
  SCRAPING_QUEUE_NAME,
  async (job: Job<ScrapeCoursePayload>) => {
    logger.info(`Processing course scraping job ${job.id} for candidate ${job.data.candidateId}`);
    
    try {
      const recommendations = await CourseRecommendationService.recommendAndCacheCourses(
        job.data.skillGaps,
        job.data.experienceLevel,
        job.data.targetRole
      );
      
      logger.info(`Successfully scraped and cached ${recommendations.length} courses for candidate ${job.data.candidateId}`);
      return recommendations;
    } catch (error: any) {
      logger.error(`Failed to scrape courses for candidate ${job.data.candidateId}: ${error.message}`);
      throw error;
    }
  },
  {
    connection: getRedisConnectionForWorker() as any,
    concurrency: 5,
  }
);

learningScrapingWorker.on('completed', (job) => {
  logger.info(`Scraping worker completed job ${job.id}`);
});

learningScrapingWorker.on('failed', (job, err) => {
  logger.error(`Scraping worker failed job ${job?.id}: ${err.message}`);
});
