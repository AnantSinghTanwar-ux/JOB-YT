import axios from 'axios';
import { AppError } from '../utils/appError';

export const WhatsAppService = {
  /**
   * Sends an OTP via the Meta WhatsApp Cloud API.
   * Requires WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in the environment.
   */
  async sendOtp(phone: string, code: string): Promise<void> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Sanitize phone number (remove any non-numeric chars)
    const sanitizedPhone = phone.replace(/\D/g, '');

    if (!accessToken || !phoneNumberId) {
      console.warn(`[DEV WHATSAPP] Mock sending OTP ${code} to ${sanitizedPhone}`);
      console.warn(`[DEV WHATSAPP] Please configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env to enable actual sending.`);
      return;
    }

    try {
      const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: sanitizedPhone,
        type: 'template',
        template: {
          // You must pre-approve this template name in your Meta Business account
          name: 'verification_code', 
          language: {
            code: 'en_US'
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: code
                }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                {
                  type: 'text',
                  text: code
                }
              ]
            }
          ]
        }
      };

      await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10s timeout to prevent hanging requests
      });

    } catch (error) {
      console.error('WhatsApp API Error:', error);
      throw new AppError('Failed to send WhatsApp message', 502);
    }
  },

  /**
   * Sends daily job recommendations via WhatsApp.
   * NOTE: For business-initiated messages, you must use a pre-approved template in Meta.
   */
  async sendDailyRecommendations(phone: string, jobs: any[]): Promise<void> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!phone) return;
    const sanitizedPhone = phone.replace(/\D/g, '');

    if (!accessToken || !phoneNumberId) {
      console.warn(`[DEV WHATSAPP] Mock sending recommendations to ${sanitizedPhone}`);
      console.warn(`[DEV WHATSAPP] Jobs: ${jobs.map(j => j.title).join(', ')}`);
      return;
    }

    try {
      const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
      
      // Building a simple text message. If outside 24h window, this must be a template.
      // We assume a generic template "daily_job_alerts" exists, or just send text for now
      // depending on their WhatsApp business setup. Here we use a text message for simplicity 
      // which works if the user has opted in or within 24h window.
      // If a template is required, replace this with the template payload.
      let messageText = '*Daily Job Recommendations*\\n\\n';
      jobs.forEach(job => {
        messageText += `*${job.title}* at ${job.companyName || 'Unknown Company'}\\n`;
        messageText += `Score: ${job.score}%\\n`;
        messageText += `${process.env.FRONTEND_URL}/jobs/${job.id}\\n\\n`;
      });
      messageText += 'You can manage these alerts in your settings.';

      const payload = {
        messaging_product: 'whatsapp',
        to: sanitizedPhone,
        type: 'text',
        text: {
          preview_url: true,
          body: messageText
        }
      };

      await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 
      });

    } catch (error) {
      console.error('WhatsApp API Error (Recommendations):', error);
      // We don't throw an AppError here because this is likely running in a background queue
      // and we don't want to crash the worker completely, but the queue will handle retries.
      throw Object.assign(new Error('Failed to send WhatsApp recommendations'), { cause: error });
    }
  }
};
