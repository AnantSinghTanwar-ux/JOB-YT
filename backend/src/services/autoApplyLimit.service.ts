import pool from '../config/database';
import { CREDIT_COSTS } from '../config/creditCosts';
import { CreditService } from './credit.service';
import { AutoApplyLimits } from '../types/autoApply.types';

const FREE_TIER_DAILY_LIMIT = 10;

export const AutoApplyLimitService = {
  async getUserTier(userId: string): Promise<{ tier: string; maxDaily: number }> {
    const { rows } = await pool.query(
      `SELECT p.name, p.max_daily_auto_apply
       FROM payments pay
       JOIN plans p ON p.id = pay.plan_id
       WHERE pay.user_id = $1 AND pay.status = 'success'
       ORDER BY pay.created_at DESC
       LIMIT 1`,
      [userId],
    );

    if (rows.length > 0) {
      return {
        tier: String(rows[0].name),
        maxDaily: Number(rows[0].max_daily_auto_apply) || FREE_TIER_DAILY_LIMIT,
      };
    }

    return { tier: 'Free', maxDaily: FREE_TIER_DAILY_LIMIT };
  },

  async getUsageToday(userId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT applied_count FROM auto_apply_daily_usage
       WHERE user_id = $1 AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')`,
      [userId],
    );
    return rows[0] ? Number(rows[0].applied_count) : 0;
  },

  async incrementApplied(userId: string): Promise<void> {
    await pool.query(
      `INSERT INTO auto_apply_daily_usage (user_id, usage_date, applied_count, matched_count)
       VALUES ($1, (CURRENT_DATE AT TIME ZONE 'UTC'), 1, 0)
       ON CONFLICT (user_id, usage_date)
       DO UPDATE SET applied_count = auto_apply_daily_usage.applied_count + 1`,
      [userId],
    );
  },

  async incrementMatched(userId: string, count = 1): Promise<void> {
    await pool.query(
      `INSERT INTO auto_apply_daily_usage (user_id, usage_date, applied_count, matched_count)
       VALUES ($1, (CURRENT_DATE AT TIME ZONE 'UTC'), 0, $2)
       ON CONFLICT (user_id, usage_date)
       DO UPDATE SET matched_count = auto_apply_daily_usage.matched_count + $2`,
      [userId, count],
    );
  },

  async assertDailyLimit(userId: string): Promise<void> {
    const { maxDaily } = await this.getUserTier(userId);
    const used = await this.getUsageToday(userId);
    if (used >= maxDaily) {
      throw Object.assign(new Error('Daily Auto-Apply limit reached'), {
        statusCode: 429,
        code: 'AUTO_APPLY_DAILY_LIMIT',
        maxDaily,
        usedToday: used,
      });
    }
  },

  async getLimits(userId: string): Promise<AutoApplyLimits> {
    const [{ tier, maxDaily }, usedToday, creditBalance] = await Promise.all([
      this.getUserTier(userId),
      this.getUsageToday(userId),
      CreditService.getBalance(userId),
    ]);

    return {
      tier,
      maxDaily,
      usedToday,
      remaining: Math.max(0, maxDaily - usedToday),
      creditBalance,
      creditCostPerApply: CREDIT_COSTS.APPLY_JOB,
    };
  },
};
