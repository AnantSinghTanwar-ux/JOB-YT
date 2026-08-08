import pool from '../../config/database';

export interface NotificationPreference {
  id: string;
  user_id: string;
  event_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
}

export const PreferenceService = {
  async getDNDSettings(userId: string) {
    const { rows } = await pool.query(
      `SELECT enabled as dnd_enabled, start_time as dnd_start_time, end_time as dnd_end_time, timezone as dnd_timezone 
       FROM notification_dnd_settings WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  },

  async updateDNDSettings(
    userId: string,
    updates: { dnd_enabled?: boolean; dnd_start_time?: string; dnd_end_time?: string; dnd_timezone?: string }
  ) {
    const { dnd_enabled, dnd_start_time, dnd_end_time, dnd_timezone } = updates;
    const { rows } = await pool.query(
      `INSERT INTO notification_dnd_settings (user_id, enabled, start_time, end_time, timezone)
       VALUES ($1, COALESCE($2, false), COALESCE($3, '22:00'), COALESCE($4, '08:00'), COALESCE($5, 'UTC'))
       ON CONFLICT (user_id) DO UPDATE SET 
        enabled = COALESCE($2, notification_dnd_settings.enabled),
        start_time = COALESCE($3, notification_dnd_settings.start_time),
        end_time = COALESCE($4, notification_dnd_settings.end_time),
        timezone = COALESCE($5, notification_dnd_settings.timezone),
        updated_at = NOW()
       RETURNING enabled as dnd_enabled, start_time as dnd_start_time, end_time as dnd_end_time, timezone as dnd_timezone`,
      [userId, dnd_enabled ?? null, dnd_start_time ?? null, dnd_end_time ?? null, dnd_timezone ?? null]
    );
    return rows[0];
  },

  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    const { rows } = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    return rows;
  },

  async updatePreference(
    userId: string,
    eventType: string,
    updates: Partial<Omit<NotificationPreference, 'id' | 'user_id' | 'event_type'>>
  ): Promise<NotificationPreference> {
    const { in_app_enabled, email_enabled, push_enabled, whatsapp_enabled } = updates;

    // Upsert
    const { rows } = await pool.query(
      `
      INSERT INTO notification_preferences (user_id, event_type, in_app_enabled, email_enabled, push_enabled, whatsapp_enabled)
      VALUES ($1, $2, COALESCE($3, true), COALESCE($4, true), COALESCE($5, true), COALESCE($6, true))
      ON CONFLICT (user_id, event_type)
      DO UPDATE SET 
        in_app_enabled = COALESCE($3, notification_preferences.in_app_enabled),
        email_enabled = COALESCE($4, notification_preferences.email_enabled),
        push_enabled = COALESCE($5, notification_preferences.push_enabled),
        whatsapp_enabled = COALESCE($6, notification_preferences.whatsapp_enabled),
        updated_at = NOW()
      RETURNING *
      `,
      [
        userId,
        eventType,
        in_app_enabled ?? null,
        email_enabled ?? null,
        push_enabled ?? null,
        whatsapp_enabled ?? null
      ]
    );

    return rows[0];
  },

  /**
   * Helper for the Orchestrator to decide if a channel is enabled for a given event,
   * falling back to the user's global toggles if no specific pref exists.
   */
  async isChannelEnabled(
    userId: string,
    eventType: string,
    channel: 'in_app' | 'email' | 'push' | 'whatsapp'
  ): Promise<boolean> {
    // 1. Fetch user's global toggles
    const { rows: userRows } = await pool.query(
      `SELECT email_alerts_enabled, whatsapp_alerts_enabled FROM users WHERE id = $1`,
      [userId]
    );
    if (!userRows.length) return false;

    const { email_alerts_enabled, whatsapp_alerts_enabled } = userRows[0];

    // 2. Fetch specific pref for this event
    const { rows: prefRows } = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1 AND event_type = $2`,
      [userId, eventType]
    );

    let specificPref = prefRows.length > 0 ? prefRows[0] : null;

    switch (channel) {
      case 'in_app':
        return specificPref ? specificPref.in_app_enabled : true;
      case 'push':
        return specificPref ? specificPref.push_enabled : true;
      case 'email':
        return (specificPref ? specificPref.email_enabled : true) && email_alerts_enabled;
      case 'whatsapp':
        return (specificPref ? specificPref.whatsapp_enabled : true) && whatsapp_alerts_enabled;
    }
  }
};
