import pool from '../config/database';

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: unknown;
  response_status: number | null;
  response_body: string | null;
  attempt: number;
  delivered_at: Date | null;
  created_at: Date;
}

export const WebhookModel = {
  async create(data: { user_id: string; url: string; events: string[]; secret: string }): Promise<Webhook> {
    const { rows } = await pool.query(
      `INSERT INTO webhooks (user_id, url, events, secret) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.user_id, data.url, data.events, data.secret],
    );
    return rows[0];
  },

  async findByUserId(userId: string): Promise<Webhook[]> {
    const { rows } = await pool.query(
      `SELECT w.*, COUNT(d.id)::int AS delivery_count
       FROM webhooks w
       LEFT JOIN webhook_deliveries d ON d.webhook_id = w.id
       WHERE w.user_id = $1
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
      [userId],
    );
    return rows;
  },

  async findById(id: string, userId: string): Promise<Webhook | null> {
    const { rows } = await pool.query(
      `SELECT * FROM webhooks WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] || null;
  },

  async findByEvent(eventType: string): Promise<Webhook[]> {
    const { rows } = await pool.query(
      `SELECT * FROM webhooks WHERE is_active = TRUE AND $1 = ANY(events)`,
      [eventType],
    );
    return rows;
  },

  async update(
    id: string,
    userId: string,
    data: { url?: string; events?: string[]; is_active?: boolean },
  ): Promise<Webhook | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (data.url !== undefined) { sets.push(`url = $${idx++}`); vals.push(data.url); }
    if (data.events !== undefined) { sets.push(`events = $${idx++}`); vals.push(data.events); }
    if (data.is_active !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(data.is_active); }

    sets.push(`updated_at = now()`);
    vals.push(id, userId);

    const { rows } = await pool.query(
      `UPDATE webhooks SET ${sets.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      vals,
    );
    return rows[0] || null;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM webhooks WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return (rowCount ?? 0) > 0;
  },
};

export const WebhookDeliveryModel = {
  async create(data: { webhook_id: string; event_type: string; payload: unknown; attempt?: number }): Promise<WebhookDelivery> {
    const { rows } = await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, attempt) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.webhook_id, data.event_type, JSON.stringify(data.payload), data.attempt || 1],
    );
    return rows[0];
  },

  async updateResult(
    id: string,
    data: { response_status: number; response_body?: string; attempt?: number },
  ): Promise<void> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (data.response_status >= 200 && data.response_status < 300) {
      sets.push(`delivered_at = now()`);
    }
    sets.push(`response_status = $${idx++}`); vals.push(data.response_status);
    sets.push(`response_body = $${idx++}`); vals.push(data.response_body || null);
    if (data.attempt !== undefined) { sets.push(`attempt = $${idx++}`); vals.push(data.attempt); }

    vals.push(id);

    await pool.query(
      `UPDATE webhook_deliveries SET ${sets.join(', ')} WHERE id = $${idx}`,
      vals,
    );
  },

  async findRecentByWebhook(webhookId: string, limit = 10): Promise<WebhookDelivery[]> {
    const { rows } = await pool.query(
      `SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [webhookId, limit],
    );
    return rows;
  },
};
