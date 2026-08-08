import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import { NotificationOrchestrator } from '../services/notification/orchestrator';
import pool from '../config/database';

const LOG_PREFIX = '[BroadcastWorker]';

const ACTIVE_STATUSES = ['applied', 'in_review', 'shortlisted', 'interview', 'offer'];

export const broadcastWorker = new Worker(
  'broadcastQueue',
  async (job: Job) => {
    const { jobId, recruiterId, messageBody, channels, broadcastId } = job.data;
    console.log(`${LOG_PREFIX} Processing broadcast ${broadcastId} for job ${jobId}`);

    try {
      // Fetch active applicants for this job
      const { rows: applicants } = await pool.query(
        `SELECT applicant_id FROM applications 
         WHERE job_id = $1 AND status = ANY($2::application_status[])`,
        [jobId, ACTIVE_STATUSES]
      );

      console.log(`${LOG_PREFIX} Found ${applicants.length} active applicants to broadcast to`);

      // We will loop through the applicants and dispatch via the Orchestrator.
      // We pass the channels requested by the recruiter via the payload,
      // and the orchestrator handles checking user preferences.
      for (const applicant of applicants) {
        await NotificationOrchestrator.dispatch(
          applicant.applicant_id,
          'employer_broadcast',
          {
            title: 'New Broadcast from Employer',
            body: messageBody,
            type: 'employer_broadcast',
            user_id: applicant.applicant_id,
            job_id: jobId,
            action_url: `/jobs/${jobId}`,
            allowedChannels: channels,
          },
          `broadcast:${broadcastId}:${applicant.applicant_id}` // Idempotency key
        );
      }

      console.log(`${LOG_PREFIX} Completed broadcast ${broadcastId}`);
    } catch (err) {
      console.error(`${LOG_PREFIX} Error processing broadcast ${broadcastId}:`, err);
      throw err;
    }
  },
  {
    connection: getRedisConnectionForWorker() as any,
    concurrency: 2 // Can be adjusted
  }
);

broadcastWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} failed:`, err.message);
});
