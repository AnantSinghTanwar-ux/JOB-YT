import webpush from 'web-push';
import { NotificationChannel, DeliveryContext } from '../types';
import pool from '../../../config/database';

// Configure Web Push with VAPID keys from environment variables
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:test@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export const PushChannel: NotificationChannel = {
  name: 'push',
  async send(ctx: DeliveryContext) {
    const { userId, payload } = ctx;

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn(`[PushChannel] Web Push keys not configured. Skipping push for user ${userId}.`);
      return;
    }

    try {
      // Fetch all subscriptions for this user
      const { rows: subscriptions } = await pool.query(
        `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
        [userId]
      );

      if (subscriptions.length === 0) return;

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.action_url || '/',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      });

      const deliveryPromises = subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, pushPayload);
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            // Subscription has expired or is no longer valid, remove it
            console.log(`[PushChannel] Removing expired subscription ${sub.id}`);
            await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
          } else {
            console.error(`[PushChannel] Error sending to subscription ${sub.id}:`, err);
          }
        }
      });

      await Promise.all(deliveryPromises);
    } catch (error) {
      console.error(`[PushChannel] Error processing push notifications:`, error);
    }
  }
};
