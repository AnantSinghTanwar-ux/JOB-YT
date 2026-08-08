import pool from '../config/database';

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  permissions: Record<string, unknown>;
  rate_limit: number;
  expires_at: Date | null;
  last_used_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKeyWithUser {
  api_key: ApiKey;
  user: {
    id: string;
    email: string | null;
    role: string;
  };
}

export const ApiKeyModel = {
  async findByHash(keyHash: string): Promise<ApiKeyWithUser | null> {
    const { rows } = await pool.query(
      `SELECT ak.*, u.id AS user_id_val, u.email, u.role
       FROM api_keys ak
       JOIN users u ON u.id = ak.user_id
       WHERE ak.key_hash = $1 AND ak.is_active = TRUE`,
      [keyHash],
    );
    if (!rows[0]) return null;
    const { user_id_val, email, role, ...apiKey } = rows[0];
    return {
      api_key: { ...apiKey, user_id: user_id_val },
      user: { id: user_id_val, email, role },
    };
  },

  async findByUserId(userId: string): Promise<ApiKey[]> {
    const { rows } = await pool.query(
      `SELECT id, user_id, key_prefix, name, scopes, permissions, rate_limit,
              expires_at, last_used_at, is_active, created_at, updated_at
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows;
  },

  async create(data: {
    user_id: string;
    key_hash: string;
    key_prefix: string;
    name: string;
    scopes: string[];
    permissions: Record<string, unknown>;
    rate_limit?: number;
    expires_at?: Date | null;
  }): Promise<ApiKey> {
    const { rows } = await pool.query(
      `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, scopes, permissions, rate_limit, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.user_id,
        data.key_hash,
        data.key_prefix,
        data.name,
        data.scopes,
        JSON.stringify(data.permissions),
        data.rate_limit ?? 1000,
        data.expires_at ?? null,
      ],
    );
    return rows[0];
  },

  async update(
    id: string,
    userId: string,
    data: { name?: string; scopes?: string[]; permissions?: Record<string, unknown>; is_active?: boolean },
  ): Promise<ApiKey | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      vals.push(data.name);
    }
    if (data.scopes !== undefined) {
      sets.push(`scopes = $${idx++}`);
      vals.push(data.scopes);
    }
    if (data.permissions !== undefined) {
      sets.push(`permissions = $${idx++}`);
      vals.push(JSON.stringify(data.permissions));
    }
    if (data.is_active !== undefined) {
      sets.push(`is_active = $${idx++}`);
      vals.push(data.is_active);
    }

    sets.push(`updated_at = now()`);

    vals.push(id, userId);

    const { rows } = await pool.query(
      `UPDATE api_keys SET ${sets.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      vals,
    );
    return rows[0] || null;
  },

  async revoke(id: string, userId: string): Promise<ApiKey | null> {
    const { rows } = await pool.query(
      `UPDATE api_keys SET is_active = FALSE, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId],
    );
    return rows[0] || null;
  },

  async touchLastUsed(id: string): Promise<void> {
    await pool.query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [id]);
  },
};
