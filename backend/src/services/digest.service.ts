import pool from '../config/database';
import winston from 'winston';
import { NotificationOrchestrator } from './notification/orchestrator';
import { getAutoApplyQueue } from '../config/queue';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export const DigestService = {
  /**
   * Aggregates daily applications and sends a digest to recruiters who have digest enabled.
   */
  async sendDailyDigests(): Promise<void> {
    try {
      // 1. Fetch all recruiters who have digest_enabled
      const { rows: employers } = await pool.query(
        `SELECT recruiter_id FROM employer_settings WHERE digest_enabled = true`
      );

      for (const employer of employers) {
        // 2. Fetch jobs for this recruiter
        const { rows: jobs } = await pool.query(
          `SELECT id, title FROM jobs WHERE recruiter_id = $1`,
          [employer.recruiter_id]
        );

        if (jobs.length === 0) continue;

        let totalNewApps = 0;
        let topRecommendations = 0;
        const jobLines: string[] = [];

        // 3. For each job, count applications in the last 24 hours
        for (const job of jobs) {
          const { rows: stats } = await pool.query(
            `SELECT count(*) as count,
                    sum(case when ai_recommended = true then 1 else 0 end) as recommended
             FROM applications
             WHERE job_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
            [job.id]
          );

          const count = parseInt(stats[0].count) || 0;
          const recommended = parseInt(stats[0].recommended) || 0;

          if (count > 0) {
            totalNewApps += count;
            topRecommendations += recommended;
            jobLines.push(`${job.title}: ${count} new (${recommended} recommended)`);
          }
        }

        if (totalNewApps > 0) {
          const today = new Date().toISOString().split('T')[0];
          await NotificationOrchestrator.dispatch(
            employer.recruiter_id,
            'employer_broadcast', // reuse broadcast type for system digests
            {
              title: 'Daily Screening Digest',
              body: `${totalNewApps} new applicants today across ${jobLines.length} job(s). ${topRecommendations} highly recommended. ${jobLines.slice(0, 3).join(' | ')}`,
              action_url: '/recruiter/dashboard',
              is_recruiter: true,
            },
            `daily_digest:${employer.recruiter_id}:${today}`
          );

          logger.info(`Sent digest to recruiter ${employer.recruiter_id} with ${totalNewApps} apps.`);
        }
      }
    } catch (error: any) {
      logger.error(`Failed to send daily digests: ${error.message}`);
    }
  },

  /**
   * Schedules auto-apply summary notifications for all users who have auto-apply items today.
   * Called nightly by the scheduler.
   */
  async scheduleAutoApplySummaries(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch distinct users who had auto-apply activity today
      const { rows } = await pool.query(
        `SELECT DISTINCT user_id FROM auto_apply_queue_items WHERE created_at::date = $1::date`,
        [today]
      );

      for (const row of rows) {
        const aaQueue = getAutoApplyQueue();
        if (aaQueue) {
          await aaQueue.add(
            'sendDigestForUser',
            { userId: row.user_id, date: today },
            { jobId: `auto_apply_digest_${row.user_id}_${today}` }
          );
        }
      }

      logger.info(`Scheduled auto-apply summaries for ${rows.length} users on ${today}.`);
    } catch (error: any) {
      logger.error(`Failed to schedule auto-apply summaries: ${error.message}`);
    }
  }
};
