import { Request, Response, NextFunction } from 'express';
import { CoachService } from '../services/coach.service';
import { CoachModel } from '../models/coach.model';
import { sendSuccess } from '../utils/response';

export const CoachController = {
  async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const { title, mode } = req.body;

      let uploadedResumeName: string | null = null;
      let uploadedResumeText: string | null = null;

      if (req.file) {
        uploadedResumeName = req.file.originalname;
        const { parseResume } = await import('../utils/resumeParser');
        const parsed = await parseResume(req.file.buffer, {
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
        });
        uploadedResumeText = parsed.rawText || '';
      }

      const session = await CoachService.startSession(
        studentId,
        title,
        mode,
        uploadedResumeName,
        uploadedResumeText
      );
      sendSuccess(res, session, 'Coach session started successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async listSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const sessions = await CoachService.listSessions(studentId);
      sendSuccess(res, sessions, 'Coach sessions retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;
      const session = await CoachService.getSession(studentId, sessionId);
      const messages = await CoachModel.getMessagesBySessionId(sessionId);
      sendSuccess(res, { session, messages }, 'Coach session details retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;
      const { message } = req.body;
      const responseMessage = await CoachService.sendMessage(studentId, sessionId, message);
      sendSuccess(res, responseMessage, 'Coach message processed successfully', 200);
    } catch (err) {
      next(err);
    }
  },

  async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const messageId = req.params.messageId as string;
      const { feedback, comment } = req.body;
      const updatedMessage = await CoachService.submitFeedback(studentId, messageId, feedback, comment);
      sendSuccess(res, updatedMessage, 'Feedback submitted successfully');
    } catch (err) {
      next(err);
    }
  },

  async getNudges(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const nudges = await CoachService.generateNudges(studentId);
      sendSuccess(res, nudges, 'Nudges retrieved successfully');
    } catch (err) {
      next(err);
    }
  },
};
