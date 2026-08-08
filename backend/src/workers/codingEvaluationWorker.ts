import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import { CodingSubmissionService } from '../services/codingSubmission.service';
import { CodeEvaluationService } from '../services/codeEvaluation.service';

const LOG_PREFIX = '[CodingEvaluationWorker]';

export const codingEvaluationWorker = new Worker(
  'codingEvaluationQueue',
  async (job: Job) => {
    if (job.name === 'evaluateSubmission') {
      const { submissionId, passingScore } = job.data as { submissionId: string; passingScore: number };
      try {
        await CodingSubmissionService.evaluateSubmission(submissionId, passingScore ?? 70);
        await CodeEvaluationService.evaluate(submissionId);
      } catch (error) {
        console.error(`${LOG_PREFIX} Error evaluating submission ${submissionId}`, error);
        throw error;
      }
    }
  },
  {
    connection: getRedisConnectionForWorker() as any,
    concurrency: 3,
  },
);


codingEvaluationWorker.on('completed', (job) => {
  console.log(`${LOG_PREFIX} Job ${job.id} completed`);
});

codingEvaluationWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} failed: ${err.message}`);
});
