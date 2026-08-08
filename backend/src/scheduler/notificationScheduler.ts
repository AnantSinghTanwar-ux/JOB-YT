import cron from 'node-cron';
import { InterviewInviteModel } from '../models/interviewInvite.model';
import { NotificationOrchestrator } from '../services/notification/orchestrator';
import { DigestService } from '../services/digest.service';
import pool from '../config/database';

const LOG_PREFIX = '[NotificationScheduler]';

export function setupNotificationScheduler() {
  console.log(`${LOG_PREFIX} Initializing notification cron jobs...`);

  // 1. Check for 24h interview reminders every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + (23 * 60 + 45) * 60000);
      const windowEnd = new Date(now.getTime() + (24 * 60 + 15) * 60000);

      const upcoming = await InterviewInviteModel.findUpcoming(windowStart, windowEnd);

      for (const invite of upcoming) {
        await NotificationOrchestrator.dispatch(
          invite.applicant_id,
          'interview_reminder_24h',
          {
            title: `Interview Tomorrow: ${invite.job_title}`,
            body: `Reminder: You have an interview scheduled for tomorrow at ${new Date(invite.scheduled_at).toLocaleTimeString()}.`,
            action_url: `/candidate/applications/${invite.application_id}`,
            job_title: invite.job_title,
            userName: invite.applicant_name,
            scheduled_at: invite.scheduled_at,
            location_or_link: invite.location_or_link
          },
          `reminder_24h:${invite.id}`
        );
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error checking 24h reminders:`, error);
    }
  });

  // 2. Check for 2h interview reminders every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + (1 * 60 + 45) * 60000);
      const windowEnd = new Date(now.getTime() + (2 * 60 + 15) * 60000);

      const upcoming = await InterviewInviteModel.findUpcoming(windowStart, windowEnd);

      for (const invite of upcoming) {
        await NotificationOrchestrator.dispatch(
          invite.applicant_id,
          'interview_reminder_2h',
          {
            title: `Interview Soon: ${invite.job_title}`,
            body: `Reminder: Your interview is scheduled to start in 2 hours.`,
            action_url: `/candidate/applications/${invite.application_id}`,
            job_title: invite.job_title,
            userName: invite.applicant_name,
            scheduled_at: invite.scheduled_at,
            location_or_link: invite.location_or_link
          },
          `reminder_2h:${invite.id}`
        );
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error checking 2h reminders:`, error);
    }
  });

  // 3. Application Deadlines alert — Daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      const { rows } = await pool.query(`
        SELECT sj.applicant_id, j.id as job_id, j.title as job_title, j.application_deadline
        FROM saved_jobs sj
        JOIN jobs j ON sj.job_id = j.id
        WHERE j.application_deadline::date = (CURRENT_DATE + INTERVAL '2 days')::date
      `);

      for (const row of rows) {
        await NotificationOrchestrator.dispatch(
          row.applicant_id,
          'deadline_alert',
          {
            title: `Application Deadline Approaching: ${row.job_title}`,
            body: `A job you saved is closing in 48 hours. Apply now!`,
            action_url: `/jobs/${row.job_id}`,
            job_title: row.job_title
          },
          `deadline_48h:${row.applicant_id}:${row.job_id}`
        );
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error checking deadlines:`, error);
    }
  });

  // 4. Recruiter daily digest — 9:00 AM (staggered 1 minute after deadline check)
  cron.schedule('1 9 * * *', async () => {
    try {
      await DigestService.sendDailyDigests();
    } catch (error) {
      console.error(`${LOG_PREFIX} Error sending daily digests:`, error);
    }
  });

  // 5. Auto-apply summary for candidates — 8:55 PM nightly
  cron.schedule('55 20 * * *', async () => {
    try {
      await DigestService.scheduleAutoApplySummaries();
    } catch (error) {
      console.error(`${LOG_PREFIX} Error scheduling auto-apply summaries:`, error);
    }
  });

  // 6. Subscription Expiry reminders — Daily at 10:00 AM
  // Uses the subscriptions table (current_period_end), not users.subscription_expires_at
  cron.schedule('0 10 * * *', async () => {
    try {
      const { rows } = await pool.query(`
        SELECT
          s.user_id,
          COALESCE(ap.name, rp.name, '') as first_name,
          s.current_period_end,
          EXTRACT(DAY FROM s.current_period_end - NOW()) as days_left
        FROM subscriptions s
        LEFT JOIN applicant_profiles ap ON ap.user_id = s.user_id
        LEFT JOIN recruiter_profiles rp ON rp.user_id = s.user_id
        WHERE s.status = 'active'
          AND s.cancel_at_period_end = true
          AND ROUND(EXTRACT(DAY FROM s.current_period_end - NOW())) IN (7, 3, 1)
      `);

      for (const user of rows) {
        const days = Math.round(user.days_left);
        const eventType = `subscription_expiry_${days}d` as 'subscription_expiry_7d' | 'subscription_expiry_3d' | 'subscription_expiry_1d';
        const today = new Date().toISOString().split('T')[0];
        await NotificationOrchestrator.dispatch(
          user.user_id,
          eventType,
          {
            title: `Your subscription expires in ${days} day${days !== 1 ? 's' : ''}`,
            body: `Renew now to keep your premium features active!`,
            action_url: `/settings/billing`,
            userName: user.first_name
          },
          `sub_expiry_${days}d:${user.user_id}:${today}`
        );
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error checking subscriptions:`, error);
    }
  });
}

