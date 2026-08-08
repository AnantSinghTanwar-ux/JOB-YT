import { Request, Response, NextFunction } from 'express';
import { WebhookService } from '../services/webhook.service';
import { sendSuccess } from '../utils/response';

export const WebhookController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const webhooks = await WebhookService.list(req.user!.userId);
      sendSuccess(res, webhooks);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { url, events } = req.body;
      if (!url || !events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'url and events are required' });
      }
      const webhook = await WebhookService.register(req.user!.userId, url, events);
      sendSuccess(res, webhook, 'Webhook registered', 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { url, events, is_active } = req.body;
      const updated = await WebhookService.update(String(id), req.user!.userId as string, { url, events, is_active });
      sendSuccess(res, updated, 'Webhook updated');
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await WebhookService.delete(String(id), req.user!.userId as string);
      sendSuccess(res, null, 'Webhook deleted');
    } catch (err) {
      next(err);
    }
  },

  async getDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deliveries = await WebhookService.getDeliveries(String(id), req.user!.userId as string);
      sendSuccess(res, deliveries);
    } catch (err) {
      next(err);
    }
  },
};
