import pool from '../config/database';

export type InterviewStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface Interview {
  id: string;
  application_id: string;
  interviewer_id: string;
  candidate_id: string;
  status: InterviewStatus;
  code_content: string | null;
  code_language: string | null;
  notes: string | null;
  feedback: string | null;
  rating: number | null;
  scheduled_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
  company_name?: string;
  job_title?: string;
  candidate_name?: string;
  interviewer_name?: string;
  ai_interview_type?: string | null;
  ai_interview_rubric?: string | null;
  ai_interview_threshold?: number | null;
  proctoring_violations?: any[] | null;
}

export const INTERVIEW_SESSION_STATUSES = [
  'created',
  'questions_generated',
  'in_progress',
  'completed',
  'evaluated',
  'report_generated',
] as const;

export type InterviewSessionStatus = typeof INTERVIEW_SESSION_STATUSES[number];

export const INTERVIEW_QUESTION_CATEGORIES = [
  'behavioral',
  'situational',
  'technical',
] as const;

export type InterviewQuestionCategory = typeof INTERVIEW_QUESTION_CATEGORIES[number];

export const READINESS_TRENDS = ['improving', 'declining', 'stable'] as const;

export type ReadinessTrend = typeof READINESS_TRENDS[number];

export interface AiInterviewSession {
  id: string;
  job_id: string | null;
  student_id: string;
  session_type: 'text_async';
  mode: 'mock';
  role_title: string;
  job_description: string | null;
  status: InterviewSessionStatus;
  overall_score: number | null;
  rubric_scores: Record<string, unknown> | null;
  completed_at: Date | null;
  report_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InterviewQuestion {
  id: string;
  session_id: string;
  question_text: string;
  category: InterviewQuestionCategory;
  order_index: number;
  created_at: Date;
}

export interface InterviewResponse {
  id: string;
  question_id: string;
  session_id: string;
  student_id: string;
  response_text: string;
  ai_score: number | null;
  rubric_scores: Record<string, unknown> | null;
  ai_feedback: Record<string, unknown> | null;
  evaluated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface InterviewReport {
  id: string;
  session_id: string;
  student_id: string;
  job_id: string | null;
  overall_score: number;
  rubric_scores: Record<string, unknown>;
  summary_text: string;
  strengths: unknown[];
  weaknesses: unknown[];
  recommendations: unknown[];
  question_analysis: unknown[];
  report_url: string | null;
  generated_at: Date;
}

export interface StudentReadinessScore {
  student_id: string;
  current_score: number;
  trend: ReadinessTrend;
  last_interview_session_id: string | null;
  last_updated_at: Date;
  created_at: Date;
}

export interface ReadinessScoreHistory {
  id: string;
  student_id: string;
  session_id: string;
  previous_score: number | null;
  interview_score: number;
  new_score: number;
  trend: ReadinessTrend;
  created_at: Date;
}

export const INTERVIEW_SESSION_TRANSITIONS: Record<
  InterviewSessionStatus,
  readonly InterviewSessionStatus[]
 > = {
  created: ['questions_generated'],
  questions_generated: ['in_progress'],
  in_progress: ['completed'],
  completed: ['evaluated'],
  evaluated: ['report_generated'],
  report_generated: [],
};

export function canTransitionInterviewSession(
  from: InterviewSessionStatus,
  to: InterviewSessionStatus,
): boolean {
  return INTERVIEW_SESSION_TRANSITIONS[from].includes(to);
}

export const InterviewModel = {
  // Live Interviews
  async createInterview(data: {
    application_id: string;
    interviewer_id: string;
    candidate_id: string;
    scheduled_at: Date;
  }): Promise<Interview> {
    const { rows } = await pool.query(
      `INSERT INTO interviews (application_id, interviewer_id, candidate_id, scheduled_at, status)
       VALUES ($1, $2, $3, $4, 'scheduled')
       RETURNING *`,
      [data.application_id, data.interviewer_id, data.candidate_id, data.scheduled_at],
    );
    return rows[0];
  },

  async getById(id: string): Promise<Interview | null> {
    const { rows } = await pool.query(
      `SELECT i.*, 
              j.title as job_title, 
              j.company_name,
              j.ai_interview_type,
              j.ai_interview_rubric,
              j.ai_interview_threshold,
              ap.name as candidate_name,
              rp.name as interviewer_name
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = i.candidate_id
       LEFT JOIN recruiter_profiles rp ON rp.user_id = i.interviewer_id
       WHERE i.id = $1
       LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  async getByApplicationId(applicationId: string): Promise<Interview[]> {
    const { rows } = await pool.query(
      `SELECT i.*, 
              j.title as job_title, 
              j.company_name
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE i.application_id = $1
       ORDER BY i.created_at DESC`,
      [applicationId],
    );
    return rows;
  },

  async updateInterview(id: string, data: Partial<Interview>): Promise<Interview> {
    const fields: string[] = [];
    const values: any[] = [];
    let placeholderIndex = 1;

    // Filter fields to avoid raw SQL syntax issues
    const fieldsToUpdate = [
      'status',
      'code_content',
      'code_language',
      'notes',
      'feedback',
      'rating',
      'started_at',
      'ended_at',
      'proctoring_violations',
    ];

    for (const key of fieldsToUpdate) {
      if (data[key as keyof Partial<Interview>] !== undefined) {
        fields.push(`${key} = $${placeholderIndex}`);
        values.push(data[key as keyof Partial<Interview>]);
        placeholderIndex++;
      }
    }

    if (fields.length === 0) {
      const { rows } = await pool.query(`SELECT * FROM interviews WHERE id = $1`, [id]);
      return rows[0];
    }

    // Always update the updated_at timestamp
    fields.push(`updated_at = NOW()`);

    values.push(id);
    const queryStr = `UPDATE interviews SET ${fields.join(', ')} WHERE id = $${placeholderIndex} RETURNING *`;
    
    const { rows } = await pool.query(queryStr, values);
    return rows[0];
  },

  async listUserInterviews(userId: string, role: string): Promise<Interview[]> {
    let queryStr = '';
    let params: any[] = [];

    if (role === 'admin') {
      queryStr = `
        SELECT i.*, 
               j.title as job_title, 
               j.company_name,
               ap.name as candidate_name,
               rp.name as interviewer_name
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN applicant_profiles ap ON ap.user_id = i.candidate_id
        LEFT JOIN recruiter_profiles rp ON rp.user_id = i.interviewer_id
        ORDER BY i.scheduled_at DESC`;
    } else if (role === 'recruiter') {
      queryStr = `
        SELECT i.*, 
               j.title as job_title, 
               j.company_name,
               ap.name as candidate_name,
               rp.name as interviewer_name
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN applicant_profiles ap ON ap.user_id = i.candidate_id
        LEFT JOIN recruiter_profiles rp ON rp.user_id = i.interviewer_id
        WHERE i.interviewer_id = $1
        ORDER BY i.scheduled_at DESC`;
      params = [userId];
    } else {
      // applicant
      queryStr = `
        SELECT i.*, 
               j.title as job_title, 
               j.company_name,
               ap.name as candidate_name,
               rp.name as interviewer_name
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN applicant_profiles ap ON ap.user_id = i.candidate_id
        LEFT JOIN recruiter_profiles rp ON rp.user_id = i.interviewer_id
        WHERE i.candidate_id = $1
        ORDER BY i.scheduled_at DESC`;
      params = [userId];
    }

    const { rows } = await pool.query(queryStr, params);
    return rows;
  },

  async isParticipant(interviewId: string, userId: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM interviews 
       WHERE id = $1 AND (candidate_id = $2 OR interviewer_id = $3)
       LIMIT 1`,
      [interviewId, userId, userId],
    );
    return rows.length > 0;
  },

  // Sessions
  async createSession(data: {
    job_id: string | null;
    student_id: string;
    session_type?: 'text_async';
    mode?: 'mock';
    role_title: string;
    job_description?: string | null;
  }): Promise<AiInterviewSession> {
    const { rows } = await pool.query(
      `INSERT INTO ai_interview_sessions (job_id, student_id, session_type, mode, role_title, job_description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.job_id || null,
        data.student_id,
        data.session_type || 'text_async',
        data.mode || 'mock',
        data.role_title,
        data.job_description || null,
      ],
    );
    return rows[0];
  },

  async findSessionById(id: string): Promise<AiInterviewSession | null> {
    const { rows } = await pool.query('SELECT * FROM ai_interview_sessions WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findSessionsByStudent(studentId: string): Promise<AiInterviewSession[]> {
    const { rows } = await pool.query(
      'SELECT * FROM ai_interview_sessions WHERE student_id = $1 ORDER BY created_at DESC',
      [studentId]
    );
    return rows;
  },

  async updateSession(
    id: string,
    data: Partial<Pick<AiInterviewSession, 'status' | 'overall_score' | 'rubric_scores' | 'completed_at' | 'report_url'>>,
  ): Promise<AiInterviewSession> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = $${idx}`);
      params.push(value === undefined ? null : value);
      idx++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE ai_interview_sessions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params,
    );
    return rows[0];
  },

