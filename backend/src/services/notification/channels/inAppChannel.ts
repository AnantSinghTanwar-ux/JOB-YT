import { NotificationChannel, DeliveryContext } from '../types';
import { NotificationModel } from '../../../models/notification.model';
import { emitNotification } from '../../../config/socket';

export const InAppChannel: NotificationChannel = {
  name: 'in_app',
  async send(ctx: DeliveryContext) {
    const { userId, event, payload } = ctx;
    
    // Create the DB record
    const notification = await NotificationModel.create({
      user_id: userId,
      type: event as any,
      title: payload.title,
      body: payload.body,
      action_url: payload.action_url,
    });

    // Fire the real-time event
    emitNotification(userId, notification);
  }
};
