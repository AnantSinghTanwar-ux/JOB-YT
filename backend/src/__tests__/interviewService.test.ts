import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InterviewService } from '../services/interview.service';
import { InterviewModel } from '../models/interview.model';
import { UserModel } from '../models/user.model';
import { ReportGeneratorService } from '../services/reportGenerator.service';
import { AIService } from '../services/ai.service';
import pool from '../config/database';


describe('InterviewService Scaffold Unit Tests', () => {
  const mockStudentId = 'student-123';
  const mockSessionId = 'session-456';
  const mockQuestionId = 'question-789';

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(InterviewService, 'evaluateResponse').mockResolvedValue({
      scores: {
        communicationClarity: 80,
        contentRelevance: 85,
        responseStructure: 75,
        depthOfKnowledge: 80,
        confidenceIndicators: 90,
      },
      feedbackText: 'Mock feedback',
      suggestedImprovements: 'Mock improvements',
    });
  });

  describe('_assertActiveStudent', () => {
    it('should throw NOT_FOUND if student does not exist', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce(null);

      await expect(InterviewService._assertActiveStudent(mockStudentId)).rejects.toThrow(
        expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' }),
      );
    });

    it('should throw FORBIDDEN if student is banned', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({
        id: mockStudentId,
        banned_at: new Date(),
      } as any);

      await expect(InterviewService._assertActiveStudent(mockStudentId)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }),
      );
    });

    it('should succeed if student is active and not banned', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({
        id: mockStudentId,
        banned_at: null,
      } as any);

      await expect(InterviewService._assertActiveStudent(mockStudentId)).resolves.not.toThrow();
    });
  });

  describe('createSession', () => {
    it('should create an interview session and transition to questions_generated', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({ id: mockStudentId, banned_at: null } as any);
      const mockSession = {
        id: mockSessionId,
        student_id: mockStudentId,
        role_title: 'Software Engineer',
        status: 'created',
      };
      jest.spyOn(InterviewModel, 'createSession').mockResolvedValueOnce(mockSession as any);
      jest.spyOn(InterviewService, 'generateQuestions').mockResolvedValueOnce([
        { questionText: 'Q1', category: 'technical', expectedTopics: ['React'] },
      ]);
      jest.spyOn(InterviewModel, 'createQuestion').mockResolvedValue({} as any);
      jest.spyOn(InterviewModel, 'findQuestionsBySessionId').mockResolvedValue([
        { id: mockQuestionId, order_index: 1 },
      ] as any);
      jest.spyOn(InterviewModel, 'updateSession').mockResolvedValueOnce({
        ...mockSession,
        status: 'questions_generated',
      } as any);

      const result = await InterviewService.createSession(mockStudentId, 'Software Engineer', 'Coding skills');
      expect(result).toBeDefined();
      expect(result.status).toBe('questions_generated');
      expect(InterviewModel.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: mockStudentId,
          role_title: 'Software Engineer',
          job_description: 'Coding skills',
        }),
      );
    });
  });

  describe('getSession & Ownership', () => {
    it('should fetch session successfully if candidate is owner', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({ id: mockStudentId, banned_at: null } as any);
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        status: 'created',
      } as any);

      const result = await InterviewService.getSession(mockStudentId, mockSessionId);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockSessionId);
    });

    it('should throw FORBIDDEN if candidate is not session owner', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({ id: mockStudentId, banned_at: null } as any);
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: 'other-student-999',
        status: 'created',
      } as any);

      await expect(InterviewService.getSession(mockStudentId, mockSessionId)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }),
      );
    });
  });

  describe('submitResponse & Lifecycle Transitions', () => {
    it('should throw BAD_REQUEST if response text is empty', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({ id: mockStudentId, banned_at: null } as any);
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        status: 'in_progress',
      } as any);

      await expect(
        InterviewService.submitResponse(mockStudentId, mockSessionId, mockQuestionId, ''),
      ).rejects.toThrow(expect.objectContaining({ statusCode: 400, code: 'BAD_REQUEST' }));
    });

    it('should auto-transition from questions_generated to in_progress', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({ id: mockStudentId, banned_at: null } as any);
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        status: 'questions_generated',
      } as any);

      const updatedSession = { id: mockSessionId, student_id: mockStudentId, status: 'in_progress' };
      jest.spyOn(InterviewModel, 'updateSession').mockResolvedValueOnce(updatedSession as any);
      jest.spyOn(InterviewModel, 'findQuestionsBySessionId').mockResolvedValueOnce([
        { id: mockQuestionId, order_index: 1 },
      ] as any);
      jest.spyOn(InterviewModel, 'createOrUpdateResponse').mockResolvedValueOnce({ id: 'resp-1' } as any);

      await InterviewService.submitResponse(mockStudentId, mockSessionId, mockQuestionId, 'My response text');
      expect(InterviewModel.updateSession).toHaveBeenCalledWith(mockSessionId, { status: 'in_progress' });
    });

    it('should throw BAD_REQUEST if transitioning questions_generated -> in_progress but question is invalid', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({ id: mockStudentId, banned_at: null } as any);
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        status: 'questions_generated',
      } as any);

      const updatedSession = { id: mockSessionId, student_id: mockStudentId, status: 'in_progress' };
      jest.spyOn(InterviewModel, 'updateSession').mockResolvedValueOnce(updatedSession as any);
      jest.spyOn(InterviewModel, 'findQuestionsBySessionId').mockResolvedValueOnce([
        { id: 'different-question', order_index: 1 },
      ] as any);

      await expect(
        InterviewService.submitResponse(mockStudentId, mockSessionId, mockQuestionId, 'My response text'),
      ).rejects.toThrow(expect.objectContaining({ statusCode: 400, code: 'BAD_REQUEST' }));
    });

    it('should prevent created -> questions_generated transition if no questions exist in DB', async () => {
      jest.spyOn(InterviewModel, 'findQuestionsBySessionId').mockResolvedValueOnce([]);
      const session = { id: mockSessionId, status: 'created' } as any;

      await expect(
        InterviewService._transitionSessionStatus(session, 'questions_generated'),
      ).rejects.toThrow(expect.objectContaining({ statusCode: 400, code: 'BAD_REQUEST' }));
    });
  });

  describe('completeSession', () => {
    const mockQuestions = [
      { id: 'q1', question_text: 'Q1 text', category: 'technical' },
      { id: 'q2', question_text: 'Q2 text', category: 'behavioral' }
    ];
    const mockResponses = [
      {
        question_id: 'q1',
        ai_score: 80,
        rubric_scores: {
          communicationClarity: 80,
          contentRelevance: 80,
          responseStructure: 80,
          depthOfKnowledge: 80,
          confidenceIndicators: 80
        },
        ai_feedback: { feedbackText: 'F1', suggestedImprovements: 'I1' }
      },
      {
        question_id: 'q2',
        ai_score: 90,
        rubric_scores: {
          communicationClarity: 90,
          contentRelevance: 90,
          responseStructure: 90,
          depthOfKnowledge: 90,
          confidenceIndicators: 90
        },
        ai_feedback: { feedbackText: 'F2', suggestedImprovements: 'I2' }
      }
    ];

    beforeEach(() => {
      // Mock common steps
      jest.spyOn(UserModel, 'findById').mockResolvedValue({ id: mockStudentId, banned_at: null } as any);
      jest.spyOn(InterviewModel, 'findQuestionsBySessionId').mockResolvedValue(mockQuestions as any);
      jest.spyOn(InterviewModel, 'findResponsesBySessionId').mockResolvedValue(mockResponses as any);
      jest.spyOn(ReportGeneratorService, 'generatePdfReport').mockResolvedValue('https://fake-s3-url.com/report.pdf');
      jest.spyOn(InterviewModel, 'createReport').mockResolvedValue({} as any);
      jest.spyOn(InterviewModel, 'updateReadinessScore').mockResolvedValue({} as any);
      jest.spyOn(InterviewModel, 'createReadinessHistory').mockResolvedValue({} as any);
      jest.spyOn(AIService, 'generateJSON').mockResolvedValue({
        summaryText: 'Executive summary',
        strengths: ['S1', 'S2', 'S3'],
        weaknesses: ['W1', 'W2', 'W3'],
        recommendations: ['R1', 'R2', 'R3']
      });
    });

    it('should aggregate scores, update rolling readiness (N=1), generate report, and transition to report_generated', async () => {
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        status: 'in_progress',
        role_title: 'Software Engineer',
        job_description: 'React developer'
      } as any);

      // Transitions: in_progress -> completed -> evaluated -> report_generated
      const mockSessionCompleted = { id: mockSessionId, status: 'completed' };
      const mockSessionEvaluated = { id: mockSessionId, status: 'evaluated', overall_score: 85 };
      const mockSessionReportGenerated = { id: mockSessionId, status: 'report_generated', report_url: 'https://fake-s3-url.com/report.pdf' };

      const updateSessionSpy = jest.spyOn(InterviewModel, 'updateSession');
      updateSessionSpy
        .mockResolvedValueOnce(mockSessionCompleted as any)
        .mockResolvedValueOnce(mockSessionEvaluated as any)
        .mockResolvedValueOnce(mockSessionReportGenerated as any);

      // N=1 completed session in database
      jest.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [{ id: mockSessionId, overall_score: 85, status: 'evaluated' }]
      } as any);

      jest.spyOn(InterviewModel, 'findReadinessScore').mockResolvedValueOnce(null);
      const updateReadinessSpy = jest.spyOn(InterviewModel, 'updateReadinessScore').mockResolvedValue({} as any);
      const createHistorySpy = jest.spyOn(InterviewModel, 'createReadinessHistory').mockResolvedValue({} as any);

      const result = await InterviewService.completeSession(mockStudentId, mockSessionId);

      expect(result.status).toBe('report_generated');
      expect(result.report_url).toBe('https://fake-s3-url.com/report.pdf');

      // Check average overall score calculation: round((80 + 90)/2) = 85
      expect(updateSessionSpy).toHaveBeenNthCalledWith(2, mockSessionId, expect.objectContaining({
        status: 'evaluated',
        overall_score: 85,
        rubric_scores: {
          communicationClarity: 85,
          contentRelevance: 85,
          responseStructure: 85,
          depthOfKnowledge: 85,
          confidenceIndicators: 85
        }
      }));

      // Check readiness update: N=1 -> readiness = 85, trend = stable (since previous is null)
      expect(updateReadinessSpy).toHaveBeenCalledWith(mockStudentId, 85, 'stable', mockSessionId);
      expect(createHistorySpy).toHaveBeenCalledWith(expect.objectContaining({
        student_id: mockStudentId,
        session_id: mockSessionId,
        previous_score: null,
        interview_score: 85,
        new_score: 85,
        trend: 'stable'
      }));

      expect(ReportGeneratorService.generatePdfReport).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.any(Array),
        'Executive summary',
        ['S1', 'S2', 'S3'],
        ['W1', 'W2', 'W3'],
        ['R1', 'R2', 'R3']
      );
      expect(InterviewModel.createReport).toHaveBeenCalled();
    });

    it('should calculate correct rolling readiness score for N=2 sessions with improving trend', async () => {
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        status: 'in_progress',
        role_title: 'Software Engineer'
      } as any);

      jest.spyOn(InterviewModel, 'updateSession')
        .mockResolvedValueOnce({ id: mockSessionId, status: 'completed' } as any)
        .mockResolvedValueOnce({ id: mockSessionId, status: 'evaluated', overall_score: 90 } as any)
        .mockResolvedValueOnce({ id: mockSessionId, status: 'report_generated' } as any);

      // N=2 completed sessions: first session score 70, second session score 90
      jest.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [
          { id: 's1', overall_score: 70, status: 'evaluated' },
          { id: mockSessionId, overall_score: 90, status: 'evaluated' }
        ]
      } as any);

      // Previous readiness score is 70
      jest.spyOn(InterviewModel, 'findReadinessScore').mockResolvedValueOnce({ current_score: 70 } as any);
      const updateReadinessSpy = jest.spyOn(InterviewModel, 'updateReadinessScore').mockResolvedValue({} as any);

      await InterviewService.completeSession(mockStudentId, mockSessionId);

      // R2 = round(0.6 * 90 + 0.4 * 70) = 82
      // Trend: 82 - 70 = 12 >= 2 -> improving
      expect(updateReadinessSpy).toHaveBeenCalledWith(mockStudentId, 82, 'improving', mockSessionId);
    });

    it('should calculate correct rolling readiness score for N=3 sessions with stable trend', async () => {
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        status: 'in_progress',
        role_title: 'Software Engineer'
      } as any);

      jest.spyOn(InterviewModel, 'updateSession')
        .mockResolvedValueOnce({ id: mockSessionId, status: 'completed' } as any)
        .mockResolvedValueOnce({ id: mockSessionId, status: 'evaluated', overall_score: 90 } as any)
        .mockResolvedValueOnce({ id: mockSessionId, status: 'report_generated' } as any);

      // N=3 completed sessions: [70, 80, 90]
      jest.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [
          { id: 's1', overall_score: 70, status: 'evaluated' },
          { id: 's2', overall_score: 80, status: 'evaluated' },
          { id: mockSessionId, overall_score: 90, status: 'evaluated' }
        ]
      } as any);

      // Previous readiness score is 82
      jest.spyOn(InterviewModel, 'findReadinessScore').mockResolvedValueOnce({ current_score: 82 } as any);
      const updateReadinessSpy = jest.spyOn(InterviewModel, 'updateReadinessScore').mockResolvedValue({} as any);

      await InterviewService.completeSession(mockStudentId, mockSessionId);

      // HistAvg = 70
      // R3 = round(0.5 * 90 + 0.3 * 80 + 0.2 * 70) = round(45 + 24 + 14) = 83
      // Trend: 83 - 82 = 1 -> stable
      expect(updateReadinessSpy).toHaveBeenCalledWith(mockStudentId, 83, 'stable', mockSessionId);
    });

    it('should detect declining trend when rolling score decreases by >= 2', async () => {
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        status: 'in_progress',
        role_title: 'Software Engineer'
      } as any);

      jest.spyOn(InterviewModel, 'updateSession')
        .mockResolvedValueOnce({ id: mockSessionId, status: 'completed' } as any)
        .mockResolvedValueOnce({ id: mockSessionId, status: 'evaluated', overall_score: 60 } as any)
        .mockResolvedValueOnce({ id: mockSessionId, status: 'report_generated' } as any);

      // N=2 completed sessions: [90, 60]
      jest.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [
          { id: 's1', overall_score: 90, status: 'evaluated' },
          { id: mockSessionId, overall_score: 60, status: 'evaluated' }
        ]
      } as any);

      // Previous readiness score is 90
      jest.spyOn(InterviewModel, 'findReadinessScore').mockResolvedValueOnce({ current_score: 90 } as any);
      const updateReadinessSpy = jest.spyOn(InterviewModel, 'updateReadinessScore').mockResolvedValue({} as any);

      await InterviewService.completeSession(mockStudentId, mockSessionId);

      // R2 = round(0.6 * 60 + 0.4 * 90) = round(36 + 36) = 72
      // Trend: 72 - 90 = -18 <= -2 -> declining
      expect(updateReadinessSpy).toHaveBeenCalledWith(mockStudentId, 72, 'declining', mockSessionId);
    });
  });
});
