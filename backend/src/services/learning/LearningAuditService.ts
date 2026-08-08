import prisma from '../../config/prisma';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class LearningAuditService {
  /**
   * Logs an action in the learning engine.
   */
  public static async logAction(params: {
    candidateId: string;
    actionType: string;
    targetRole?: string;
    skillGaps?: any;
    recommendedCourses?: any;
    roadmapVersion?: string;
    creditsAwarded?: number;
    progressUpdates?: any;
    verificationChanges?: any;
    reasoning?: any;
  }) {
    try {
      await prisma.learning_audit_logs.create({
        data: {
          candidate_id: params.candidateId,
          action_type: params.actionType,
          target_role: params.targetRole,
          skill_gaps: params.skillGaps || {},
          recommended_courses: params.recommendedCourses || {},
          roadmap_version: params.roadmapVersion,
          credits_awarded: params.creditsAwarded,
          progress_updates: params.progressUpdates || {},
          verification_changes: params.verificationChanges || {},
          reasoning: params.reasoning || {},
        }
      });
    } catch (error: any) {
      // Don't throw, just log. Audit failure shouldn't break the main flow.
      logger.error(`Failed to write to learning audit log: ${error.message}`);
    }
  }
}
