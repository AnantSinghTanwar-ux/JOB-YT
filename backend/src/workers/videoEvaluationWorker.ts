import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import { evaluationProvider } from '../services/ai/EvaluationProvider';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LOG_PREFIX = '[VideoEvaluationWorker]';

export const videoEvaluationWorker = new Worker(
  'videoEvaluationQueue',
  async (job: Job) => {
    if (job.name === 'evaluateVideo') {
      const { videoInterviewId } = job.data as { videoInterviewId: string };
      console.log(`${LOG_PREFIX} Processing evaluation for video ${videoInterviewId}`);

      try {
        const videoRecord = await (prisma as any).video_interviews.findUnique({
          where: { id: videoInterviewId },
          include: { jobs: true } // Need job context
        });

        if (!videoRecord) {
          throw new Error(`Video record ${videoInterviewId} not found`);
        }

        if (!videoRecord.transcript) {
          throw new Error(`Transcript not found for video ${videoInterviewId}`);
        }

        // Update status to EVALUATING
        await (prisma as any).video_interviews.update({
          where: { id: videoInterviewId },
          data: { status: 'EVALUATING', updated_at: new Date() }
        });

        // Evaluate
        const jobContext = videoRecord.jobs ? {
          title: videoRecord.jobs.title,
          description: videoRecord.jobs.description,
          skills: videoRecord.jobs.skills,
        } : {};

        const result = await evaluationProvider.evaluateInterview(videoRecord.transcript, jobContext);

        // Update DB
        await (prisma as any).video_interviews.update({
          where: { id: videoInterviewId },
          data: {
            status: 'COMPLETED',
            evaluation_scores: result as any,
            updated_at: new Date()
          }
        });

        console.log(`${LOG_PREFIX} Evaluation completed for ${videoInterviewId}`);
      } catch (error) {
        console.error(`${LOG_PREFIX} Error evaluating video ${videoInterviewId}:`, error);
        
        await (prisma as any).video_interviews.update({
          where: { id: videoInterviewId },
          data: { status: 'FAILED', updated_at: new Date() }
        });

        throw error;
      }
    }
  },
  {
    connection: getRedisConnectionForWorker() as any,
    concurrency: 2,
  }
);

videoEvaluationWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} failed: ${err.message}`);
});
