import pool from '../config/database';

export interface GoogleCalendarToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: Date;
  created_at: Date;
  updated_at: Date;
}

export const GoogleCalendarTokenModel = {
  async findByUserId(userId: string): Promise<GoogleCalendarToken | null> {
    const { rows } = await pool.query(
      `SELECT * FROM google_calendar_tokens WHERE user_id = $1`,
      [userId],
    );
    return rows[0] || null;
  },

  async upsert(userId: string, accessToken: string, refreshToken: string, tokenExpiry: Date): Promise<GoogleCalendarToken> {
    const { rows } = await pool.query(
      `INSERT INTO google_calendar_tokens (user_id, access_token, refresh_token, token_expiry)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET access_token = $2, refresh_token = $3, token_expiry = $4, updated_at = now()
       RETURNING *`,
      [userId, accessToken, refreshToken, tokenExpiry],
    );
    return rows[0];
  },

  async updateTokens(userId: string, accessToken: string, tokenExpiry: Date): Promise<void> {
    await pool.query(
      `UPDATE google_calendar_tokens SET access_token = $2, token_expiry = $3, updated_at = now() WHERE user_id = $1`,
      [userId, accessToken, tokenExpiry],
    );
  },

  async delete(userId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM google_calendar_tokens WHERE user_id = $1`,
      [userId],
    );
    return (rowCount ?? 0) > 0;
  },
};
