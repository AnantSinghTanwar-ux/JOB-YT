import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import { InterviewModel } from '../models/interview.model';
import { ApplicationModel } from '../models/application.model';
import { PipelineEventModel } from '../models/pipeline_event.model';
import { NotificationModel } from '../models/notification.model';
import { JobModel } from '../models/job.model';

const LOG_PREFIX = '[BulkInterviewWorker]';

export const bulkInterviewWorker = new Worker(
  'bulkInterviewQueue',
  async (job: Job) => {
    if (job.name === 'dispatchInterviews') {
      const { applicationIds, interviewerId, scheduledAt } = job.data;
      console.log(`${LOG_PREFIX} Processing bulk interview dispatch for ${applicationIds.length} candidates`);

      for (const appId of applicationIds) {
        try {
          // 1. Fetch application details
          const application = await ApplicationModel.findById(appId);
          if (!application) {
            console.warn(`${LOG_PREFIX} Application ${appId} not found, skipping.`);
            continue;
          }

          // 2. Fetch job details
          const jobDetails = await JobModel.findById(application.job_id);
          if (!jobDetails) {
            console.warn(`${LOG_PREFIX} Job not found for application ${appId}, skipping.`);
            continue;
          }

          // 3. Check if interview is already scheduled to prevent duplicates
          const existingInterviews = await InterviewModel.getByApplicationId(appId);
          if (existingInterviews && existingInterviews.length > 0) {
            console.log(`${LOG_PREFIX} Interview already exists for application ${appId}, skipping.`);
            continue;
          }

          // 4. Create interview record
          await InterviewModel.createInterview({
            application_id: appId,
            interviewer_id: interviewerId,
            candidate_id: application.applicant_id,
            scheduled_at: new Date(scheduledAt || new Date()),
          });

          // 5. Update application status
          await ApplicationModel.updateStatus(appId, 'interview');

          // 6. Create pipeline event
          await PipelineEventModel.create({
            application_id: appId,
            previous_status: application.status || 'applied',
            new_status: 'interview',
            changed_by_id: interviewerId,
          });

          // 7. Notify candidate
          await NotificationModel.create({
            user_id: application.applicant_id,
            type: 'application_status',
            title: 'AI Interview Invitation',
            body: `You have been invited to a live AI interview for "${jobDetails.title}".`,
            action_url: `/applications`,
          });

        } catch (err: any) {
          console.error(`${LOG_PREFIX} Failed to process application ${appId}:`, err.message);
        }
      }
    }
  },
  { connection: getRedisConnectionForWorker() as any}
);

bulkInterviewWorker.on('completed', (job) => {
  console.log(`${LOG_PREFIX} Bulk interview dispatch job ${job.id} completed!`);
});

bulkInterviewWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Bulk interview dispatch job ${job?.id} failed:`, err);
});
