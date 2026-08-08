import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import { RecommendationService } from '../services/recommendation.service';

const LOG_PREFIX = '[RecommendationWorker]';

export const recommendationWorker = new Worker('recommendationQueue', async (job: Job) => {
  if (job.name === 'generateForUser') {
    const { userId } = job.data;
    try {
      await RecommendationService.generateDailyRecommendationsForUser(userId);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error generating recommendations for user ${userId}`, error);
      throw error;
    }
  }
}, { 
  connection: getRedisConnectionForWorker() as any,
  concurrency: 5 // Process 5 users concurrently
});

recommendationWorker.on('completed', job => {
  console.log(`${LOG_PREFIX} Job ${job.id} has completed!`);
});

recommendationWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} has failed with ${err.message}`);
});
