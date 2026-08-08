import {
  InterviewModel,
  Interview,
  InterviewStatus,
  canTransitionInterviewSession,
  AiInterviewSession,
  InterviewQuestion,
  InterviewResponse,
  InterviewReport,
  StudentReadinessScore,
  InterviewSessionStatus,
} from '../models/interview.model';
import { ApplicationModel } from '../models/application.model';
import { UserModel } from '../models/user.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { forbidden, notFound, badRequest, AppError } from '../utils/appError';
import axios from 'axios';
import { Queue } from 'bullmq';
import { NotificationOrchestrator } from './notification/orchestrator';

// We just typecast to avoid importing the actual queue if it's missing in this file
import { getBulkInterviewQueue } from '../config/queue';
import { AIService } from './ai.service';
import { PromptTemplatesService } from './promptTemplates.service';
import { ReportGeneratorService } from './reportGenerator.service';
import { aiConfig } from '../config/ai.config';
import pool from '../config/database';
import { JwtPayload } from '../types';
import Groq, { toFile } from 'groq-sdk';
import { io } from '../config/socket';

export interface LiveSessionState {
  code: string;
  language: string;
  notes: string;
  participants: Set<string>; // active userIds in the room
}

// In-memory store for active session states (could be replaced by Redis in production)
const activeSessions = new Map<string, LiveSessionState>();

const LOG_PREFIX = '[InterviewService]';

