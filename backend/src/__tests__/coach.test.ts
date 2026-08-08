import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import requestSuper from 'supertest';
import app from '../app';
import { CoachService } from '../services/coach.service';
import { CoachModel } from '../models/coach.model';
import jwt from 'jsonwebtoken';

// Mock the database pool to prevent connection errors
jest.mock('../config/database', () => {
  return {
    __esModule: true,
    default: {
      query: (jest.fn() as any).mockResolvedValue({ rows: [] }),
      connect: jest.fn().mockReturnValue({
        query: jest.fn(),
        release: jest.fn(),
      }),
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

describe('AI Career Coach API End-to-End Surface Tests', () => {
  const mockStudentId = 'student-123';
  const mockSessionId = '00000000-0000-4000-8000-000000000001';
  const mockMessageId = '00000000-0000-4000-8000-000000000002';
  let token: string;

  beforeEach(() => {
    jest.restoreAllMocks();
    // Create a valid mock JWT token
    token = 'Bearer ' + jwt.sign({ userId: mockStudentId, role: 'applicant' }, process.env.JWT_SECRET || 'secret');
  });

  describe('POST /api/v1/coach/sessions', () => {
    it('should fail with 401 if unauthorized', async () => {
      const res = await requestSuper(app)
        .post('/api/v1/coach/sessions')
        .send({ mode: 'general' });
      expect(res.status).toBe(401);
    });

    it('should fail with 422 if mode is invalid', async () => {
      const res = await requestSuper(app)
        .post('/api/v1/coach/sessions')
        .set('Authorization', token)
        .send({ mode: 'invalid_mode' });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should start a session and return 201 on success', async () => {
      jest.spyOn(CoachService, 'startSession').mockResolvedValue({
        id: mockSessionId,
        student_id: mockStudentId,
        title: 'Career Coach - general',
        mode: 'general',
        context_summary: null,
        context_updated_at: null,
        uploaded_resume_name: null,
        uploaded_resume_text: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await requestSuper(app)
        .post('/api/v1/coach/sessions')
        .set('Authorization', token)
        .send({ mode: 'general', title: 'My General Coaching' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockSessionId);
      expect(CoachService.startSession).toHaveBeenCalledWith(
        mockStudentId,
        'My General Coaching',
        'general',
        null,
        null
      );
    });

    it('should start a session with an uploaded resume file and parse it', async () => {
      jest.spyOn(CoachService, 'startSession').mockResolvedValue({
        id: mockSessionId,
        student_id: mockStudentId,
        title: 'Career Coach - resume_review',
        mode: 'resume_review',
        context_summary: null,
        context_updated_at: null,
        uploaded_resume_name: 'test-resume.pdf',
        uploaded_resume_text: 'Extracted raw resume text content.',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const resumeParser = require('../utils/resumeParser');
      jest.spyOn(resumeParser, 'parseResume').mockResolvedValue({
        rawText: 'Extracted raw resume text content.',
        skills: ['TypeScript'],
        emails: [],
        phones: [],
        name: 'Test Candidate',
        experience: [],
        education: []
      });

      const res = await requestSuper(app)
        .post('/api/v1/coach/sessions')
        .set('Authorization', token)
        .attach('file', Buffer.from('%PDF-1.4 fake pdf content'), 'test-resume.pdf')
        .field('mode', 'resume_review')
        .field('title', 'Resume Review Test');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(CoachService.startSession).toHaveBeenCalledWith(
        mockStudentId,
        'Resume Review Test',
        'resume_review',
        'test-resume.pdf',
        'Extracted raw resume text content.'
      );
    });
  });

  describe('GET /api/v1/coach/sessions', () => {
    it('should list all sessions successfully', async () => {
      jest.spyOn(CoachService, 'listSessions').mockResolvedValue([
        {
          id: mockSessionId,
          student_id: mockStudentId,
          title: 'Career Coach - general',
          mode: 'general',
          context_summary: null,
          context_updated_at: null,
          uploaded_resume_name: null,
          uploaded_resume_text: null,
          created_at: new Date(),
          updated_at: new Date(),
        }
      ]);

      const res = await requestSuper(app)
        .get('/api/v1/coach/sessions')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockSessionId);
    });
  });

  describe('GET /api/v1/coach/sessions/:id', () => {
    it('should fail with 422 if id is not a valid UUID', async () => {
      const res = await requestSuper(app)
        .get('/api/v1/coach/sessions/not-uuid')
        .set('Authorization', token);
      expect(res.status).toBe(422);
    });

    it('should return session and messages', async () => {
      jest.spyOn(CoachService, 'getSession').mockResolvedValue({
        id: mockSessionId,
        student_id: mockStudentId,
        title: 'Career Coach - general',
        mode: 'general',
        context_summary: null,
        context_updated_at: null,
        uploaded_resume_name: null,
        uploaded_resume_text: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      jest.spyOn(CoachModel, 'getMessagesBySessionId').mockResolvedValue([
        {
          id: mockMessageId,
          session_id: mockSessionId,
          sender: 'user',
          message_text: 'Hello',
          feedback: null,
          feedback_comment: null,
          created_at: new Date(),
        }
      ]);

      const res = await requestSuper(app)
        .get(`/api/v1/coach/sessions/${mockSessionId}`)
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.id).toBe(mockSessionId);
      expect(res.body.data.messages).toHaveLength(1);
    });
  });

  describe('POST /api/v1/coach/sessions/:id/messages', () => {
    it('should fail with 422 if message is empty', async () => {
      const res = await requestSuper(app)
        .post(`/api/v1/coach/sessions/${mockSessionId}/messages`)
        .set('Authorization', token)
        .send({ message: '' });
      expect(res.status).toBe(422);
    });

    it('should process message successfully and return 200', async () => {
      jest.spyOn(CoachService, 'sendMessage').mockResolvedValue({
        id: mockMessageId,
        session_id: mockSessionId,
        sender: 'ai',
        message_text: 'This is an AI advice response',
        feedback: null,
        feedback_comment: null,
        created_at: new Date(),
      });

      const res = await requestSuper(app)
        .post(`/api/v1/coach/sessions/${mockSessionId}/messages`)
        .set('Authorization', token)
        .send({ message: 'Can you look at my experience?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sender).toBe('ai');
      expect(res.body.data.message_text).toBe('This is an AI advice response');
    });

    it('should return 402 if student has insufficient credits', async () => {
      const creditError = Object.assign(new Error('Insufficient credits'), {
        statusCode: 402,
        error: 'INSUFFICIENT_CREDITS',
        required: 1,
        available: 0,
      });
      jest.spyOn(CoachService, 'sendMessage').mockRejectedValue(creditError);

      const res = await requestSuper(app)
        .post(`/api/v1/coach/sessions/${mockSessionId}/messages`)
        .set('Authorization', token)
        .send({ message: 'Should fail due to credits' });

      expect(res.status).toBe(402);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INSUFFICIENT_CREDITS');
      expect(res.body.required).toBe(1);
      expect(res.body.available).toBe(0);
    });

    it('should return 500 if AI call fails', async () => {
      const aiError = Object.assign(new Error('AI failed'), {
        statusCode: 500,
        error: 'COACH_AI_FAILED',
      });
      jest.spyOn(CoachService, 'sendMessage').mockRejectedValue(aiError);

      const res = await requestSuper(app)
        .post(`/api/v1/coach/sessions/${mockSessionId}/messages`)
        .set('Authorization', token)
        .send({ message: 'Should fail due to AI issues' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('COACH_AI_FAILED');
    });
  });

  describe('POST /api/v1/coach/messages/:messageId/feedback', () => {
    it('should submit feedback successfully', async () => {
      jest.spyOn(CoachService, 'submitFeedback').mockResolvedValue({
        id: mockMessageId,
        session_id: mockSessionId,
        sender: 'ai',
        message_text: 'Good advice',
        feedback: 'up',
        feedback_comment: 'Really helpful!',
        created_at: new Date(),
      });

      const res = await requestSuper(app)
        .post(`/api/v1/coach/messages/${mockMessageId}/feedback`)
        .set('Authorization', token)
        .send({ feedback: 'up', comment: 'Really helpful!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.feedback).toBe('up');
      expect(res.body.data.feedback_comment).toBe('Really helpful!');
    });
  });

  describe('GET /api/v1/coach/nudges', () => {
    it('should retrieve dashboard nudges successfully', async () => {
      jest.spyOn(CoachService, 'generateNudges').mockResolvedValue([
        {
          id: 'nudge-profile',
          text: "Your skills profile is empty!",
          type: 'warning',
          actionLabel: 'Edit Profile',
          actionUrl: '/profile',
        }
      ]);

      const res = await requestSuper(app)
        .get('/api/v1/coach/nudges')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('nudge-profile');
    });
  });
});
