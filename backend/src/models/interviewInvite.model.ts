import pool from '../config/database';

export interface CreateInterviewInviteData {
  applicationId: string;
  scheduledAt: Date;
  locationOrLink?: string;
  notes?: string;
  createdBy: string;
}

export const InterviewInviteModel = {
  async create(data: CreateInterviewInviteData) {
    const { rows } = await pool.query(
      `INSERT INTO interview_invites (application_id, scheduled_at, location_or_link, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.applicationId, data.scheduledAt, data.locationOrLink, data.notes, data.createdBy]
    );
    return rows[0];
  },

  async findByApplication(applicationId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM interview_invites WHERE application_id = $1 ORDER BY scheduled_at DESC`,
      [applicationId]
    );
    return rows;
  },

  async findUpcoming(windowStart: Date, windowEnd: Date) {
    const { rows } = await pool.query(
      `SELECT i.*, a.job_id, a.applicant_id, j.title as job_title, ap.name as applicant_name
       FROM interview_invites i
       JOIN applications a ON i.application_id = a.id
       JOIN jobs j ON a.job_id = j.id
       JOIN users u ON a.applicant_id = u.id
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE i.scheduled_at >= $1 AND i.scheduled_at <= $2 AND i.status = 'scheduled'`,
      [windowStart, windowEnd]
    );
    return rows;
  },

  async updateStatus(id: string, status: string) {
    const { rows } = await pool.query(
      `UPDATE interview_invites SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return rows[0];
  }
};
