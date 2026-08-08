import pool from '../config/database';

export interface ApiActivityLog {
  id: number;
  api_key_id: string | null;
  user_id: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: Date;
}

export interface ApiActivityLogQuery {
  api_key_id?: string;
  user_id?: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  from?: string;
  to?: string;
}

export const ApiActivityLogModel = {
  async log(entry: {
    api_key_id?: string | null;
    user_id?: string | null;
    endpoint: string;
    method: string;
    status_code: number;
    latency_ms: number;
    ip_address?: string | null;
    user_agent?: string | null;
    request_id?: string | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO api_activity_logs (api_key_id, user_id, endpoint, method, status_code, latency_ms, ip_address, user_agent, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.api_key_id || null,
        entry.user_id || null,
        entry.endpoint,
        entry.method,
        entry.status_code,
        entry.latency_ms,
        entry.ip_address || null,
        entry.user_agent || null,
        entry.request_id || null,
      ],
    );
  },

  async findAll(
    query: ApiActivityLogQuery = {},
    page = 1,
    limit = 50,
  ): Promise<{ logs: ApiActivityLog[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (query.api_key_id) {
      conditions.push(`l.api_key_id = $${idx++}`);
      values.push(query.api_key_id);
    }
    if (query.user_id) {
      conditions.push(`l.user_id = $${idx++}`);
      values.push(query.user_id);
    }
    if (query.endpoint) {
      conditions.push(`l.endpoint ILIKE $${idx++}`);
      values.push(`%${query.endpoint}%`);
    }
    if (query.method) {
      conditions.push(`l.method = $${idx++}`);
      values.push(query.method);
    }
    if (query.status_code !== undefined) {
      conditions.push(`l.status_code = $${idx++}`);
      values.push(query.status_code);
    }
    if (query.from) {
      conditions.push(`l.created_at >= $${idx++}`);
      values.push(query.from);
    }
    if (query.to) {
      conditions.push(`l.created_at <= $${idx++}`);
      values.push(query.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM api_activity_logs l ${where}`, values),
      pool.query(
        `SELECT l.*, ak.key_prefix, ak.name AS api_key_name
         FROM api_activity_logs l
         LEFT JOIN api_keys ak ON ak.id = l.api_key_id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
    ]);

    return { logs: dataRes.rows, total: parseInt(countRes.rows[0].count) };
  },

  async getStats(apiKeyId: string): Promise<{ total_requests: number; avg_latency_ms: number; error_count: number }> {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_requests,
         COALESCE(AVG(latency_ms)::int, 0) AS avg_latency_ms,
         COUNT(*) FILTER (WHERE status_code >= 400)::int AS error_count
       FROM api_activity_logs
       WHERE api_key_id = $1 AND created_at > now() - interval '7 days'`,
      [apiKeyId],
    );
    return {
      total_requests: rows[0]?.total_requests || 0,
      avg_latency_ms: rows[0]?.avg_latency_ms || 0,
      error_count: rows[0]?.error_count || 0,
    };
  },
};
