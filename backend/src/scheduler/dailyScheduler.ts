import { Worker, Job } from 'bullmq';
import { getRecommendationQueue, getAutoApplyQueue, getSchedulerQueue, getRedisConnectionForWorker } from '../config/queue';
import pool from '../config/database';
import { AutoApplyPreferenceModel } from '../models/autoApplyPreference.model';
import { AutoApplyService } from '../services/autoApply.service';

const LOG_PREFIX = '[DailyScheduler]';

// A generic scheduler queue to manage cron jobs
export const schedulerQueue = getSchedulerQueue();

export const setupDailyScheduler = async () => {
  if (!schedulerQueue) {
    throw new Error('[DailyScheduler] Redis queue is unavailable');
  }

  // Clear any existing repeatable jobs to avoid duplicates on restart
  const repeatableJobs = await schedulerQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await schedulerQueue.removeRepeatableByKey(job.key);
  }

  // Schedule the daily run at 8:00 AM UTC
  await schedulerQueue.add(
    'runDailyRecommendations',
    {},
    {
      repeat: {
        pattern: '0 8 * * *', // Every day at 8:00 AM
      },
    }
  );

  await schedulerQueue.add(
    'runDailyAutoApply',
    {},
    {
      repeat: {
        pattern: '0 9 * * *',
      },
    },
  );

  await schedulerQueue.add(
    'expireAutoApplyApprovals',
    {},
    {
      repeat: {
        pattern: '0 * * * *',
      },
    },
  );

  await schedulerQueue.add(
    'cleanupExpiredVideos',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // Every day at 2:00 AM
      },
    },
  );

  await schedulerQueue.add(
    'sendDailyDigests',
    {},
    {
      repeat: {
        pattern: '0 8 * * *', // Every day at 8:00 AM (same as recommendations)
      },
    },
  );

  console.log(`${LOG_PREFIX} Daily recommendation, Auto-Apply, and Digest schedulers setup complete.`);
};

