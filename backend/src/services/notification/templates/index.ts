import {
  applicationSubmittedApplicantEmailHtml,
  applicationSubmittedRecruiterEmailHtml,
  statusUpdatedEmailHtml,
  interviewInviteEmailHtml,
  interviewReminderEmailHtml,
  autoApplyDigestEmailHtml
} from '../../../utils/email';

export function getEmailTemplate(event: string, payload: any): string | null {
  switch (event) {
    case 'application_submitted':
      // Differentiate if this is for the applicant or recruiter based on payload
      // Assuming payload has is_recruiter flag
      if (payload.is_recruiter) {
        return applicationSubmittedRecruiterEmailHtml(payload.job_title, payload.applicant_name);
      } else {
        return applicationSubmittedApplicantEmailHtml(payload.userName, payload.job_title);
      }

    case 'application_status':
      return statusUpdatedEmailHtml(payload.userName, payload.job_title, payload.new_status);

    case 'interview_invited':
      return interviewInviteEmailHtml(
        payload.userName, 
        payload.job_title, 
        payload.scheduled_at, 
        payload.location_or_link, 
        payload.notes
      );

    case 'interview_reminder_24h':
    case 'interview_reminder_2h':
      return interviewReminderEmailHtml(
        payload.userName, 
        payload.job_title, 
        payload.scheduled_at, 
        payload.location_or_link
      );

    case 'auto_apply_digest':
      return autoApplyDigestEmailHtml(payload.userName || 'Candidate', payload.summary, payload.date);

    case 'deadline_alert':
    case 'employer_broadcast':
    case 'credits_exhausted':
    case 'low_credit':
    case 'subscription_expiry_7d':
    case 'subscription_expiry_3d':
    case 'subscription_expiry_1d':
      // Fallback simple HTML for these alerts until specific templates are built
      return `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>${payload.title}</h2>
          <p>${payload.body}</p>
          ${payload.action_url ? `<a href="${payload.action_url}" style="display:inline-block; margin-top: 10px; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 4px;">View Details</a>` : ''}
        </div>
      `;

    default:
      return null;
  }
}
