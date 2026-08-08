import { NotificationChannel, DeliveryContext } from '../types';
import { sendEmail } from '../../../utils/email';
import { getEmailTemplate } from '../templates';
import pool from '../../../config/database';

export const EmailChannel: NotificationChannel = {
  name: 'email',
  async send(ctx: DeliveryContext) {
    const { userId, event, payload } = ctx;

    // We need the user's email address and profile name
    const { rows } = await pool.query(
      `SELECT u.email, u.role, 
        COALESCE(ap.name, rp.name, '') as user_name
       FROM users u 
       LEFT JOIN applicant_profiles ap ON u.id = ap.user_id
       LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (rows.length === 0) return;

    const user = rows[0];
    if (!user.email) return;

    const htmlContent = getEmailTemplate(event, { ...payload, userName: user.user_name });
    if (!htmlContent) {
      console.warn(`[EmailChannel] No email template found for event: ${event}`);
      return;
    }

    await sendEmail({
      to: user.email,
      subject: payload.title, // or determine from template logic
      html: htmlContent,
    });
  }
};
