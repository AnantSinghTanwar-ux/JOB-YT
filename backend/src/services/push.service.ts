import axios from 'axios';
import { getApps } from 'firebase-admin/app';
import { getMessaging, MulticastMessage, SendResponse } from 'firebase-admin/messaging';
import { DeviceTokenModel } from '../models/deviceToken.model';

export const PushNotificationService = {
  async sendPushNotification(userId: string, title: string, body: string, actionUrl?: string) {
    try {
      // Fetch user's registered device tokens
      const tokens = await DeviceTokenModel.findByUser(userId);
      if (tokens.length === 0) {
        return;
      }

      const expoTokens: string[] = [];
      const fcmTokens: string[] = [];

      for (const tokenObj of tokens) {
        const token = tokenObj.token;
        if (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')) {
          expoTokens.push(token);
        } else {
          fcmTokens.push(token);
        }
      }

      // Send Expo Push Notifications (working end-to-end without credentials)
      if (expoTokens.length > 0) {
        await this.sendExpoPush(expoTokens, title, body, actionUrl);
      }

      // FCM mock dispatch (extensible architecture)
      if (fcmTokens.length > 0) {
        await this.sendFCM(fcmTokens, title, body, actionUrl);
      }
    } catch (err) {
      console.error('[PushNotificationService] Error sending push notification:', err);
    }
  },

  async sendExpoPush(tokens: string[], title: string, body: string, actionUrl?: string) {
    try {
      const messages = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: { actionUrl },
      }));

      // Expo Push API endpoint
      const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });

      console.log(`[PushNotificationService] Sent Expo push notification to ${tokens.length} devices.`, response.data);
    } catch (err: any) {
      console.error('[PushNotificationService] Failed to send Expo push:', err.response?.data || err.message);
    }
  },

  async sendFCM(tokens: string[], title: string, body: string, actionUrl?: string) {
    const firebaseEnabled = process.env.FIREBASE_ENABLED === 'true';
    const apps = getApps();
    if (!firebaseEnabled || apps.length === 0) {
      console.log(`[PushNotificationService FCM Mock] Sending push to ${tokens.length} native devices:`, {
        title,
        body,
        actionUrl,
        tokens,
      });
      return;
    }

    try {
      const message: MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: actionUrl ? { actionUrl } : {},
        android: {
          notification: {
            channelId: 'default',
            priority: 'high',
          },
        },
      };

      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`[PushNotificationService FCM] Multicast sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);

      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp: SendResponse, idx: number) => {
          if (!resp.success && resp.error) {
            const code = resp.error.code;
            if (
              code === 'messaging/invalid-argument' ||
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokens[idx]);
            }
          }
        });

        if (tokensToRemove.length > 0) {
          console.log(`[PushNotificationService FCM] Removing ${tokensToRemove.length} invalid/unregistered device tokens`);
          await DeviceTokenModel.deleteTokens(tokensToRemove);
        }
      }
    } catch (err) {
      console.error('[PushNotificationService FCM] Failed to send multicast message:', err);
    }
  }
};
export default PushNotificationService;
