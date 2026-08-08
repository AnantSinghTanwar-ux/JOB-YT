import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import requestSuper from 'supertest';
import app from '../app';
import { InterviewService } from '../services/interview.service';
import { InterviewModel } from '../models/interview.model';
import jwt from 'jsonwebtoken';

// Mock the database pool to prevent connection errors
jest.mock('../config/database', () => {
  return {
    __esModule: true,
    default: {
      query: (jest.fn() as any).mockResolvedValue({ rows: [] }),
      connect: jest.fn(),
    }
  };
});

jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken') as any;
  return {
    ...actual,
    verify: jest.fn().mockReturnValue({ userId: 'student-123', role: 'applicant' }),
  };
});

describe('Interview API End-to-End Surface Tests', () => {
  const mockStudentId = 'student-123';
  const mockSessionId = '00000000-0000-4000-8000-000000000001';
  const mockQuestionId = '00000000-0000-4000-8000-000000000002';
  let token: string;

  beforeEach(() => {
    jest.restoreAllMocks();
    // Create a valid mock JWT token
    token = 'Bearer ' + jwt.sign({ userId: mockStudentId, role: 'applicant' }, process.env.JWT_SECRET || 'secret');
  });

  describe('POST /api/v1/interviews/sessions', () => {
    it('should fail with 401 if unauthorized', async () => {
      const res = await requestSuper(app)
        .post('/api/v1/interviews/sessions')
        .send({ roleTitle: 'Engineer' });
      expect(res.status).toBe(401);
    });

    it('should fail with 422 if roleTitle is missing', async () => {
      const res = await requestSuper(app)
        .post('/api/v1/interviews/sessions')
        .set('Authorization', token)
        .send({ roleTitle: '' });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should start a session and return 201 on success', async () => {
      jest.spyOn(InterviewService, 'createSession').mockResolvedValue({
        id: mockSessionId,
        student_id: mockStudentId,
        role_title: 'Engineer',
        status: 'questions_generated',
      } as any);

      const res = await requestSuper(app)
        .post('/api/v1/interviews/sessions')
        .set('Authorization', token)
        .send({ roleTitle: 'Engineer', questionCount: 5 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockSessionId);
      expect(InterviewService.createSession).toHaveBeenCalledWith(
        mockStudentId,
        'Engineer',
        undefined,
        undefined,
        5
      );
    });
  });

  describe('GET /api/v1/interviews/sessions', () => {
    it('should list all sessions successfully', async () => {
      jest.spyOn(InterviewService, 'listSessions').mockResolvedValue([
        { id: mockSessionId, role_title: 'Engineer', status: 'completed' }
      ] as any);

      const res = await requestSuper(app)
        .get('/api/v1/interviews/sessions')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockSessionId);
    });
  });

  describe('GET /api/v1/interviews/sessions/:id', () => {
    it('should fail with 422 if id is not a valid UUID', async () => {
      const res = await requestSuper(app)
        .get('/api/v1/interviews/sessions/not-uuid')
        .set('Authorization', token);
      expect(res.status).toBe(422);
    });

    it('should return session, questions, and responses', async () => {
      jest.spyOn(InterviewService, 'getSession').mockResolvedValue({
        id: mockSessionId,
        role_title: 'Engineer',
      } as any);
      jest.spyOn(InterviewModel, 'findQuestionsBySessionId').mockResolvedValue([
        { id: mockQuestionId, question_text: 'Q1' }
      ] as any);
      jest.spyOn(InterviewModel, 'findResponsesBySessionId').mockResolvedValue([
        { question_id: mockQuestionId, response_text: 'A1' }
      ] as any);

      const res = await requestSuper(app)
        .get(`/api/v1/interviews/sessions/${mockSessionId}`)
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.id).toBe(mockSessionId);
      expect(res.body.data.questions).toHaveLength(1);
      expect(res.body.data.responses).toHaveLength(1);
    });
  });

  describe('POST /api/v1/interviews/sessions/:id/submit', () => {
    it('should submit response successfully', async () => {
      jest.spyOn(InterviewService, 'submitResponse').mockResolvedValue({
        id: 'response-id',
        question_id: mockQuestionId,
        response_text: 'My answer',
      } as any);

      const res = await requestSuper(app)
        .post(`/api/v1/interviews/sessions/${mockSessionId}/submit`)
        .set('Authorization', token)
        .send({ questionId: mockQuestionId, responseText: 'My answer' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.response_text).toBe('My answer');
    });
  });

  describe('POST /api/v1/interviews/sessions/:id/complete', () => {
    it('should complete session successfully', async () => {
      jest.spyOn(InterviewService, 'completeSession').mockResolvedValue({
        id: mockSessionId,
        status: 'report_generated',
      } as any);

      const res = await requestSuper(app)
        .post(`/api/v1/interviews/sessions/${mockSessionId}/complete`)
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('report_generated');
    });
  });

  describe('GET /api/v1/interviews/sessions/:id/report', () => {
    it('should fetch report successfully', async () => {
      jest.spyOn(InterviewService, 'getReport').mockResolvedValue({
        session_id: mockSessionId,
        overall_score: 85,
        summary_text: 'Good job',
      } as any);

      const res = await requestSuper(app)
        .get(`/api/v1/interviews/sessions/${mockSessionId}/report`)
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overall_score).toBe(85);
    });
  });

  describe('GET /api/v1/interviews/readiness', () => {
    it('should fetch readiness gauge and history', async () => {
      jest.spyOn(InterviewService, 'getReadinessScore').mockResolvedValue({
        student_id: mockStudentId,
        current_score: 85,
        trend: 'improving',
      } as any);
      jest.spyOn(InterviewModel, 'findReadinessHistory').mockResolvedValue([
        { id: 'h1', new_score: 85, trend: 'improving' }
      ] as any);

      const res = await requestSuper(app)
        .get('/api/v1/interviews/readiness')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.readiness.current_score).toBe(85);
      expect(res.body.data.history).toHaveLength(1);
    });
  });
});
