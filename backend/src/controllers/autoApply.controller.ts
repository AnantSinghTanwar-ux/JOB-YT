import { Request, Response, NextFunction } from 'express';
import { AutoApplyPreferenceService } from '../services/autoApplyPreference.service';
import { AutoApplyPreviewService } from '../services/autoApplyPreview.service';
import { AutoApplyQueueService } from '../services/autoApplyQueue.service';
import { AutoApplyLimitService } from '../services/autoApplyLimit.service';
import { AutoApplyEventService } from '../services/autoApplyEvent.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { AutoApplyStatus } from '../types/autoApply.types';

export const AutoApplyController = {
  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const prefs = await AutoApplyPreferenceService.getPreferences(req.user!.userId);
      sendSuccess(res, prefs);
    } catch (err) {
      next(err);
    }
  },

  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const prefs = await AutoApplyPreferenceService.updatePreferences(req.user!.userId, req.body);
      sendSuccess(res, prefs, 'Preferences updated');
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.body.status as AutoApplyStatus;
      const prefs = await AutoApplyPreferenceService.setStatus(req.user!.userId, status, {
        consented: Boolean(req.body.consented),
      });
      sendSuccess(res, prefs, 'Auto-Apply status updated');
    } catch (err) {
      next(err);
    }
  },

  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AutoApplyPreviewService.previewForUser(req.user!.userId, req.body);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async acknowledgePreview(req: Request, res: Response, next: NextFunction) {
    try {
      const prefs = await AutoApplyPreferenceService.acknowledgePreview(req.user!.userId);
      sendSuccess(res, prefs, 'Preview acknowledged');
    } catch (err) {
      next(err);
    }
  },

  async getLimits(req: Request, res: Response, next: NextFunction) {
    try {
      const limits = await AutoApplyLimitService.getLimits(req.user!.userId);
      sendSuccess(res, limits);
    } catch (err) {
      next(err);
    }
  },

  async listQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const status = req.query.status as string | undefined;
      const { items, total } = await AutoApplyQueueService.listQueue(req.user!.userId, {
        page,
        limit,
        status: status as never,
      });
      sendPaginated(res, items, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  async getQueueStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AutoApplyQueueService.getStats(req.user!.userId);
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  },

  async getQueueItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await AutoApplyQueueService.getItem(req.user!.userId, req.params.id as string);
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async approveQueueItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await AutoApplyQueueService.approve(req.user!.userId, req.params.id as string);
      sendSuccess(res, item, 'Application approved and submitted');
    } catch (err) {
      next(err);
    }
  },

  async rejectQueueItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await AutoApplyQueueService.reject(
        req.user!.userId,
        req.params.id as string,
        req.body.reason,
      );
      sendSuccess(res, item, 'Application skipped');
    } catch (err) {
      next(err);
    }
  },

  async retryQueueItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await AutoApplyQueueService.retry(req.user!.userId, req.params.id as string);
      sendSuccess(res, item, 'Retry initiated');
    } catch (err) {
      next(err);
    }
  },

  async cancelQueueItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await AutoApplyQueueService.cancel(req.user!.userId, req.params.id as string);
      sendSuccess(res, item, 'Queue item cancelled');
    } catch (err) {
      next(err);
    }
  },

  async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { events, total } = await AutoApplyEventService.listEvents(req.user!.userId, {
        page,
        limit,
        jobId: req.query.jobId as string | undefined,
      });
      sendPaginated(res, events, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  async listEventsForJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { events, total } = await AutoApplyEventService.listEvents(req.user!.userId, {
        jobId: req.params.jobId as string,
        limit: 100,
      });
      sendSuccess(res, { events, total });
    } catch (err) {
      next(err);
    }
  },
};