  // Questions
  async createQuestion(data: {
    session_id: string;
    question_text: string;
    category: InterviewQuestionCategory;
    order_index: number;
  }): Promise<InterviewQuestion> {
    const { rows } = await pool.query(
      `INSERT INTO interview_questions (session_id, question_text, category, order_index)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.session_id, data.question_text, data.category, data.order_index],
    );
    return rows[0];
  },

  async findQuestionsBySessionId(sessionId: string): Promise<InterviewQuestion[]> {
    const { rows } = await pool.query(
      'SELECT * FROM interview_questions WHERE session_id = $1 ORDER BY order_index ASC',
      [sessionId],
    );
    return rows;
  },

  // Responses
  async createOrUpdateResponse(data: {
    question_id: string;
    session_id: string;
    student_id: string;
    response_text: string;
    ai_score?: number | null;
    rubric_scores?: Record<string, unknown> | null;
    ai_feedback?: Record<string, unknown> | null;
    evaluated_at?: Date | null;
  }): Promise<InterviewResponse> {
    const { rows } = await pool.query(
      `INSERT INTO interview_responses (question_id, session_id, student_id, response_text, ai_score, rubric_scores, ai_feedback, evaluated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (session_id, question_id, student_id)
       DO UPDATE SET response_text = EXCLUDED.response_text,
                     ai_score = EXCLUDED.ai_score,
                     rubric_scores = EXCLUDED.rubric_scores,
                     ai_feedback = EXCLUDED.ai_feedback,
                     evaluated_at = EXCLUDED.evaluated_at,
                     updated_at = NOW()
       RETURNING *`,
      [
        data.question_id,
        data.session_id,
        data.student_id,
        data.response_text,
        data.ai_score ?? null,
        data.rubric_scores ? JSON.stringify(data.rubric_scores) : null,
        data.ai_feedback ? JSON.stringify(data.ai_feedback) : null,
        data.evaluated_at || null,
      ],
    );
    return rows[0];
  },

  async findResponsesBySessionId(sessionId: string): Promise<InterviewResponse[]> {
    const { rows } = await pool.query('SELECT * FROM interview_responses WHERE session_id = $1', [sessionId]);
    return rows;
  },

  async findResponseByQuestion(sessionId: string, questionId: string, studentId: string): Promise<InterviewResponse | null> {
    const { rows } = await pool.query(
      'SELECT * FROM interview_responses WHERE session_id = $1 AND question_id = $2 AND student_id = $3',
      [sessionId, questionId, studentId],
    );
    return rows[0] || null;
  },

  // Reports
  async createReport(data: {
    session_id: string;
    student_id: string;
    job_id: string | null;
    overall_score: number;
    rubric_scores: Record<string, unknown>;
    summary_text: string;
    strengths?: unknown[];
    weaknesses?: unknown[];
    recommendations?: unknown[];
    question_analysis?: unknown[];
    report_url?: string | null;
  }): Promise<InterviewReport> {
    const { rows } = await pool.query(
      `INSERT INTO interview_reports (session_id, student_id, job_id, overall_score, rubric_scores, summary_text, strengths, weaknesses, recommendations, question_analysis, report_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        data.session_id,
        data.student_id,
        data.job_id || null,
        data.overall_score,
        JSON.stringify(data.rubric_scores),
        data.summary_text,
        data.strengths ? JSON.stringify(data.strengths) : '[]',
        data.weaknesses ? JSON.stringify(data.weaknesses) : '[]',
        data.recommendations ? JSON.stringify(data.recommendations) : '[]',
        data.question_analysis ? JSON.stringify(data.question_analysis) : '[]',
        data.report_url || null,
      ],
    );
    return rows[0];
  },

  async findReportBySessionId(sessionId: string): Promise<InterviewReport | null> {
    const { rows } = await pool.query('SELECT * FROM interview_reports WHERE session_id = $1', [sessionId]);
    return rows[0] || null;
  },

  // Readiness Scores
  async findReadinessScore(studentId: string): Promise<StudentReadinessScore | null> {
    const { rows } = await pool.query('SELECT * FROM student_readiness_scores WHERE student_id = $1', [studentId]);
    return rows[0] || null;
  },

  async updateReadinessScore(
    studentId: string,
    score: number,
    trend: ReadinessTrend,
    lastSessionId: string | null,
  ): Promise<StudentReadinessScore> {
    const { rows } = await pool.query(
      `INSERT INTO student_readiness_scores (student_id, current_score, trend, last_interview_session_id, last_updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (student_id)
       DO UPDATE SET current_score = EXCLUDED.current_score,
                     trend = EXCLUDED.trend,
                     last_interview_session_id = EXCLUDED.last_interview_session_id,
                     last_updated_at = NOW()
       RETURNING *`,
      [studentId, score, trend, lastSessionId || null],
    );
    return rows[0];
  },

  // Readiness Score History
  async createReadinessHistory(data: {
    student_id: string;
    session_id: string;
    previous_score: number | null;
    interview_score: number;
    new_score: number;
    trend: ReadinessTrend;
  }): Promise<ReadinessScoreHistory> {
    const { rows } = await pool.query(
      `INSERT INTO readiness_score_history (student_id, session_id, previous_score, interview_score, new_score, trend)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.student_id, data.session_id, data.previous_score, data.interview_score, data.new_score, data.trend],
    );
    return rows[0];
  },

  async findReadinessHistory(studentId: string): Promise<ReadinessScoreHistory[]> {
    const { rows } = await pool.query(
      'SELECT * FROM readiness_score_history WHERE student_id = $1 ORDER BY created_at DESC',
      [studentId],
    );
    return rows;
  },
};
