import { NotificationChannel, DeliveryContext } from '../types';
import { WhatsAppService } from '../../../services/whatsapp.service';
import pool from '../../../config/database';

export const WhatsAppChannel: NotificationChannel = {
  name: 'whatsapp',
  async send(ctx: DeliveryContext) {
    const { userId, event, payload } = ctx;

    const { rows } = await pool.query(
      `SELECT phone FROM users WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) return;

    const phone = rows[0].phone;
    if (!phone) return;

    // Based on the event, we map to specific Meta templates
    // E.g., WhatsAppService.sendTemplateMessage(phone, templateName, components)
    
    console.log(`[WhatsAppChannel] Simulating WhatsApp to ${phone} for event ${event}`);
    
    // In a real implementation:
    // if (event === 'interview_reminder_2h') {
    //   await WhatsAppService.sendTemplateMessage(phone, 'interview_reminder', [
    //     { type: 'body', parameters: [{ type: 'text', text: payload.company_name }] }
    //   ]);
    // }
  }
};
