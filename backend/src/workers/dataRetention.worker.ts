import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import prisma from '../config/prisma';

export const dataRetentionWorker = new Worker(
  'data-retention-sweep',
  async (job: Job) => {
    console.log('[DataRetentionWorker] Scanning for overdue deletion requests...');
    const now = new Date();

    const pendingRequests = await prisma.data_deletion_requests.findMany({
      where: {
        status: 'pending',
        scheduled_for: { lte: now }
      }
    });

    for (const req of pendingRequests) {
      console.log(`[DataRetentionWorker] Executing right to be forgotten for user ${req.user_id}`);
      
      // Due to referential integrity and ON DELETE CASCADE on Prisma models, 
      // deleting the user should wipe all related PII.
      try {
        await prisma.users.delete({ where: { id: req.user_id } });

        await prisma.data_deletion_requests.update({
          where: { id: req.id },
          data: {
            status: 'completed',
            completed_at: now
          }
        });
      } catch (e) {
        console.error(`[DataRetentionWorker] Failed to delete user ${req.user_id}:`, e);
      }
    }

    // 2. Anonymize old AI logs to comply with minimal data retention policies
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const anonymizedLogs = await prisma.ai_usage_logs.updateMany({
      where: {
        created_at: { lte: ninetyDaysAgo },
        user_id: { not: null }
      },
      data: {
        user_id: null // Anonymize the log, breaking link to user
      }
    });

    console.log(`[DataRetentionWorker] Anonymized ${anonymizedLogs.count} old AI logs.`);

    return { deletedUsers: pendingRequests.length, anonymizedLogs: anonymizedLogs.count };
  },
  { connection: getRedisConnectionForWorker() as any }
);

dataRetentionWorker.on('completed', (job) => {
  console.log(`[DataRetentionWorker] Job ${job.id} completed. Deleted: ${job.returnvalue.deletedUsers}`);
});
dataRetentionWorker.on('failed', (job, err) => {
  console.error(`[DataRetentionWorker] Job ${job?.id} failed:`, err);
});
