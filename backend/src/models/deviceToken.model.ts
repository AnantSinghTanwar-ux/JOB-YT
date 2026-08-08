import pool from '../config/database';

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  last_used_at: Date;
  created_at: Date;
}

export const DeviceTokenModel = {
  async register(userId: string, token: string, platform: string): Promise<DeviceToken> {
    const { rows } = await pool.query(
      `INSERT INTO device_tokens (user_id, token, platform, last_used_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) 
       DO UPDATE SET user_id = $1, platform = $3, last_used_at = NOW()
       RETURNING *`,
      [userId, token, platform]
    );
    return rows[0];
  },

  async findByUser(userId: string): Promise<DeviceToken[]> {
    const { rows } = await pool.query(
      `SELECT * FROM device_tokens WHERE user_id = $1 ORDER BY last_used_at DESC`,
      [userId]
    );
    return rows;
  },

  async deleteToken(token: string): Promise<void> {
    await pool.query(`DELETE FROM device_tokens WHERE token = $1`, [token]);
  },

  async deleteTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await pool.query(`DELETE FROM device_tokens WHERE token = ANY($1)`, [tokens]);
  }
};
