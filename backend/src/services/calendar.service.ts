import { calendar_v3 } from 'googleapis';
import { CalendarAuthService } from './calendarAuth.service';
import { NotificationModel } from '../models/notification.model';
import { PipelineEventModel } from '../models/pipeline_event.model';
import { WebhookService } from './webhook.service';
import { WEBHOOK_EVENTS } from './webhook/eventCatalog';
import pool from '../config/database';

export const CalendarService = {
  async scheduleInterview(
    recruiterId: string,
    applicationId: string,
    data: { scheduledAt: string; durationMinutes?: number; notes?: string },
  ) {
    const { rows } = await pool.query(
      `SELECT a.*, j.title AS job_title, j.recruiter_id, u.email AS applicant_email
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.applicant_id
       WHERE a.id = $1`,
      [applicationId],
    );
    const app = rows[0];
    if (!app) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

    const duration = data.durationMinutes || 60;
    const startTime = new Date(data.scheduledAt);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const { calendar } = await CalendarAuthService.getClient(recruiterId);

    const event: calendar_v3.Schema$Event = {
      summary: `Interview: ${app.job_title || 'Job Interview'}`,
      description: data.notes || 'Interview scheduled via Jobyt',
      start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Kolkata' },
      end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Kolkata' },
      attendees: app.applicant_email ? [{ email: app.applicant_email }] : [],
      conferenceData: {
        createRequest: {
          requestId: `jobyt-${applicationId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    const calendarEventId = response.data.id || '';
    const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || '';

    await pool.query(
      `UPDATE applications SET status = 'interview', status_updated_at = now() WHERE id = $1`,
      [applicationId],
    );

    await PipelineEventModel.create({
      application_id: applicationId,
      previous_status: app.status,
      new_status: 'interview',
      changed_by_id: recruiterId,
      notes: data.notes || null,
    });

    await pool.query(
      `UPDATE pipeline_events
       SET calendar_event_id = $1, meet_link = $2, scheduled_at = $3, duration_minutes = $4
       WHERE application_id = $5 AND new_status = 'interview'
       ORDER BY created_at DESC LIMIT 1`,
      [calendarEventId, meetLink, startTime, duration, applicationId],
    );

    await NotificationModel.create({
      user_id: app.applicant_id,
      type: 'application_status',
      title: 'Interview Scheduled',
      body: `Your interview for "${app.job_title || 'your application'}" has been scheduled for ${startTime.toLocaleString('en-IN')}.${meetLink ? ` Join: ${meetLink}` : ''}`,
      action_url: `/applications`,
    });

    setImmediate(() => {
      WebhookService.fireEvent(WEBHOOK_EVENTS.APPLICATION_INTERVIEW_COMPLETED, {
        event: WEBHOOK_EVENTS.APPLICATION_INTERVIEW_COMPLETED,
        application_id: applicationId,
        job_id: app.job_id,
        job_title: app.job_title || '',
        scheduled_at: startTime.toISOString(),
        calendar_event_id: calendarEventId,
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        console.error('[CalendarService] Webhook fire failed silently:', err);
      });
    });

    return {
      calendar_event_id: calendarEventId,
      meet_link: meetLink,
      scheduled_at: startTime.toISOString(),
      duration_minutes: duration,
    };
  },

  async cancelEvent(recruiterId: string, applicationId: string) {
    const pipelines = await pool.query(
      `SELECT pe.* FROM pipeline_events pe
       JOIN applications a ON a.id = pe.application_id
       WHERE pe.application_id = $1 AND pe.calendar_event_id IS NOT NULL
       ORDER BY pe.created_at DESC LIMIT 1`,
      [applicationId],
    );

    const latest = pipelines.rows[0];
    if (!latest) return;

    const { calendar } = await CalendarAuthService.getClient(recruiterId);
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: latest.calendar_event_id,
    }).catch(() => {});
  },
};
