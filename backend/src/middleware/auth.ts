import { Request, Response, NextFunction } from 'express';
import { JwtPayload, UserRole } from '../types';
import { ApiKeyService } from '../services/apiKey.service';
import { RateLimitService } from '../services/rateLimit.service';
import { verifyToken } from '../utils/jwt';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyToken(token) as JwtPayload;
      req.user = decoded;
      next();
      return;
    } catch {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }
  }

  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  if (apiKeyHeader?.trim()) {
    try {
      const result = await ApiKeyService.validateApiKey(apiKeyHeader);
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
      return;
    } catch (err) {
      const error = err as { statusCode?: number; code?: string; message?: string };
      res.status(error.statusCode || 401).json({
        success: false,
        error: error.code || 'UNAUTHORIZED',
        message: error.message || 'Invalid API key',
      });
      return;
    }
  }

  res.status(401).json({ success: false, message: 'No token provided' });
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token) as JwtPayload;
    req.user = decoded;
  } catch {
    // Ignore invalid token for optional auth routes to keep them public.
  }
  next();
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Not authenticated
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Authenticated but wrong role
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};
