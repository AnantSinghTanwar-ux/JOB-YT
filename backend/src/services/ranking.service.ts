import pool from '../config/database';
import winston from 'winston';
import { ScreeningService } from './ai/ScreeningService';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export const RankingService = {
  /**
   * Recalculates the rank, percentile, and AI recommendation status
   * for all applications within a specific job.
   */
  async updateRankingsForJob(jobId: string, recruiterId: string): Promise<void> {
    try {
      // Get employer settings for recommended percentage (e.g. 10%)
      const settings = await ScreeningService.getEmployerSettings(recruiterId);
      const topPercentage = settings.recommendedPercentage || 10;

      // Fetch all applications for this job that have been scored
      const { rows } = await pool.query(
        `SELECT id, screening_score 
         FROM applications 
         WHERE job_id = $1 AND screening_score IS NOT NULL 
         ORDER BY screening_score DESC, created_at ASC`,
        [jobId]
      );

      if (rows.length === 0) return;

      const totalApplications = rows.length;
      const thresholdIndex = Math.ceil((topPercentage / 100) * totalApplications);

      // Begin transaction to update all applications safely
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (let i = 0; i < totalApplications; i++) {
          const app = rows[i];
          const rank = i + 1;
          const percentile = ((totalApplications - rank) / totalApplications) * 100;
          const aiRecommended = rank <= thresholdIndex;

          await client.query(
            `UPDATE applications 
             SET rank = $1, percentile = $2, ai_recommended = $3
             WHERE id = $4`,
            [rank, percentile, aiRecommended, app.id]
          );
        }

        await client.query('COMMIT');
        logger.info(`Updated rankings for job ${jobId}. Total applications: ${totalApplications}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error(`Error updating rankings for job ${jobId}: ${error.message}`);
    }
  }
};
