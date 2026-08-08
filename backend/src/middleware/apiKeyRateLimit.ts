import { Request, Response, NextFunction } from 'express';
import { RateLimitService } from '../services/rateLimit.service';

export const apiKeyRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.apiKey) {
    next();
    return;
  }

  const limit = req.apiKey.rate_limit || 1000;
  const result = await RateLimitService.checkApiKeyLimit(req.apiKey.id, limit);

  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetAt);

  if (!result.allowed) {
    const retryAfter = result.resetAt - Math.floor(Date.now() / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      limit: result.limit,
      remaining: 0,
      resetAt: result.resetAt,
    });
    return;
  }

  next();
};
