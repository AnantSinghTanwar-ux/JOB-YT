import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { InterviewModel } from '../models/interview.model';
import { sendSuccess } from '../utils/response';
import { BadRequestError } from '../utils/errors';
import { badRequest } from '../utils/appError';
import prisma from '../config/prisma';
import { getVideoTranscriptionQueue } from '../config/queue';

export const InterviewController = {
  async scheduleInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId, scheduledAt } = req.body as {
        applicationId?: string;
        scheduledAt?: string;
      };

      if (!applicationId) {
        throw new BadRequestError('applicationId is required', 'APPLICATION_REQUIRED');
      }
      if (!scheduledAt) {
        throw new BadRequestError('scheduledAt is required', 'SCHEDULED_AT_REQUIRED');
      }

      const parsedDate = new Date(scheduledAt);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestError('Invalid scheduledAt date format', 'INVALID_DATE');
      }

      const interview = await InterviewService.scheduleInterview(
        applicationId,
        parsedDate,
        req.user!,
      );

      sendSuccess(res, interview, 'Interview scheduled successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async getInterviewDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }

      const interview = await InterviewService.getInterviewDetails(id, req.user!);
      
      // Load current live playground state in-memory if it is live
      const liveState = InterviewService.getLiveSession(id);
      const responseData = {
        ...interview,
        liveState: liveState
          ? {
              code: liveState.code,
              language: liveState.language,
              notes: (req.user!.role === 'recruiter' || req.user!.role === 'admin') ? liveState.notes : undefined,
              participants: Array.from(liveState.participants),
            }
          : null,
      };

      sendSuccess(res, responseData, 'Interview details retrieved');
    } catch (err) {
      next(err);
    }
  },

  async listInterviews(req: Request, res: Response, next: NextFunction) {
    try {
      const interviews = await InterviewService.listUserInterviews(req.user!);
      sendSuccess(res, interviews, 'Interviews list retrieved');
    } catch (err) {
      next(err);
    }
  },

  async updateNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { notes } = req.body as { notes?: string };

      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }
      if (notes === undefined) {
        throw new BadRequestError('Notes content is required', 'NOTES_REQUIRED');
      }

      const interview = await InterviewService.updateNotes(id, notes, req.user!);
      sendSuccess(res, interview, 'Notes updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async startInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }

      const interview = await InterviewService.startInterview(id, req.user!);
      sendSuccess(res, interview, 'Interview started and live session initialized');
    } catch (err) {
      next(err);
    }
  },

  async endInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { feedback, rating, codeContent, language } = req.body as {
        feedback?: string;
        rating?: number;
        codeContent?: string;
        language?: string;
      };

      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }

      if (rating !== undefined && (rating < 1 || rating > 5)) {
        throw new BadRequestError('Rating must be an integer between 1 and 5', 'INVALID_RATING');
      }

      const interview = await InterviewService.endInterview(
        id,
        { feedback, rating, codeContent, language },
        req.user!,
      );

      sendSuccess(res, interview, 'Interview completed and saved successfully');
    } catch (err) {
      next(err);
    }
  },

  async transcribeAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }

      if (!req.file) {
        throw new BadRequestError('Audio file is required', 'FILE_REQUIRED');
      }

      const text = await InterviewService.transcribeAudio(
        id,
        req.file.buffer,
        req.file.originalname,
        req.user!,
      );

      sendSuccess(res, { text }, 'Audio transcribed successfully');
    } catch (err) {
      next(err);
    }
  },

  async generateTTS(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { text } = req.body as { text?: string };

      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }
      if (!text) {
        throw new BadRequestError('Text prompt is required', 'TEXT_REQUIRED');
      }

      const audioBuffer = await InterviewService.generateTTS(id, text, req.user!);
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Start a new mock interview session and generate questions
   */
  async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const { roleTitle, jobDescription, questionCount } = req.body;

      if (!roleTitle || typeof roleTitle !== 'string' || !roleTitle.trim()) {
        throw badRequest('Role title is required');
      }

      let parsedCount: number | undefined;
      if (questionCount !== undefined) {
        parsedCount = parseInt(questionCount, 10);
        if (isNaN(parsedCount) || parsedCount <= 0) {
          throw badRequest('Question count must be a positive integer');
        }
      }

      const session = await InterviewService.createSession(
        studentId,
        roleTitle.trim(),
        jobDescription,
        undefined, // jobId
        parsedCount
      );

      sendSuccess(res, session, 'Interview session started and questions generated successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * List all mock interview sessions for the student
   */
  async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessions = await InterviewService.listSessions(studentId);
      sendSuccess(res, sessions, 'Sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieve session details, questions, and any responses submitted so far
   */
  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;

      const session = await InterviewService.getSession(studentId, sessionId);
      const questions = await InterviewModel.findQuestionsBySessionId(sessionId);
      const responses = await InterviewModel.findResponsesBySessionId(sessionId);

      sendSuccess(res, { session, questions, responses }, 'Session details retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Submit student's text response to a question
   */
  async submitResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;
      const { questionId, responseText } = req.body;

      if (!questionId || typeof questionId !== 'string') {
        throw badRequest('Question ID is required');
      }
      if (!responseText || typeof responseText !== 'string' || !responseText.trim()) {
        throw badRequest('Response text is required');
      }

      const response = await InterviewService.submitResponse(
        studentId,
        sessionId,
        questionId,
        responseText.trim()
      );

      sendSuccess(res, response, 'Response submitted and evaluated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Complete interview session, triggering score aggregation, readiness update, and report generation
   */
  async completeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;

      const session = await InterviewService.completeSession(studentId, sessionId);

      sendSuccess(res, session, 'Interview session completed and evaluated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieve performance report details for a session
   */
  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;

      const report = await InterviewService.getReport(studentId, sessionId);

      sendSuccess(res, report, 'Performance report retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieve student's current interview readiness score and progression history
   */
  async getReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;

      const readiness = await InterviewService.getReadinessScore(studentId);
      const history = await InterviewModel.findReadinessHistory(studentId);

      sendSuccess(res, { readiness, history }, 'Readiness metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  async saveVideoConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const candidateId = req.user!.userId;
      const { consentGiven, consentVersion, retentionDays } = req.body;

      const retentionExpiry = new Date();
      retentionExpiry.setDate(retentionExpiry.getDate() + (retentionDays || 30));

      const videoExpiry = new Date();
      videoExpiry.setDate(videoExpiry.getDate() + (retentionDays || 30));

      const consent = await (prisma as any).video_consents.create({
        data: {
          candidate_id: candidateId,
          consent_given: Boolean(consentGiven),
          consent_version: consentVersion || '1.0',
          retention_expiry: retentionExpiry,
          video_expiry: videoExpiry,
        }
      });

      sendSuccess(res, consent, 'Video interview consent recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async submitVideoInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const candidateId = req.user!.userId;
      const { applicationId, videoUrl } = req.body;

      if (!applicationId || !videoUrl) {
        throw badRequest('applicationId and videoUrl are required');
      }

      // 1. Fetch application details to get job_id
      const application = await (prisma as any).applications.findUnique({
        where: { id: applicationId },
        select: { job_id: true }
      });

      const jobId = application?.job_id || null;

      // 2. Create or update video interview session record
      const videoInterview = await (prisma as any).video_interviews.create({
        data: {
          application_id: applicationId,
          candidate_id: candidateId,
          job_id: jobId,
          video_url: videoUrl,
          status: 'UPLOADED',
        }
      });

      // 3. Queue the transcription job via BullMQ
      const vtQueue = getVideoTranscriptionQueue();
      if (vtQueue) {
        await vtQueue.add('transcribeVideo', { videoInterviewId: videoInterview.id });
      } else {
        console.warn('[submitVideoInterview] videoTranscriptionQueue is not available');
      }

      sendSuccess(res, videoInterview, 'Video interview submitted and enqueued for transcription', 201);
    } catch (err) {
      next(err);
    }
  },
};
