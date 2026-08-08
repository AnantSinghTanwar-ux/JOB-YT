import pool from '../config/database';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export interface AuditRecord {
  applicationId: string;
  resumeId: string | null;
  jobId: string;
  parsedResume: any;
  parsedJd: any;
  embeddingsMetadata: any;
  scoringBreakdown: any;
  screeningScore: number;
  explanation: any;
  promptVersion: string;
  modelVersion: string;
  processingTimeMs: number;
}

export const AuditService = {
  /**
   * Logs a screening event to the database to ensure complete auditability of AI decisions.
   */
  async logScreeningEvent(record: AuditRecord): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO screening_audits (
          application_id, resume_id, job_id, parsed_resume, parsed_jd, 
          embeddings_metadata, scoring_breakdown, screening_score, 
          explanation, prompt_version, model_version, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          record.applicationId,
          record.resumeId,
          record.jobId,
          JSON.stringify(record.parsedResume),
          JSON.stringify(record.parsedJd),
          JSON.stringify(record.embeddingsMetadata),
          JSON.stringify(record.scoringBreakdown),
          record.screeningScore,
          JSON.stringify(record.explanation),
          record.promptVersion,
          record.modelVersion,
          record.processingTimeMs
        ]
      );
      logger.info(`Audit logged for application ${record.applicationId}`);
    } catch (error: any) {
      logger.error(`Failed to log audit event for application ${record.applicationId}: ${error.message}`);
    }
  }
};
