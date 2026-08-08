import { InterviewInviteModel, CreateInterviewInviteData } from '../models/interviewInvite.model';
import { NotificationOrchestrator } from './notification/orchestrator';
import { getNotificationQueue } from '../config/queue';
import pool from '../config/database';

export const InterviewInviteService = {
  async createInvite(recruiterId: string, applicationId: string, data: Omit<CreateInterviewInviteData, 'applicationId' | 'createdBy'>) {
    // 1. Validate recruiter owns the job for this application
    const { rows: appRows } = await pool.query(
      `SELECT a.applicant_id, j.title as job_title, j.recruiter_id, ap.name as applicant_name
       FROM applications a 
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN applicant_profiles ap ON a.applicant_id = ap.user_id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (appRows.length === 0) {
      throw new Error('Application not found');
    }

    const app = appRows[0];
    if (app.recruiter_id !== recruiterId) {
      throw new Error('Unauthorized');
    }

    // 2. Create the invite
    const invite = await InterviewInviteModel.create({
      applicationId,
      createdBy: recruiterId,
      scheduledAt: data.scheduledAt,
      locationOrLink: data.locationOrLink,
      notes: data.notes,
    });

    // 3. Dispatch notification to applicant
    await NotificationOrchestrator.dispatch(
      app.applicant_id,
      'interview_invited',
      {
        title: `Interview Invitation: ${app.job_title}`,
        body: `You have been invited to an interview for the ${app.job_title} position.`,
        action_url: `/candidate/applications/${applicationId}`, // adjust path as needed
        job_title: app.job_title,
        userName: app.applicant_name,
        scheduled_at: data.scheduledAt,
        location_or_link: data.locationOrLink,
        notes: data.notes,
      }
    );

    // 4. Schedule 24h and 2h reminders
    const timeUntilInterview = new Date(data.scheduledAt).getTime() - Date.now();
    
    const timeUntil24h = timeUntilInterview - 24 * 60 * 60 * 1000;
    if (timeUntil24h > 0) {
      const nQueue = getNotificationQueue();
      if (nQueue) {
        await nQueue.add('sendInterviewReminder', {
          userId: app.applicant_id,
          type: 'interview_reminder_24h',
          jobTitle: app.job_title,
          scheduledAt: data.scheduledAt,
          actionUrl: `/candidate/applications/${applicationId}`,
          locationOrLink: data.locationOrLink
        }, { delay: timeUntil24h });
      }
    }

    const timeUntil2h = timeUntilInterview - 2 * 60 * 60 * 1000;
    if (timeUntil2h > 0) {
      const nQueue = getNotificationQueue();
      if (nQueue) {
        await nQueue.add('sendInterviewReminder', {
          userId: app.applicant_id,
          type: 'interview_reminder_2h',
          jobTitle: app.job_title,
          scheduledAt: data.scheduledAt,
          actionUrl: `/candidate/applications/${applicationId}`,
          locationOrLink: data.locationOrLink
        }, { delay: timeUntil2h });
      }
    }

    return invite;
  },

  async listInvites(applicationId: string) {
    return await InterviewInviteModel.findByApplication(applicationId);
  },

  async cancelInvite(recruiterId: string, inviteId: string) {
    // Basic auth check
    const { rows: inviteRows } = await pool.query(
      `SELECT i.*, a.applicant_id, j.recruiter_id, j.title as job_title, ap.name as applicant_name
       FROM interview_invites i
       JOIN applications a ON i.application_id = a.id
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN applicant_profiles ap ON a.applicant_id = ap.user_id
       WHERE i.id = $1`,
      [inviteId]
    );

    if (inviteRows.length === 0) {
      throw new Error('Invite not found');
    }

    const invite = inviteRows[0];
    if (invite.recruiter_id !== recruiterId) {
      throw new Error('Unauthorized');
    }

    const updated = await InterviewInviteModel.updateStatus(inviteId, 'cancelled');

    // Notify applicant
    await NotificationOrchestrator.dispatch(
      invite.applicant_id,
      'application_status', // Reusing status update event for cancellation
      {
        title: `Interview Cancelled: ${invite.job_title}`,
        body: `Your interview for the ${invite.job_title} position has been cancelled.`,
        action_url: `/candidate/applications/${invite.application_id}`,
        job_title: invite.job_title,
        userName: invite.applicant_name,
        new_status: 'interview_cancelled'
      }
    );

    return updated;
  }
};