export const schedulerWorker = new Worker('schedulerQueue', async (job: Job) => {
  if (job.name === 'runDailyRecommendations') {
    console.log(`${LOG_PREFIX} Starting daily recommendations run...`);
    
    // Log the start
    const { rows: logRows } = await pool.query(
      `INSERT INTO scheduler_logs (status) VALUES ('started') RETURNING id`
    );
    const logId = logRows[0].id;

    try {
      // Fetch all applicant users who are verified (or just all applicants)
      // For scalability, in the future this should use a cursor/pagination.
      const { rows: users } = await pool.query(
        `SELECT id FROM users WHERE role = 'applicant'`
      );

      console.log(`${LOG_PREFIX} Found ${users.length} applicant users to process.`);

      // Enqueue them to recommendationQueue
      const jobs = users.map(u => ({
        name: 'generateForUser',
        data: { userId: u.id }
      }));

      // Add in chunks to avoid memory issues if 50k+
      const CHUNK_SIZE = 500;
      for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
        const chunk = jobs.slice(i, i + CHUNK_SIZE);
        const rQueue = getRecommendationQueue();
        if (rQueue) {
          await rQueue.addBulk(chunk);
        }
      }

      await pool.query(
        `UPDATE scheduler_logs SET status = 'completed', users_processed = $1, updated_at = NOW() WHERE id = $2`,
        [users.length, logId]
      );
      console.log(`${LOG_PREFIX} Daily recommendations run completed successfully.`);

    } catch (error: any) {
      console.error(`${LOG_PREFIX} Daily recommendations run failed:`, error);
      await pool.query(
        `UPDATE scheduler_logs SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
        [error.message || 'Unknown error', logId]
      );
    }
  } else if (job.name === 'runDailyAutoApply') {
    console.log(`${LOG_PREFIX} Starting daily auto-apply processing...`);
    try {
      // Find all active auto-apply users
      const { rows: activeUsers } = await pool.query(
        `SELECT user_id FROM auto_apply_preferences WHERE is_active = true`
      );

      console.log(`${LOG_PREFIX} Found ${activeUsers.length} active auto-apply users.`);

      let totalApplied = 0;
      for (const u of activeUsers) {
        try {
          // Pre-scan matching jobs so the queue is fresh
          await AutoApplyService.matchJobsForUser(u.user_id);
          const count = await AutoApplyService.processPendingApplies(u.user_id);
          totalApplied += count;
        } catch (err) {
          console.error(`${LOG_PREFIX} Failed auto-apply for user ${u.user_id}:`, err);
        }
      }
      console.log(`${LOG_PREFIX} Daily auto-apply run completed. Total applications submitted: ${totalApplied}`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Daily auto-apply run failed:`, error);
    }
  }
  if (job.name === 'runDailyAutoApply') {
    console.log(`${LOG_PREFIX} Starting daily Auto-Apply run...`);
    try {
      const userIds = await AutoApplyPreferenceModel.listEnabledUserIds();
      const today = new Date().toISOString().slice(0, 10);
      const matchJobs = userIds.map((userId) => ({
        name: 'matchForUser',
        data: { userId, trigger: 'scheduled' },
      }));
      const digestJobs = userIds.map((userId) => ({
        name: 'sendDigestForUser',
        data: { userId, date: today },
      }));

      const CHUNK_SIZE = 500;
      const aaQueue = getAutoApplyQueue();
      if (aaQueue) {
        for (let i = 0; i < matchJobs.length; i += CHUNK_SIZE) {
          await aaQueue.addBulk(matchJobs.slice(i, i + CHUNK_SIZE));
        }
        for (let i = 0; i < digestJobs.length; i += CHUNK_SIZE) {
          await aaQueue.addBulk(digestJobs.slice(i, i + CHUNK_SIZE));
        }
      }
      console.log(`${LOG_PREFIX} Enqueued Auto-Apply for ${userIds.length} users.`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Daily Auto-Apply run failed:`, error);
      throw error;
    }
  }

  if (job.name === 'expireAutoApplyApprovals') {
    const aaQueue = getAutoApplyQueue();
    if (aaQueue) {
      await aaQueue.add('expirePendingApprovals', {});
    }
  }

  if (job.name === 'sendDailyDigests') {
    console.log(`${LOG_PREFIX} Starting daily digests run...`);
    try {
      const { DigestService } = await import('../services/digest.service');
      await DigestService.sendDailyDigests();
      console.log(`${LOG_PREFIX} Daily digests run completed successfully.`);
    } catch (err) {
      console.error(`${LOG_PREFIX} Daily digests run failed:`, err);
    }
  }

  if (job.name === 'cleanupExpiredVideos') {
    console.log(`${LOG_PREFIX} Starting expired video cleanup...`);
    try {
      const { minioStorage } = await import('../services/storage/MinIOProvider');
      const { rows: expiredConsents } = await pool.query(
        `SELECT candidate_id, video_expiry FROM video_consents WHERE video_expiry < NOW()`
      );
      
      let deletedCount = 0;
      for (const consent of expiredConsents) {
        const { rows: videos } = await pool.query(
          `SELECT id, video_url FROM video_interviews WHERE candidate_id = $1`, [consent.candidate_id]
        );
        for (const video of videos) {
          if (video.video_url) {
            await minioStorage.deleteFile(video.video_url).catch(console.error);
          }
          await pool.query(`DELETE FROM video_interviews WHERE id = $1`, [video.id]);
          deletedCount++;
        }
        await pool.query(`DELETE FROM video_consents WHERE candidate_id = $1`, [consent.candidate_id]);
      }
      console.log(`${LOG_PREFIX} Cleanup completed. Deleted ${deletedCount} expired videos.`);
    } catch (err) {
      console.error(`${LOG_PREFIX} Expired video cleanup failed:`, err);
    }
  }
}, { connection: getRedisConnectionForWorker() as any });

schedulerWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`${LOG_PREFIX} Scheduler job ${job?.id} failed:`, err);
});
