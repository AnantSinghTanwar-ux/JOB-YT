import pool from '../config/database';
import { AutoApplyEventType } from '../types/autoApply.types';

export interface AutoApplyEvent {
  id: string;
  user_id: string;
  job_id: string | null;
  queue_item_id: string | null;
  event_type: AutoApplyEventType;
  metadata: Record<string, unknown>;
  created_at: Date;
  job_title?: string;
}

export const AutoApplyEventModel = {
  async create(data: {
    user_id: string;
    job_id?: string | null;
    queue_item_id?: string | null;
    event_type: AutoApplyEventType;
    metadata?: Record<string, unknown>;
  }): Promise<AutoApplyEvent> {
    const { rows } = await pool.query(
      `INSERT INTO auto_apply_events (user_id, job_id, queue_item_id, event_type, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.user_id,
        data.job_id ?? null,
        data.queue_item_id ?? null,
        data.event_type,
        JSON.stringify(data.metadata || {}),
      ],
    );
    return {
      id: String(rows[0].id),
      user_id: String(rows[0].user_id),
      job_id: rows[0].job_id ? String(rows[0].job_id) : null,
      queue_item_id: rows[0].queue_item_id ? String(rows[0].queue_item_id) : null,
      event_type: rows[0].event_type as AutoApplyEventType,
      metadata: rows[0].metadata || {},
      created_at: new Date(String(rows[0].created_at)),
    };
  },

  async listByUser(
    userId: string,
    options: { page?: number; limit?: number; jobId?: string } = {},
  ): Promise<{ events: AutoApplyEvent[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;
    const params: unknown[] = [userId];
    let where = 'WHERE e.user_id = $1';

    if (options.jobId) {
      params.push(options.jobId);
      where += ` AND e.job_id = $${params.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM auto_apply_events e ${where}`,
      params,
    );
    const total = Number.parseInt(countRes.rows[0]?.count ?? '0', 10);

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT e.*, j.title AS job_title
       FROM auto_apply_events e
       LEFT JOIN jobs j ON j.id = e.job_id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      events: rows.map((row) => ({
        id: String(row.id),
        user_id: String(row.user_id),
        job_id: row.job_id ? String(row.job_id) : null,
        queue_item_id: row.queue_item_id ? String(row.queue_item_id) : null,
        event_type: row.event_type as AutoApplyEventType,
        metadata: row.metadata || {},
        created_at: new Date(String(row.created_at)),
        job_title: row.job_title ? String(row.job_title) : undefined,
      })),
      total,
    };
  },
};
