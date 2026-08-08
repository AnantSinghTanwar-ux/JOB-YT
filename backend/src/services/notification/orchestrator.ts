import { getNotificationQueue } from '../../config/queue';
import { DeliveryContext, NotificationEvent, NotificationPayload } from './types';
import pool from '../../config/database';
import { InAppChannel } from './channels/inAppChannel';
import { EmailChannel } from './channels/emailChannel';
import { WhatsAppChannel } from './channels/whatsappChannel';
import { PushChannel } from './channels/pushChannel';
import { v4 as uuidv4 } from 'uuid';
import { PreferenceService } from './preference.service';
import { DNDService } from './dnd.service';

const CRITICAL_EVENTS = [
  'payment_success',
  'payment_failed',
  'credits_exhausted'
];

const LOG_PREFIX = '[NotificationOrchestrator]';

// Registry of available channels
const CHANNELS = {
  in_app: InAppChannel,
  email: EmailChannel,
  whatsapp: WhatsAppChannel,
  push: PushChannel,
};

export const NotificationOrchestrator = {
  /**
   * Main entry point for all notifications in the system.
   * @param userId The recipient user ID
   * @param event The event type (e.g., 'application_submitted')
   * @param payload Dynamic data for the notification
   * @param idempotencyKey Optional key to prevent duplicate deliveries
   */
  async dispatch(
    userId: string,
    event: NotificationEvent,
    payload: NotificationPayload,
    idempotencyKey?: string,
  ) {
    try {
      // 1. Check which channels are enabled via PreferenceService
      const channels: ('in_app' | 'email' | 'push' | 'whatsapp')[] = ['in_app', 'email', 'push', 'whatsapp'];
      const eligibleChannels: string[] = [];

      for (const channel of channels) {
        const isEnabled = await PreferenceService.isChannelEnabled(userId, event, channel);
        if (isEnabled) {
          eligibleChannels.push(channel);
        }
      }

      const requestedChannels = payload.allowedChannels;
      const filteredChannels = requestedChannels?.length
        ? eligibleChannels.filter((channel) => requestedChannels.includes(channel as typeof channels[number]))
        : eligibleChannels;

      // 1.5 Calculate DND delay for non-critical notifications
      let delay = 0;
      if (!CRITICAL_EVENTS.includes(event)) {
        delay = await DNDService.calculateDelay(userId);
      }

      // 2. For each channel, schedule a delivery job
      for (const channel of filteredChannels) {
        const uniqueKey = idempotencyKey || uuidv4();
        const deliveryIdempotencyKey = `${uniqueKey}:${channel}`;

        // Attempt to record delivery intent (idempotency check)
        const isDuplicate = await this.checkIdempotency(userId, event, channel, deliveryIdempotencyKey);
        
        if (isDuplicate) {
          console.log(`${LOG_PREFIX} Skipping duplicate delivery for ${event} on ${channel} (Key: ${deliveryIdempotencyKey})`);
          continue;
        }

        // Push to queue
        const nQueue = getNotificationQueue();
        if (nQueue) {
          await nQueue.add('dispatchNotification', {
            userId,
            event,
            payload,
            channel,
            idempotencyKey: deliveryIdempotencyKey,
          }, {
            delay // BullMQ accepts delay in milliseconds
          });
        } else {
          console.warn(`${LOG_PREFIX} Redis unavailable — notification for ${event} on ${channel} skipped`);
        }
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error dispatching event ${event}:`, error);
    }
  },

  async checkIdempotency(userId: string, event: string, channel: string, key: string): Promise<boolean> {
    try {
      await pool.query(
        `INSERT INTO notification_deliveries (user_id, event_type, channel, idempotency_key, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [userId, event, channel, key]
      );
      return false; // Not a duplicate
    } catch (err: any) {
      if (err.code === '23505') { // Unique violation
        return true; // Is duplicate
      }
      throw err;
    }
  },

  /**
   * Called by the worker to actually execute the channel send
   */
  async executeDelivery(data: {
    userId: string;
    event: NotificationEvent;
    payload: NotificationPayload;
    channel: keyof typeof CHANNELS;
    idempotencyKey: string;
  }) {
    const { userId, event, payload, channel, idempotencyKey } = data;
    
    try {
      const channelImpl = CHANNELS[channel];
      if (!channelImpl) {
        throw new Error(`Unknown channel: ${channel}`);
      }

      await channelImpl.send({ userId, event, payload, idempotencyKey });

      // Mark success
      await pool.query(
        `UPDATE notification_deliveries SET status = 'delivered' WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
    } catch (error: any) {
      // Mark failed
      await pool.query(
        `UPDATE notification_deliveries SET status = 'failed' WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      throw error; // Rethrow to let BullMQ handle retries
    }
  }
};
