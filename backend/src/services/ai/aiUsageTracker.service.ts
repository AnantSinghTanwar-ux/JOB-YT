import prisma from '../../config/prisma';

export interface AIUsageRecord {
  userId?: string;
  module: string;
  modelName: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  isCacheHit: boolean;
}

export const AIUsageTracker = {
  async logUsage(record: AIUsageRecord): Promise<void> {
    try {
      // Estimate tokens if not provided (roughly 4 chars per token)
      // This is a naive estimation used if the API provider doesn't return usage stats
      const promptT = record.promptTokens ?? 0;
      const compT = record.completionTokens ?? 0;

      await prisma.ai_usage_logs.create({
        data: {
          user_id: record.userId || null,
          module: record.module,
          model_name: record.modelName,
          prompt_tokens: promptT,
          completion_tokens: compT,
          latency_ms: record.latencyMs,
          is_cache_hit: record.isCacheHit,
        },
      });

      // Budget Alert Check
      // Simple daily threshold trigger
      if (record.userId) {
        await this.checkBudgetThreshold(record.userId);
      }
    } catch (e) {
      console.warn('[AIUsageTracker] Failed to log usage:', e);
    }
  },

  async checkBudgetThreshold(userId: string) {
    // Configurable thresholds can be stored in DB, hardcoded for MVP
    const DAILY_LIMIT = 50000; 

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await prisma.ai_usage_logs.aggregate({
      where: {
        user_id: userId,
        created_at: { gte: startOfDay }
      },
      _sum: {
        prompt_tokens: true,
        completion_tokens: true
      }
    });

    const totalTokens = (result._sum.prompt_tokens || 0) + (result._sum.completion_tokens || 0);

    if (totalTokens > DAILY_LIMIT) {
      console.warn(`[AIUsageTracker] Budget Alert: User ${userId} exceeded daily token limit! (${totalTokens} > ${DAILY_LIMIT})`);
      // Here we would ideally trigger an email or push notification
    }
  }
};
