import pool from '../config/database';
import { ResumeVariant } from '../types/autoApply.types';

function mapRow(row: Record<string, unknown>): ResumeVariant {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    job_id: row.job_id ? String(row.job_id) : null,
    base_resume_id: String(row.base_resume_id),
    version_label: String(row.version_label),
    snapshot_url: String(row.snapshot_url),
    change_log: Array.isArray(row.change_log) ? row.change_log : [],
    fabricated_risk: Boolean(row.fabricated_risk),
    source: row.source as ResumeVariant['source'],
    queue_item_id: row.queue_item_id ? String(row.queue_item_id) : null,
    created_at: new Date(String(row.created_at)),
  };
}

export const ResumeVariantModel = {
  async create(data: {
    user_id: string;
    job_id?: string | null;
    base_resume_id: string;
    version_label?: string;
    snapshot_url: string;
    change_log?: unknown[];
    fabricated_risk?: boolean;
    queue_item_id?: string | null;
  }): Promise<ResumeVariant> {
    const { rows } = await pool.query(
      `INSERT INTO resume_variants (
        user_id, job_id, base_resume_id, version_label, snapshot_url,
        change_log, fabricated_risk, queue_item_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.user_id,
        data.job_id ?? null,
        data.base_resume_id,
        data.version_label || 'A',
        data.snapshot_url,
        JSON.stringify(data.change_log || []),
        data.fabricated_risk ?? false,
        data.queue_item_id ?? null,
      ],
    );
    return mapRow(rows[0]);
  },

  async findById(id: string, userId: string): Promise<ResumeVariant | null> {
    const { rows } = await pool.query(
      'SELECT * FROM resume_variants WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async countForJob(userId: string, jobId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM resume_variants WHERE user_id = $1 AND job_id = $2`,
      [userId, jobId],
    );
    return Number.parseInt(rows[0]?.count ?? '0', 10);
  },
};
