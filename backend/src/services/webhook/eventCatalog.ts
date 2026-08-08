export const WEBHOOK_EVENTS = {
  APPLICATION_SUBMITTED: 'application.submitted',
  APPLICATION_STATUS_CHANGED: 'application.status_changed',
  APPLICATION_INTERVIEW_COMPLETED: 'application.interview_completed',
  APPLICATION_OFFER_EXTENDED: 'application.offer_extended',
  USER_REGISTERED: 'user.registered',
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export interface ApplicationSubmittedPayload {
  event: typeof WEBHOOK_EVENTS.APPLICATION_SUBMITTED;
  application_id: string;
  job_id: string;
  job_title: string;
  applicant: { id: string; name: string | null; email: string | null };
  timestamp: string;
}

export interface ApplicationStatusChangedPayload {
  event: typeof WEBHOOK_EVENTS.APPLICATION_STATUS_CHANGED;
  application_id: string;
  job_id: string;
  job_title: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  timestamp: string;
}

export interface ApplicationInterviewCompletedPayload {
  event: typeof WEBHOOK_EVENTS.APPLICATION_INTERVIEW_COMPLETED;
  application_id: string;
  job_id: string;
  job_title: string;
  scheduled_at: string | null;
  calendar_event_id: string | null;
  timestamp: string;
}

export interface ApplicationOfferExtendedPayload {
  event: typeof WEBHOOK_EVENTS.APPLICATION_OFFER_EXTENDED;
  application_id: string;
  job_id: string;
  job_title: string;
  timestamp: string;
}

export interface UserRegisteredPayload {
  event: typeof WEBHOOK_EVENTS.USER_REGISTERED;
  user_id: string;
  email: string | null;
  role: string;
  auth_provider: string;
  timestamp: string;
}

export type WebhookPayload =
  | ApplicationSubmittedPayload
  | ApplicationStatusChangedPayload
  | ApplicationInterviewCompletedPayload
  | ApplicationOfferExtendedPayload
  | UserRegisteredPayload;
