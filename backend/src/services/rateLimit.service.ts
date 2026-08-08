import redis from '../config/redis';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

function getHourBucket(): string {
  const now = Math.floor(Date.now() / 1000);
  return String(Math.floor(now / 3600));
}

function getResetAt(): number {
  const now = Math.floor(Date.now() / 1000);
  return (Math.floor(now / 3600) + 1) * 3600;
}

export const RateLimitService = {
  async checkApiKeyLimit(apiKeyId: string, limit: number = 1000): Promise<RateLimitResult> {
    const bucket = getHourBucket();
    const key = `ratelimit:apikey:${apiKeyId}:${bucket}`;
    const resetAt = getResetAt();

    try {
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, 3600);
      }

      return {
        allowed: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    } catch {
      return { allowed: true, limit, remaining: limit, resetAt };
    }
  },

  async getRemainingLimit(apiKeyId: string, limit: number = 1000): Promise<{ remaining: number; resetAt: number }> {
    const bucket = getHourBucket();
    const key = `ratelimit:apikey:${apiKeyId}:${bucket}`;

    try {
      const count = await redis.get(key);
      const current = count ? parseInt(count, 10) : 0;
      return {
        remaining: Math.max(0, limit - current),
        resetAt: getResetAt(),
      };
    } catch {
      return { remaining: limit, resetAt: getResetAt() };
    }
  },
};
