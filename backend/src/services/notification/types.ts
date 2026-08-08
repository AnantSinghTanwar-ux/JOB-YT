import { NotificationType } from '../../models/notification.model';

export type NotificationEvent = NotificationType;

export interface NotificationPayload {
  title: string;
  body: string;
  action_url?: string;
  /** When set, only these channels are considered (e.g. recruiter broadcast selection). */
  allowedChannels?: Array<'in_app' | 'email' | 'push' | 'whatsapp'>;
  // Dynamic fields for templating
  [key: string]: any;
}

export interface DeliveryContext {
  userId: string;
  event: NotificationEvent;
  payload: NotificationPayload;
  idempotencyKey?: string;
}

export interface NotificationChannel {
  name: string;
  send(ctx: DeliveryContext): Promise<void>;
}

export interface NotificationPrefs {
  email_alerts_enabled: boolean;
  whatsapp_alerts_enabled: boolean;
}
