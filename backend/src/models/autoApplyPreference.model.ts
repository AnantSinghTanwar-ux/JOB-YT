import pool from '../config/database';
import {
  AutoApplyApprovalMode,
  AutoApplyPreferences,
  AutoApplyPreferencesInput,
  AutoApplyStatus,
} from '../types/autoApply.types';

function mapRow(row: Record<string, unknown>): AutoApplyPreferences {
  return {
    user_id: String(row.user_id),
    status: row.status as AutoApplyStatus,
    approval_mode: row.approval_mode as AutoApplyApprovalMode,
    match_threshold: Number(row.match_threshold),
    target_roles: (row.target_roles as string[]) || [],
    target_locations: (row.target_locations as string[]) || [],
    target_job_types: typeof row.target_job_types === 'string'
      ? (row.target_job_types === '{}' ? [] : row.target_job_types.replace(/^{|}$/g, '').split(','))
      : ((row.target_job_types as string[]) || []),
    excluded_companies: (row.excluded_companies as string[]) || [],
    excluded_keywords: (row.excluded_keywords as string[]) || [],
    base_resume_id: row.base_resume_id ? String(row.base_resume_id) : null,
    include_cover_letter: Boolean(row.include_cover_letter),
    digest_enabled: Boolean(row.digest_enabled),
    tailoring_mode: (row.tailoring_mode as 'nudge' | 'keywords' | 'full') || 'keywords',
    consented_at: row.consented_at ? new Date(String(row.consented_at)) : null,
    preview_ack_at: row.preview_ack_at ? new Date(String(row.preview_ack_at)) : null,
    last_matched_at: row.last_matched_at ? new Date(String(row.last_matched_at)) : null,
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

const DEFAULTS = {
  status: 'disabled' as AutoApplyStatus,
  approval_mode: 'manual' as AutoApplyApprovalMode,
  match_threshold: 70,
};

export const AutoApplyPreferenceModel = {
  async findByUserId(userId: string): Promise<AutoApplyPreferences | null> {
    const { rows } = await pool.query(
      'SELECT * FROM auto_apply_preferences WHERE user_id = $1',
      [userId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async getOrCreate(userId: string): Promise<AutoApplyPreferences> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const { rows } = await pool.query(
      `INSERT INTO auto_apply_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId],
    );

    if (rows[0]) return mapRow(rows[0]);
    const refetch = await this.findByUserId(userId);
    if (!refetch) throw new Error('Failed to create auto-apply preferences');
    return refetch;
  },

  async upsert(userId: string, input: AutoApplyPreferencesInput): Promise<AutoApplyPreferences> {
    await this.getOrCreate(userId);

    const { rows } = await pool.query(
      `UPDATE auto_apply_preferences SET
        approval_mode = COALESCE($2, approval_mode),
        match_threshold = COALESCE($3, match_threshold),
        target_roles = COALESCE($4, target_roles),
        target_locations = COALESCE($5, target_locations),
        target_job_types = COALESCE($6, target_job_types),
        excluded_companies = COALESCE($7, excluded_companies),
        excluded_keywords = COALESCE($8, excluded_keywords),
        base_resume_id = COALESCE($9, base_resume_id),
        include_cover_letter = COALESCE($10, include_cover_letter),
        digest_enabled = COALESCE($11, digest_enabled),
        tailoring_mode = COALESCE($12, tailoring_mode),
        updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [
        userId,
        input.approval_mode ?? null,
        input.match_threshold ?? null,
        input.target_roles ?? null,
        input.target_locations ?? null,
        input.target_job_types ?? null,
        input.excluded_companies ?? null,
        input.excluded_keywords ?? null,
        input.base_resume_id ?? null,
        input.include_cover_letter ?? null,
        input.digest_enabled ?? null,
        input.tailoring_mode ?? null,
      ],
    );
    return mapRow(rows[0]);
  },

  async updateStatus(userId: string, status: AutoApplyStatus): Promise<AutoApplyPreferences> {
    const { rows } = await pool.query(
      `UPDATE auto_apply_preferences
       SET status = $2, updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [userId, status],
    );
    return mapRow(rows[0]);
  },

  async setConsent(userId: string): Promise<void> {
    await pool.query(
      `UPDATE auto_apply_preferences SET consented_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
      [userId],
    );
  },

  async setPreviewAck(userId: string): Promise<void> {
    await pool.query(
      `UPDATE auto_apply_preferences SET preview_ack_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
      [userId],
    );
  },

  async setLastMatchedAt(userId: string): Promise<void> {
    await pool.query(
      `UPDATE auto_apply_preferences SET last_matched_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
      [userId],
    );
  },

  async listEnabledUserIds(): Promise<string[]> {
    const { rows } = await pool.query(
      `SELECT user_id FROM auto_apply_preferences WHERE status = 'enabled'`,
    );
    return rows.map((r) => String(r.user_id));
  },

  defaults: DEFAULTS,
};
