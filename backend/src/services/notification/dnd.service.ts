import pool from '../../config/database';
import { DateTime } from 'luxon';

export const DNDService = {
  /**
   * Evaluates if DND is currently active for a user and calculates the delay until it ends.
   * Returns a delay in milliseconds, or 0 if DND is inactive or misconfigured.
   */
  async calculateDelay(userId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT enabled as dnd_enabled, start_time as dnd_start_time, end_time as dnd_end_time, timezone as dnd_timezone 
       FROM notification_dnd_settings WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) return 0;
    
    const { dnd_enabled, dnd_start_time, dnd_end_time, dnd_timezone } = rows[0];

    if (!dnd_enabled || !dnd_start_time || !dnd_end_time || !dnd_timezone) {
      return 0; // DND disabled or missing configs
    }

    try {
      // Get current time in user's timezone
      const now = DateTime.now().setZone(dnd_timezone);
      if (!now.isValid) return 0; // fallback if timezone is invalid

      // Parse start and end times (format "HH:mm")
      const [startHour, startMinute] = dnd_start_time.split(':').map(Number);
      const [endHour, endMinute] = dnd_end_time.split(':').map(Number);

      let startTime = now.set({ hour: startHour, minute: startMinute, second: 0, millisecond: 0 });
      let endTime = now.set({ hour: endHour, minute: endMinute, second: 0, millisecond: 0 });

      // Handle overnight DND (e.g. 22:00 to 08:00)
      if (startTime > endTime) {
        if (now >= startTime) {
          // Currently before midnight, end time is tomorrow
          endTime = endTime.plus({ days: 1 });
        } else if (now <= endTime) {
          // Currently after midnight, start time was yesterday
          startTime = startTime.minus({ days: 1 });
        }
      }

      // Check if currently within the DND window
      if (now >= startTime && now <= endTime) {
        // Return delay in milliseconds until the end time
        return endTime.toMillis() - now.toMillis();
      }

      return 0; // Not currently in DND
    } catch (err) {
      console.error('[DNDService] Error calculating DND delay:', err);
      return 0; // Fail open
    }
  }
};
