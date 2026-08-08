import crypto from 'crypto';
import { WebhookModel, WebhookDeliveryModel } from '../models/webhook.model';
import { signPayload } from './webhook/signer';
import { WebhookPayload } from './webhook/eventCatalog';
import { getWebhookQueue } from '../config/queue';

function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const WebhookService = {
  generateSecret,

  async register(userId: string, url: string, events: string[]) {
    const secret = generateSecret();
    const webhook = await WebhookModel.create({ user_id: userId, url, events, secret });
    return webhook;
  },

  list(userId: string) {
    return WebhookModel.findByUserId(userId);
  },

  async update(id: string, userId: string, data: { url?: string; events?: string[]; is_active?: boolean }) {
    const updated = await WebhookModel.update(id, userId, data);
    if (!updated) throw Object.assign(new Error('Webhook not found'), { statusCode: 404 });
    return updated;
  },

  async delete(id: string, userId: string) {
    const deleted = await WebhookModel.delete(id, userId);
    if (!deleted) throw Object.assign(new Error('Webhook not found'), { statusCode: 404 });
  },

  getDeliveries(webhookId: string, userId: string) {
    return WebhookDeliveryModel.findRecentByWebhook(webhookId);
  },

  async fireEvent(eventType: string, payload: WebhookPayload) {
    const webhooks = await WebhookModel.findByEvent(eventType);

    for (const webhook of webhooks) {
      const delivery = await WebhookDeliveryModel.create({
        webhook_id: webhook.id,
        event_type: eventType,
        payload,
      });

      const wQueue = getWebhookQueue();
      if (wQueue) {
        await wQueue.add(
          'deliver',
          {
            deliveryId: delivery.id,
            webhookId: webhook.id,
            url: webhook.url,
            secret: webhook.secret,
            eventType,
            payload,
            attempt: 1,
          },
          {
            attempts: 4,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      }
    }
  },
};
