import pool from '../config/database';
import { PoolClient } from 'pg';

export interface CoachSession {
  id: string;
  student_id: string;
  title: string;
  mode: 'general' | 'resume_review' | 'interview_prep' | 'career_advice' | 'salary_negotiation';
  context_summary: string | null;
  context_updated_at: Date | null;
  uploaded_resume_name: string | null;
  uploaded_resume_text: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CoachMessage {
  id: string;
  session_id: string;
  sender: 'user' | 'ai';
  message_text: string;
  feedback: 'up' | 'down' | null;
  feedback_comment: string | null;
  created_at: Date;
}

export const CoachModel = {
  async createSession(
    studentId: string,
    title: string,
    mode: CoachSession['mode'],
    uploadedResumeName?: string | null,
    uploadedResumeText?: string | null
  ): Promise<CoachSession> {
    const { rows } = await pool.query(
      `INSERT INTO coach_sessions (student_id, title, mode, uploaded_resume_name, uploaded_resume_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [studentId, title, mode, uploadedResumeName || null, uploadedResumeText || null]
    );
    return rows[0];
  },

  async findSessionsByStudent(studentId: string): Promise<CoachSession[]> {
    const { rows } = await pool.query(
      `SELECT * FROM coach_sessions
       WHERE student_id = $1
       ORDER BY created_at DESC`,
      [studentId]
    );
    return rows;
  },

  async findSessionById(id: string): Promise<CoachSession | null> {
    const { rows } = await pool.query(
      `SELECT * FROM coach_sessions WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async updateSessionContext(
    sessionId: string,
    contextSummary: string
  ): Promise<CoachSession> {
    const { rows } = await pool.query(
      `UPDATE coach_sessions
       SET context_summary = $1, context_updated_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [contextSummary, sessionId]
    );
    return rows[0];
  },

  async createMessage(
    sessionId: string,
    sender: CoachMessage['sender'],
    messageText: string,
    client?: PoolClient
  ): Promise<CoachMessage> {
    const db = client ?? pool;
    const { rows } = await db.query(
      `INSERT INTO coach_messages (session_id, sender, message_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sessionId, sender, messageText]
    );
    return rows[0];
  },

  async updateMessageFeedback(
    messageId: string,
    feedback: 'up' | 'down',
    comment?: string
  ): Promise<CoachMessage | null> {
    const { rows } = await pool.query(
      `UPDATE coach_messages
       SET feedback = $1, feedback_comment = $2
       WHERE id = $3
       RETURNING *`,
      [feedback, comment || null, messageId]
    );
    return rows[0] || null;
  },

  async getMessagesBySessionId(sessionId: string): Promise<CoachMessage[]> {
    const { rows } = await pool.query(
      `SELECT * FROM coach_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return rows;
  },

  async countSessionMessages(sessionId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int as count FROM coach_messages WHERE session_id = $1`,
      [sessionId]
    );
    return rows[0].count;
  },

  async countSessionsByMode(studentId: string, mode: CoachSession['mode']): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int as count FROM coach_sessions WHERE student_id = $1 AND mode = $2`,
      [studentId, mode]
    );
    return rows[0].count;
  },

  async getLatestUpdateTimestamps(studentId: string): Promise<Date> {
    const { rows } = await pool.query(
      `SELECT GREATEST(
        (SELECT COALESCE(MAX(updated_at), '1970-01-01'::timestamptz) FROM applicant_profiles WHERE user_id = $1),
        (SELECT COALESCE(MAX(updated_at), '1970-01-01'::timestamptz) FROM resumes WHERE user_id = $1),
        (SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamptz) FROM applications WHERE applicant_id = $1),
        (SELECT COALESCE(MAX(updated_at), '1970-01-01'::timestamptz) FROM ai_interview_sessions WHERE student_id = $1),
        (SELECT COALESCE(MAX(last_updated_at), '1970-01-01'::timestamptz) FROM student_readiness_scores WHERE student_id = $1)
      ) as max_timestamp`,
      [studentId]
    );
    return rows[0].max_timestamp ? new Date(rows[0].max_timestamp) : new Date(0);
  }
};
