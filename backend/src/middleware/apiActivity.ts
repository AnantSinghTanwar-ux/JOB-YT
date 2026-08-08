import { Request, Response, NextFunction } from 'express';
import { ApiActivityLogModel } from '../models/apiActivityLog.model';

const LOGGED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export const apiActivityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    if (!LOGGED_METHODS.has(req.method)) return;

    const latencyMs = Date.now() - start;

    ApiActivityLogModel.log({
      api_key_id: req.apiKey?.id || null,
      user_id: req.user?.userId || null,
      endpoint: req.originalUrl,
      method: req.method,
      status_code: res.statusCode,
      latency_ms: latencyMs,
      ip_address: req.ip || null,
      user_agent: (req.headers['user-agent'] as string) || null,
      request_id: (req as unknown as { requestId?: string }).requestId || null,
    }).catch(() => {
      // fire-and-forget — don't block response for logging
    });
  });

  next();
};
