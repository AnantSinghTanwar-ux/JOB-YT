import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKey.service';
import { RateLimitService } from '../services/rateLimit.service';
import { JwtPayload } from '../types';

export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey || !apiKey.trim()) {
    res.status(401).json({ success: false, error: 'API_KEY_REQUIRED', message: 'X-API-Key header is required' });
    return;
  }

  try {
    const result = await ApiKeyService.validateApiKey(apiKey);
    req.user = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as JwtPayload['role'],
    };
    req.apiKey = result.api_key;

    ApiKeyService.touchLastUsed(result.api_key.id).catch(() => {});

    const limit = result.api_key.rate_limit || 1000;
    const rateResult = await RateLimitService.checkApiKeyLimit(result.api_key.id, limit);

    res.setHeader('X-RateLimit-Limit', rateResult.limit);
    res.setHeader('X-RateLimit-Remaining', rateResult.remaining);
    res.setHeader('X-RateLimit-Reset', rateResult.resetAt);

    if (!rateResult.allowed) {
      const retryAfter = rateResult.resetAt - Math.floor(Date.now() / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        limit: rateResult.limit,
        remaining: 0,
        resetAt: rateResult.resetAt,
      });
      return;
    }

    next();
  } catch (err) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    res.status(error.statusCode || 401).json({
      success: false,
      error: error.code || 'UNAUTHORIZED',
      message: error.message || 'Invalid API key',
    });
  }
};

export const authorizeApiKey = (...scopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'API key required for this resource' });
      return;
    }

    const hasAccess = scopes.length === 0 || ApiKeyService.hasAnyScope(req.apiKey, scopes);

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_SCOPES',
        message: `API key lacks required scope(s): ${scopes.join(', ')}`,
      });
      return;
    }

    next();
  };
};
