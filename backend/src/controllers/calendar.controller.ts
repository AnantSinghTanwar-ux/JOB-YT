import { Request, Response, NextFunction } from 'express';
import { CalendarAuthService } from '../services/calendarAuth.service';
import { CalendarService } from '../services/calendar.service';
import { sendSuccess } from '../utils/response';

export const CalendarController = {
  async getAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { url, state } = await CalendarAuthService.getAuthUrl(req.user!.userId);
      sendSuccess(res, { url, state });
    } catch (err) {
      next(err);
    }
  },

  async handleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { state, code } = req.body;
      if (!state || !code) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'state and code are required' });
      }
      const userId = await CalendarAuthService.handleCallback(state, code);
      sendSuccess(res, { user_id: userId }, 'Google Calendar connected');
    } catch (err) {
      next(err);
    }
  },

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const connected = await CalendarAuthService.isConnected(req.user!.userId);
      sendSuccess(res, { connected });
    } catch (err) {
      next(err);
    }
  },

  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      await CalendarAuthService.disconnect(req.user!.userId);
      sendSuccess(res, null, 'Google Calendar disconnected');
    } catch (err) {
      next(err);
    }
  },

  async scheduleInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId, scheduledAt, durationMinutes, notes } = req.body;
      if (!applicationId || !scheduledAt) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'applicationId and scheduledAt are required' });
      }
      const result = await CalendarService.scheduleInterview(req.user!.userId, applicationId, {
        scheduledAt,
        durationMinutes,
        notes,
      });
      sendSuccess(res, result, 'Interview scheduled', 201);
    } catch (err) {
      next(err);
    }
  },
};
