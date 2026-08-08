import pool from '../config/database';
import { PoolClient } from 'pg';
import { AutoApplyQueueStatus } from '../types/autoApply.types';
import { MatchReason } from '../types/autoApply.types';
import { HybridScoreResult } from '../services/unifiedMatch.service';

export interface AutoApplyQueueItem {
  id: string;
  user_id: string;
  job_id: string;
  status: AutoApplyQueueStatus;
  match_score: number | null;
  match_reason: MatchReason;
  match_breakdown: HybridScoreResult | null;
  resume_variant_id: string | null;
  application_id: string | null;
  failure_reason: string | null;
  failed_at: Date | null;
  approval_expires_at: Date | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  job_title?: string;
  company_name?: string;
}

function mapRow(row: Record<string, unknown>): AutoApplyQueueItem {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    job_id: String(row.job_id),
    status: row.status as AutoApplyQueueStatus,
    match_score: row.match_score != null ? Number(row.match_score) : null,
    match_reason: (row.match_reason as MatchReason) || {},
    match_breakdown: (row.match_breakdown as HybridScoreResult) || null,
    resume_variant_id: row.resume_variant_id ? String(row.resume_variant_id) : null,
    application_id: row.application_id ? String(row.application_id) : null,
    failure_reason: row.failure_reason ? String(row.failure_reason) : null,
    failed_at: row.failed_at ? new Date(String(row.failed_at)) : null,
    approval_expires_at: row.approval_expires_at ? new Date(String(row.approval_expires_at)) : null,
    processed_at: row.processed_at ? new Date(String(row.processed_at)) : null,
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
    job_title: row.job_title ? String(row.job_title) : undefined,
    company_name: row.company_name ? String(row.company_name) : undefined,
  };
}

export const AutoApplyQueueModel = {
  async create(data: {
    user_id: string;
    job_id: string;
    status?: AutoApplyQueueStatus;
    match_score?: number;
    match_reason?: MatchReason;
    match_breakdown?: HybridScoreResult;
    approval_expires_at?: Date | null;
  }, client?: PoolClient): Promise<AutoApplyQueueItem> {
    const db = client ?? pool;
    const { rows } = await db.query(
      `INSERT INTO auto_apply_queue_items (
        user_id, job_id, status, match_score, match_reason, match_breakdown, approval_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, job_id) DO UPDATE SET
        status = EXCLUDED.status,
        match_score = EXCLUDED.match_score,
        match_reason = EXCLUDED.match_reason,
        match_breakdown = EXCLUDED.match_breakdown,
        approval_expires_at = EXCLUDED.approval_expires_at,
        updated_at = NOW()
      RETURNING *`,
      [
        data.user_id,
        data.job_id,
        data.status || 'matched',
        data.match_score ?? null,
        JSON.stringify(data.match_reason || {}),
        data.match_breakdown ? JSON.stringify(data.match_breakdown) : null,
        data.approval_expires_at ?? null,
      ],
    );
    return mapRow(rows[0]);
  },

  async findById(id: string, userId: string): Promise<AutoApplyQueueItem | null> {
    const { rows } = await pool.query(
      `SELECT q.*, j.title AS job_title, COALESCE(j.company_name, '[Company]') AS company_name
       FROM auto_apply_queue_items q
       LEFT JOIN jobs j ON j.id = q.job_id
       WHERE q.id = $1 AND q.user_id = $2`,
      [id, userId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async listByUser(
    userId: string,
    options: { status?: AutoApplyQueueStatus; page?: number; limit?: number } = {},
  ): Promise<{ items: AutoApplyQueueItem[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;
    const params: unknown[] = [userId];
    let where = 'WHERE q.user_id = $1';

    if (options.status) {
      params.push(options.status);
      where += ` AND q.status = $${params.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM auto_apply_queue_items q ${where}`,
      params,
    );
    const total = Number.parseInt(countRes.rows[0]?.count ?? '0', 10);

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT q.*, COALESCE(j.title, '[Job Removed]') AS job_title, COALESCE(j.company_name, '[Company]') AS company_name
       FROM auto_apply_queue_items q
       LEFT JOIN jobs j ON j.id = q.job_id
       ${where}
       ORDER BY q.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { items: rows.map(mapRow), total };
  },

  async getStats(userId: string): Promise<Record<string, number>> {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM auto_apply_queue_items
       WHERE user_id = $1
       GROUP BY status`,
      [userId],
    );
    const stats: Record<string, number> = {};
    for (const row of rows) {
      stats[String(row.status)] = Number(row.count);
    }
    return stats;
  },

  async updateStatus(
    id: string,
    status: AutoApplyQueueStatus,
    extra: {
      failure_reason?: string;
      failed_at?: Date;
      processed_at?: Date;
      resume_variant_id?: string;
      application_id?: string;
      resetFields?: ('failure_reason' | 'failed_at' | 'processed_at')[];
    } = {},
    client?: PoolClient,
  ): Promise<AutoApplyQueueItem> {
    const db = client ?? pool;
    const reset = extra.resetFields || [];
    
    let sql = `UPDATE auto_apply_queue_items SET status = $2, updated_at = NOW()`;
    const params: any[] = [id, status];

    if (reset.includes('failure_reason')) sql += `, failure_reason = NULL`;
    else if (extra.failure_reason !== undefined) {
      params.push(extra.failure_reason);
      sql += `, failure_reason = $${params.length}`;
    }

    if (reset.includes('failed_at')) sql += `, failed_at = NULL`;
    else if (extra.failed_at !== undefined) {
      params.push(extra.failed_at);
      sql += `, failed_at = $${params.length}`;
    }

    if (reset.includes('processed_at')) sql += `, processed_at = NULL`;
    else if (extra.processed_at !== undefined) {
      params.push(extra.processed_at);
      sql += `, processed_at = $${params.length}`;
    }

    if (extra.resume_variant_id !== undefined) {
      params.push(extra.resume_variant_id);
      sql += `, resume_variant_id = $${params.length}`;
    }

    if (extra.application_id !== undefined) {
      params.push(extra.application_id);
      sql += `, application_id = $${params.length}`;
    }

    sql += ` WHERE id = $1 RETURNING *`;

    const { rows } = await db.query(sql, params);
    return mapRow(rows[0]);
  },


  async expirePendingApprovals(): Promise<number> {
    const { rowCount } = await pool.query(
      `UPDATE auto_apply_queue_items
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'pending_approval'
         AND approval_expires_at IS NOT NULL
         AND approval_expires_at < NOW()`,
    );
    return rowCount ?? 0;
  },
};
