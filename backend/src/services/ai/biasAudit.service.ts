import prisma from '../../config/prisma';

export interface BiasAuditRecord {
  applicationId?: string;
  module: string;
  originalDecision: any;
  biasFlags?: string[];
}

export const BiasAuditService = {
  /**
   * Logs an AI decision for future bias auditing.
   */
  async logDecision(record: BiasAuditRecord): Promise<string | null> {
    try {
      const audit = await prisma.ai_bias_audits.create({
        data: {
          application_id: record.applicationId || null,
          module: record.module,
          original_decision: record.originalDecision,
          bias_flags: record.biasFlags || [],
          is_overridden: false,
        },
      });
      return audit.id;
    } catch (e) {
      console.error('[BiasAuditService] Failed to log decision:', e);
      return null;
    }
  },

  /**
   * Called when a human recruiter overrides an AI decision.
   */
  async overrideDecision(auditId: string, reviewerId: string, overrideDecision: any, reason: string): Promise<void> {
    try {
      await prisma.ai_bias_audits.update({
        where: { id: auditId },
        data: {
          is_overridden: true,
          reviewer_id: reviewerId,
          override_decision: overrideDecision,
          override_reason: reason,
          updated_at: new Date()
        }
      });
    } catch (e) {
      console.error('[BiasAuditService] Failed to log override:', e);
    }
  },

  /**
   * Scan for implicit bias patterns in recent decisions
   */
  async scanForBiasPatterns(): Promise<any> {
    // Basic heuristics: if overridden > 20% for a specific demographic, flag it
    // For MVP, just returning counts
    const total = await prisma.ai_bias_audits.count();
    const overridden = await prisma.ai_bias_audits.count({ where: { is_overridden: true } });

    return {
      totalDecisions: total,
      totalOverrides: overridden,
      overrideRate: total > 0 ? (overridden / total) * 100 : 0
    };
  }
};
