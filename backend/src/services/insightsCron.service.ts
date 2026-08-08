/**
 * Insights Auto-Approve Cron
 *
 * Runs every hour. Finds applications where:
 *   - insights_approved = FALSE
 *   - insights_generated_at IS NOT NULL
 *   - insights_generated_at < NOW() - INTERVAL '7 days'
 *
 * And bulk-approves them so applicants can eventually see their insights
 * even if the recruiter never manually approves.
 *
 * Also handles the "setImmediate failed" case: if insights_generated_at IS NULL
 * after 7 days, the cron won't flip those — those will show "unavailable" in the drawer.
 */

import pool from '../config/database';

const LOG_PREFIX = '[InsightsCron]';

export const InsightsCronService = {
  async autoApproveStale(): Promise<void> {
    try {
      const { rowCount } = await pool.query(
        `UPDATE applications
         SET insights_approved = TRUE,
             insights_approved_at = NOW()
         WHERE insights_approved = FALSE
           AND insights_generated_at IS NOT NULL
           AND insights_generated_at < NOW() - INTERVAL '7 days'`,
      );
      if ((rowCount ?? 0) > 0) {
        console.log(`${LOG_PREFIX} Auto-approved ${rowCount} stale insights records.`);
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Auto-approve cron failed:`, err);
    }
  },

  /** Call this once at server startup to schedule hourly auto-approve */
  startScheduler(): void {
    const ONE_HOUR = 60 * 60 * 1000;
    // Run immediately on boot, then every hour
    void this.autoApproveStale();
    setInterval(() => void this.autoApproveStale(), ONE_HOUR);
    console.log(`${LOG_PREFIX} Scheduler started (runs every hour).`);
  },
};