export const InterviewService = {
  // --- Live Interviews ---
  async scheduleInterview(
    applicationId: string,
    scheduledAt: Date,
    requester: JwtPayload,
  ): Promise<Interview> {
    // 1. Fetch application details
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application not found', 'APPLICATION_NOT_FOUND');
    }

    // 2. Authorize requester
    if (requester.role === 'recruiter') {
      // Find full application details to verify recruiter owns the job
      const recApplication = await ApplicationModel.findRecruiterApplicationById(
        requester.userId,
        applicationId,
      );
      if (!recApplication) {
        throw new ForbiddenError(
          'You are not authorized to schedule an interview for this application',
          'RECRUITER_FORBIDDEN',
        );
      }
    } else if (requester.role !== 'admin') {
      throw new ForbiddenError('Only recruiters and admins can schedule interviews', 'ROLE_FORBIDDEN');
    }

    // 3. Check scheduled date
    if (new Date(scheduledAt).getTime() < Date.now()) {
      throw new BadRequestError('Scheduled date must be in the future', 'INVALID_SCHEDULED_DATE');
    }

    // 4. Create interview record
    const interview = await InterviewModel.createInterview({
      application_id: applicationId,
      interviewer_id: requester.userId,
      candidate_id: application.applicant_id,
      scheduled_at: new Date(scheduledAt),
    });

    return interview;
  },

  async getInterviewDetails(interviewId: string, user: JwtPayload): Promise<Interview> {
    const interview = await InterviewModel.getById(interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found', 'INTERVIEW_NOT_FOUND');
    }

    // Authorize participant
    const isParticipant =
      interview.candidate_id === user.userId || interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to view this interview',
        'NOT_INTERVIEW_PARTICIPANT',
      );
    }

    return interview;
  },

  async listUserInterviews(user: JwtPayload): Promise<Interview[]> {
    return InterviewModel.listUserInterviews(user.userId, user.role);
  },

  async updateNotes(interviewId: string, notes: string, user: JwtPayload): Promise<Interview> {
    const interview = await this.getInterviewDetails(interviewId, user);
    
    // Only interviewer or admin can update notes
    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'Only the interviewer or admin can update interview notes',
        'NOT_THE_INTERVIEWER',
      );
    }

    // Sync to in-memory session if live
    const liveSession = activeSessions.get(interviewId);
    if (liveSession) {
      liveSession.notes = notes;
    }

    // Sync to database
    const updated = await InterviewModel.updateInterview(interviewId, { notes });
    return updated;
  },

  async startInterview(interviewId: string, user: JwtPayload): Promise<Interview> {
    const interview = await this.getInterviewDetails(interviewId, user);

    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'Only the interviewer or admin can start the interview',
        'NOT_THE_INTERVIEWER',
      );
    }

    if (interview.status === 'completed' || interview.status === 'cancelled') {
      throw new BadRequestError(
        `Cannot start an interview that is already ${interview.status}`,
        'INVALID_STATUS_TRANSITION',
      );
    }

    // Initialize in-memory live state if it doesn't exist yet
    let liveState = activeSessions.get(interviewId);
    if (!liveState) {
      activeSessions.set(interviewId, {
        code: interview.code_content || '// Live coding playground\n',
        language: interview.code_language || 'javascript',
        notes: interview.notes || '',
        participants: new Set(),
      });
    }

    // Update status in DB
    const updated = await InterviewModel.updateInterview(interviewId, {
      status: 'live',
      started_at: interview.started_at || new Date(),
    });

    return updated;
  },

  async endInterview(
    interviewId: string,
    data: { feedback?: string; rating?: number; codeContent?: string; language?: string },
    user: JwtPayload,
  ): Promise<Interview> {
    const interview = await this.getInterviewDetails(interviewId, user);

    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'Only the interviewer or admin can end the interview',
        'NOT_THE_INTERVIEWER',
      );
    }

    // Pull current live state from memory if available
    const liveState = activeSessions.get(interviewId);
    const finalCode = data.codeContent !== undefined ? data.codeContent : (liveState?.code || interview.code_content);
    const finalLanguage = data.language !== undefined ? data.language : (liveState?.language || interview.code_language);
    const finalNotes = liveState?.notes || interview.notes;

    // Update interview status and save the session snapshot to the database
    const updated = await InterviewModel.updateInterview(interviewId, {
      status: 'completed',
      ended_at: new Date(),
      code_content: finalCode,
      code_language: finalLanguage,
      notes: finalNotes,
      feedback: data.feedback !== undefined ? data.feedback : interview.feedback,
      rating: data.rating !== undefined ? data.rating : interview.rating,
    });

    // Clean up active session
    activeSessions.delete(interviewId);

    // Notify candidate that their interview result / feedback is available
    if (data.feedback || data.rating !== undefined) {
      setImmediate(() => {
        NotificationOrchestrator.dispatch(
          interview.candidate_id,
          'application_status',
          {
            title: 'Interview Feedback Available',
            body: `Your interviewer has submitted feedback for your recent interview. Check your results.`,
            action_url: `/interviews-history`,
            is_recruiter: false,
          },
          `interview_result:${interviewId}`
        ).catch(err => console.error('[InterviewService] Failed to dispatch interview_result:', err));
      });
    }

    return updated;
  },

  // --- Live WebSocket Session State Methods ---
  getLiveSession(interviewId: string): LiveSessionState | null {
    return activeSessions.get(interviewId) || null;
  },

  initializeLiveSession(interviewId: string, initialCode = '', initialLanguage = 'javascript', initialNotes = ''): LiveSessionState {
    let session = activeSessions.get(interviewId);
    if (!session) {
      session = {
        code: initialCode || '// Live coding playground\n',
        language: initialLanguage || 'javascript',
        notes: initialNotes || '',
        participants: new Set(),
      };
      activeSessions.set(interviewId, session);
    }
    return session;
  },

  updateLiveCode(interviewId: string, code: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.code = code;
    }
  },

  updateLiveLanguage(interviewId: string, language: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.language = language;
    }
  },

  addParticipant(interviewId: string, userId: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.participants.add(userId);
    }
  },

  removeParticipant(interviewId: string, userId: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.participants.delete(userId);
    }
  },

  // --- AI Mock Interviews (Sessions) ---
  /**
   * Helper to assert student exists and is not banned
   */
  async _assertActiveStudent(studentId: string): Promise<void> {
    const student = await UserModel.findById(studentId);
    if (!student) {
      throw notFound('Student');
    }
    if (student.banned_at) {
      throw forbidden('Student account is banned');
    }
  },

  /**
   * Helper to fetch a session and assert ownership
   */
  async _getAndAssertSessionOwnership(studentId: string, sessionId: string): Promise<AiInterviewSession> {
    const session = await InterviewModel.findSessionById(sessionId);
    if (!session) {
      throw notFound('Interview session');
    }
    if (session.student_id !== studentId) {
      throw forbidden('Forbidden: You do not own this session');
    }
    return session;
  },

  /**
   * Helper to perform validated status transition
   */
  async _transitionSessionStatus(
    session: AiInterviewSession,
    targetStatus: InterviewSessionStatus,
    updates: Partial<Pick<AiInterviewSession, 'overall_score' | 'rubric_scores' | 'completed_at' | 'report_url'>> = {},
  ): Promise<AiInterviewSession> {
    if (!canTransitionInterviewSession(session.status, targetStatus)) {
      throw badRequest(`Invalid status transition from '${session.status}' to '${targetStatus}'`);
    }

    // SESSION RULES: A session may NOT transition: created -> questions_generated
    // unless valid interview questions have been generated and stored.
    if (targetStatus === 'questions_generated') {
      const questions = await InterviewModel.findQuestionsBySessionId(session.id);
      if (!questions || questions.length === 0) {
        throw badRequest("Cannot transition to 'questions_generated' because no questions have been stored for this session");
      }
    }

    console.log(`${LOG_PREFIX} Transitioning session ${session.id} from '${session.status}' to '${targetStatus}'`);
    return InterviewModel.updateSession(session.id, {
      status: targetStatus,
      ...updates,
    });
  },

  /**
   * Helper to generate interview questions using Claude
   */
  async generateQuestions(
    roleTitle: string,
    jobDescription: string | null,
    questionCount: number,
  ): Promise<{ questionText: string; category: 'technical' | 'behavioral' | 'situational'; expectedTopics: string[] }[]> {
    const templateName = 'interview_session_questions';
    const variables = {
      roleTitle,
      jobDescription: jobDescription || 'Not specified',
      questionCount,
    };

    const prompt = await PromptTemplatesService.renderTemplate(templateName, variables);

    const validateSchema = (parsed: any): boolean => {
      if (!parsed || typeof parsed !== 'object') return false;
      if (!Array.isArray(parsed.questions)) return false;
      if (parsed.questions.length !== questionCount) return false;
      for (const q of parsed.questions) {
        if (!q || typeof q !== 'object') return false;
        if (typeof q.questionText !== 'string' || !q.questionText.trim()) return false;
        if (!['technical', 'behavioral', 'situational'].includes(q.category)) return false;
        if (!Array.isArray(q.expectedTopics)) return false;
        for (const topic of q.expectedTopics) {
          if (typeof topic !== 'string' || !topic.trim()) return false;
        }
      }
      return true;
    };

    let attempts = 0;
    const maxAttempts = 2; // Initial attempt + 1 retry

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const responseText = await AIService.generateText(prompt, { provider: 'claude', module: 'interview' });
        if (!responseText) {
          throw new Error('AI Service returned empty response');
        }
        // Strip markdown backticks if any
        let cleanText = responseText.trim();
        if (cleanText.startsWith('```')) {
          const lines = cleanText.split('\n');
          if (lines[0].startsWith('```json')) {
            lines.shift();
          } else {
            lines.shift();
          }
          if (lines[lines.length - 1] === '```') {
            lines.pop();
          }
          cleanText = lines.join('\n').trim();
        }

        const parsed = JSON.parse(cleanText);
        if (validateSchema(parsed)) {
          return parsed.questions;
        }
        console.warn(`${LOG_PREFIX} Invalid schema response on attempt ${attempts}. Response: ${cleanText}`);
      } catch (err: any) {
        console.error(`${LOG_PREFIX} Error generating questions on attempt ${attempts}: ${err.message}`);
      }
    }

    throw new AppError('Failed to generate valid mock interview questions from AI service after retries', 500, 'AI_GENERATION_FAILED');
  },

  /**
   * Start a new mock interview session: create record and generate questions
   */
  async createSession(
    studentId: string,
    roleTitle: string,
    jobDescription: string | null = null,
    jobId: string | null = null,
    questionCount = 5,
  ): Promise<AiInterviewSession> {
    await this._assertActiveStudent(studentId);

    // 1. Create session record in 'created' status
    let session = await InterviewModel.createSession({
      job_id: jobId,
      student_id: studentId,
      session_type: 'text_async',
      mode: 'mock',
      role_title: roleTitle,
      job_description: jobDescription,
    });

    try {
      // 2. Generate questions from Claude
      const questionsData = await this.generateQuestions(roleTitle, jobDescription, questionCount);

      // 3. Save questions
      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        await InterviewModel.createQuestion({
          session_id: session.id,
          question_text: q.questionText,
          category: q.category,
          order_index: i + 1,
        });
      }

      // 4. Transition to 'questions_generated'
      session = await this._transitionSessionStatus(session, 'questions_generated');
    } catch (err) {
      // Clean up session if question generation failed
      console.error(`${LOG_PREFIX} Failed to setup session, rolling back:`, err);
      // Wait, let's just update status to failed or let client retry. We throw the error so client knows.
      throw err;
    }

    return session;
  },

  /**
   * List all mock interview sessions for a student
   */
  async listSessions(studentId: string): Promise<AiInterviewSession[]> {
    await this._assertActiveStudent(studentId);
    return InterviewModel.findSessionsByStudent(studentId);
  },

  /**
   * Get session details
   */
  async getSession(studentId: string, sessionId: string): Promise<AiInterviewSession> {
    await this._assertActiveStudent(studentId);
    return this._getAndAssertSessionOwnership(studentId, sessionId);
  },

  /**
   * Submit student's response to a question
   */
  async submitResponse(
    studentId: string,
    sessionId: string,
    questionId: string,
    responseText: string,
  ): Promise<InterviewResponse> {
    await this._assertActiveStudent(studentId);
    let session = await this._getAndAssertSessionOwnership(studentId, sessionId);

    // Assert session status
    if (session.status !== 'questions_generated' && session.status !== 'in_progress') {
      throw badRequest(`Cannot submit response for session in '${session.status}' status`);
    }

    // Assert question exists and belongs to this session
    const questions = await InterviewModel.findQuestionsBySessionId(sessionId);
    const question = questions.find((q) => q.id === questionId);
    if (!question) {
      throw notFound('Interview question');
    }

    // 1. Transition session status to 'in_progress' on first answer
    if (session.status === 'questions_generated') {
      session = await this._transitionSessionStatus(session, 'in_progress');
    }

    // 2. Evaluate answer using Claude API
    const templateName = 'interview_response_evaluation';
    const variables = {
      roleTitle: session.role_title,
      jobDescription: session.job_description || 'Not specified',
      questionText: question.question_text,
      responseText,
    };

    const prompt = await PromptTemplatesService.renderTemplate(templateName, variables);

    const validateEvaluationSchema = (parsed: any): boolean => {
      if (!parsed || typeof parsed !== 'object') return false;
      if (typeof parsed.overallScore !== 'number' || parsed.overallScore < 0 || parsed.overallScore > 100) return false;
      if (!parsed.rubricScores || typeof parsed.rubricScores !== 'object') return false;
      if (!parsed.feedback || typeof parsed.feedback !== 'object') return false;
      return true;
    };

    let evaluatedResponse: any = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const evalText = await AIService.generateText(prompt, { provider: 'claude', module: 'interview' });
        if (!evalText) {
          throw new Error('AI Service returned empty response');
        }
        let cleanText = evalText.trim();
        if (cleanText.startsWith('```')) {
          const lines = cleanText.split('\n');
          if (lines[0].startsWith('```json')) {
            lines.shift();
          } else {
            lines.shift();
          }
          if (lines[lines.length - 1] === '```') {
            lines.pop();
          }
          cleanText = lines.join('\n').trim();
        }

        const parsed = JSON.parse(cleanText);
        if (validateEvaluationSchema(parsed)) {
          evaluatedResponse = parsed;
          break;
        }
        console.warn(`${LOG_PREFIX} Invalid evaluation response schema on attempt ${attempts}`);
      } catch (err: any) {
        console.error(`${LOG_PREFIX} Error evaluating response on attempt ${attempts}: ${err.message}`);
      }
    }

    if (!evaluatedResponse) {
      throw new AppError('Failed to evaluate answer response from AI evaluation service', 500, 'AI_EVALUATION_FAILED');
    }

    // 3. Save evaluated response
    const response = await InterviewModel.createOrUpdateResponse({
      question_id: questionId,
      session_id: sessionId,
      student_id: studentId,
      response_text: responseText,
      ai_score: evaluatedResponse.overallScore,
      rubric_scores: evaluatedResponse.rubricScores,
      ai_feedback: evaluatedResponse.feedback,
      evaluated_at: new Date(),
    });

    return response;
  },

  /**
   * Complete mock interview session, triggering score aggregation, readiness update, and report generation
   */
  async completeSession(studentId: string, sessionId: string): Promise<AiInterviewSession> {
    await this._assertActiveStudent(studentId);
    let session = await this._getAndAssertSessionOwnership(studentId, sessionId);

    if (session.status !== 'in_progress') {
      throw badRequest(`Cannot complete session in '${session.status}' status`);
    }

    // Assert all questions have responses
    const questions = await InterviewModel.findQuestionsBySessionId(sessionId);
    const responses = await InterviewModel.findResponsesBySessionId(sessionId);

    if (responses.length < questions.length) {
      throw badRequest(`Cannot complete session: only ${responses.length} out of ${questions.length} questions answered`);
    }

    // 1. Transition status to 'completed'
    session = await this._transitionSessionStatus(session, 'completed');

    // 2. Aggregate scores
    const totalScore = responses.reduce((acc, r) => acc + (r.ai_score || 0), 0);
    const averageOverallScore = Math.round(totalScore / responses.length);

    // Aggregate rubrics
    const rubricSum: Record<string, number> = {};
    const rubricCount: Record<string, number> = {};
    for (const r of responses) {
      const rubrics = (r.rubric_scores || {}) as Record<string, unknown>;
      for (const [key, val] of Object.entries(rubrics)) {
        if (typeof val === 'number') {
          rubricSum[key] = (rubricSum[key] || 0) + val;
          rubricCount[key] = (rubricCount[key] || 0) + 1;
        }
      }
    }

    const averageRubrics: Record<string, number> = {};
    for (const key of Object.keys(rubricSum)) {
      averageRubrics[key] = Math.round(rubricSum[key] / rubricCount[key]);
    }

    // Save aggregated scores to session
    session = await InterviewModel.updateSession(session.id, {
      overall_score: averageOverallScore,
      rubric_scores: averageRubrics,
      completed_at: new Date(),
    });

    // Transition session status to 'evaluated'
    session = await this._transitionSessionStatus(session, 'evaluated', {
      overall_score: averageOverallScore,
      rubric_scores: averageRubrics,
      completed_at: session.completed_at,
    });

    // 3. Update student's readiness score
    const currentReadiness = await InterviewModel.findReadinessScore(studentId);
    const previousScore = currentReadiness ? currentReadiness.current_score : null;

    let newScore = averageOverallScore;
    if (previousScore !== null) {
      // Exponential moving average: 30% weight to new interview, 70% to history
      newScore = Math.round(previousScore * 0.7 + averageOverallScore * 0.3);
    }

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (previousScore !== null) {
      const diff = newScore - previousScore;
      if (diff > 2) trend = 'improving';
      else if (diff < -2) trend = 'declining';
    }

    await InterviewModel.updateReadinessScore(studentId, newScore, trend, sessionId);

    // Record readiness score history log
    await InterviewModel.createReadinessHistory({
      student_id: studentId,
      session_id: sessionId,
      previous_score: previousScore,
      interview_score: averageOverallScore,
      new_score: newScore,
      trend,
    });

    // 4. Generate overall evaluation report text using Claude
    const templateName = 'interview_report_generation';
    const variables = {
      roleTitle: session.role_title,
      jobDescription: session.job_description || 'Not specified',
      overallScore: averageOverallScore,
      rubricScoresJson: JSON.stringify(averageRubrics),
      qasJson: JSON.stringify(
        questions.map((q) => {
          const resp = responses.find((r) => r.question_id === q.id);
          return {
            questionText: q.question_text,
            responseText: resp?.response_text || '',
            score: resp?.ai_score || 0,
            feedback: resp?.ai_feedback || {},
          };
        }),
      ),
    };

    const prompt = await PromptTemplatesService.renderTemplate(templateName, variables);

    const validateReportTextSchema = (parsed: any): boolean => {
      if (!parsed || typeof parsed !== 'object') return false;
      if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) return false;
      if (!Array.isArray(parsed.strengths)) return false;
      if (!Array.isArray(parsed.weaknesses)) return false;
      if (!Array.isArray(parsed.recommendations)) return false;
      return true;
    };

    let reportTextData: any = null;
    let evalAttempts = 0;
    const maxEvalAttempts = 2;

    while (evalAttempts < maxEvalAttempts) {
      evalAttempts++;
      try {
        const responseText = await AIService.generateText(prompt, { provider: 'claude', module: 'interview' });
        if (!responseText) {
          throw new Error('AI Service returned empty response');
        }
        let cleanText = responseText.trim();
        if (cleanText.startsWith('```')) {
          const lines = cleanText.split('\n');
          if (lines[0].startsWith('```json')) {
            lines.shift();
          } else {
            lines.shift();
          }
          if (lines[lines.length - 1] === '```') {
            lines.pop();
          }
          cleanText = lines.join('\n').trim();
        }

        const parsed = JSON.parse(cleanText);
        if (validateReportTextSchema(parsed)) {
          reportTextData = parsed;
          break;
        }
        console.warn(`${LOG_PREFIX} Invalid report response schema on attempt ${evalAttempts}`);
      } catch (err: any) {
        console.error(`${LOG_PREFIX} Error generating report text on attempt ${evalAttempts}: ${err.message}`);
      }
    }

    if (!reportTextData) {
      throw new AppError('Failed to generate interview report from AI evaluation service', 500, 'AI_REPORT_FAILED');
    }

    const summaryText = reportTextData.summary;
    const strengths = reportTextData.strengths;
    const weaknesses = reportTextData.weaknesses;
    const recommendations = reportTextData.recommendations;

    // Construct question analysis data for report schema
    const questionAnalysis = questions.map((q) => {
      const resp = responses.find((r) => r.question_id === q.id);
      return {
        question_id: q.id,
        question_text: q.question_text,
        category: q.category,
        response_text: resp?.response_text || '',
        ai_score: resp?.ai_score || null,
        rubric_scores: resp?.rubric_scores || null,
        ai_feedback: resp?.ai_feedback || null,
      };
    });

    // 5. Generate and upload PDF report via Puppeteer
    let reportUrl: string | null = null;
    try {
      reportUrl = await ReportGeneratorService.generatePdfReport(
        session,
        questions,
        responses,
        summaryText,
        strengths,
        weaknesses,
        recommendations,
      );
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to generate PDF report:`, err);
    }

    // Save report in interview_reports
    await InterviewModel.createReport({
      session_id: sessionId,
      student_id: studentId,
      job_id: session.job_id,
      overall_score: averageOverallScore,
      rubric_scores: averageRubrics,
      summary_text: summaryText,
      strengths,
      weaknesses,
      recommendations,
      question_analysis: questionAnalysis,
      report_url: reportUrl,
    });

    // Transition session to 'report_generated' and set report_url
    session = await this._transitionSessionStatus(session, 'report_generated', {
      report_url: reportUrl,
    });

    return session;
  },

  /**
   * Retrieve session evaluation report
   */
  async getReport(studentId: string, sessionId: string): Promise<InterviewReport> {
    await this._assertActiveStudent(studentId);
    await this._getAndAssertSessionOwnership(studentId, sessionId);

    const report = await InterviewModel.findReportBySessionId(sessionId);
    if (!report) {
      throw notFound('Report not generated yet for this session');
    }

    return report;
  },

  /**
   * Fetch latest readiness score tracking
   */
  async getReadinessScore(studentId: string): Promise<StudentReadinessScore | null> {
    await this._assertActiveStudent(studentId);
    return InterviewModel.findReadinessScore(studentId);
  },

  async transcribeAudio(
    interviewId: string,
    audioBuffer: Buffer,
    originalName: string,
    user: JwtPayload,
  ): Promise<string> {
    const interview = await InterviewModel.getById(interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found', 'INTERVIEW_NOT_FOUND');
    }

    const isCandidate = interview.candidate_id === user.userId;
    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isCandidate && !isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to participate in this interview',
        'NOT_INTERVIEW_PARTICIPANT',
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new BadRequestError('Groq API Key is not configured in environment', 'GROQ_NOT_CONFIGURED');
    }

    console.log(`[Whisper STT] Transcribing file for interview: ${interviewId}, size: ${audioBuffer.length} bytes`);
    const groq = new Groq({ apiKey: groqApiKey });
    const file = await toFile(audioBuffer, originalName || 'audio.webm');

    const response = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      temperature: 0,
    });

    const text = response.text || '';
    if (text.trim()) {
      io?.to(`interview:${interviewId}`).emit('voice_transcription', {
        userId: user.userId,
        role: user.role,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    return text.trim();
  },

  async generateTTS(interviewId: string, text: string, user: JwtPayload): Promise<Buffer> {
    const interview = await InterviewModel.getById(interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found', 'INTERVIEW_NOT_FOUND');
    }

    const isCandidate = interview.candidate_id === user.userId;
    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isCandidate && !isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to participate in this interview',
        'NOT_INTERVIEW_PARTICIPANT',
      );
    }

    const trimmedText = (text || '').trim();
    if (!trimmedText) {
      throw new BadRequestError('Text prompt is required for TTS synthesis', 'TEXT_REQUIRED');
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    // 1. OpenAI TTS
    if (openaiApiKey && openaiApiKey.trim()) {
      try {
        console.log('[OpenAI TTS] Generating speech...');
        const response = await axios.post(
          'https://api.openai.com/v1/audio/speech',
          {
            model: 'tts-1',
            input: trimmedText,
            voice: 'alloy',
          },
          {
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 10000,
          },
        );
        return Buffer.from(response.data);
      } catch (err: any) {
        console.error('[OpenAI TTS] Failed:', err.message);
      }
    }

    // 2. ElevenLabs TTS
    if (elevenlabsApiKey && elevenlabsApiKey.trim()) {
      try {
        console.log('[ElevenLabs TTS] Generating speech...');
        const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
        const response = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            text: trimmedText,
            model_id: 'eleven_monolingual_v1',
          },
          {
            headers: {
              'xi-api-key': elevenlabsApiKey,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 10000,
          },
        );
        return Buffer.from(response.data);
      } catch (err: any) {
        console.error('[ElevenLabs TTS] Failed:', err.message);
      }
    }

    // 3. Free Public Fallback: Google Translate TTS
    try {
      console.log('[Google Translate TTS] Generating fallback speech...');
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(trimmedText)}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        timeout: 10000,
      });
      return Buffer.from(response.data);
    } catch (err: any) {
      console.error('[Google Translate TTS] Failed:', err.message);
      throw new BadRequestError('Failed to generate Text-to-Speech audio', 'TTS_FAILED');
    }
  },

  async queueBulkDispatch(
    applicationIds: string[],
    interviewerId: string,
    scheduledAt?: Date,
  ) {
    const queue = getBulkInterviewQueue();
    if (!queue) {
      console.warn('[InterviewService] Redis unavailable — bulk dispatch skipped');
      return { jobId: 'skipped-redis-unavailable', count: 0 };
    }
    const job = await queue.add('dispatchInterviews', {
      applicationIds,
      interviewerId,
      scheduledAt: scheduledAt || new Date(),
    });
    return { jobId: job.id, count: applicationIds.length };
  },

  async logProctoringViolation(
    interviewId: string,
    eventType: 'tab_switch' | 'window_blur' | 'face_absent' | 'multiple_faces',
    timestamp: string,
  ): Promise<any> {
    const interview = await InterviewModel.getById(interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found', 'INTERVIEW_NOT_FOUND');
    }

    const existingViolations = Array.isArray(interview.proctoring_violations)
      ? interview.proctoring_violations
      : [];

    const newViolation = { event: eventType, timestamp };
    const updatedViolations = [...existingViolations, newViolation];

    await InterviewModel.updateInterview(interviewId, {
      proctoring_violations: JSON.stringify(updatedViolations) as any,
    });

    return newViolation;
  },
};


