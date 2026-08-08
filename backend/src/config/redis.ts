import Redis, { RedisOptions } from 'ioredis';

const LOG_PREFIX = '[Redis]';

// ── Connection Construction ─────────────────────────────────────────────────
const sharedOptions: Partial<RedisOptions> = {
  family: 4,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy(times: number) {
    if (times > 3) {
      console.warn(`${LOG_PREFIX} Max connection retries reached. Stopping reconnect attempts.`);
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000);
  },
};

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, sharedOptions)
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USER || 'default',
      password: process.env.REDIS_PASSWORD || undefined,
      ...sharedOptions,
    });

// ── Availability Tracking ───────────────────────────────────────────────────
let _redisAvailable = false;

let hasLoggedRedisError = false;
redis.on('error', (err) => {
  _redisAvailable = false;
  if (!hasLoggedRedisError) {
    hasLoggedRedisError = true;
    const errorWithList = err as { errors?: unknown[] };
    const aggregatedMessages = Array.isArray(errorWithList.errors)
      ? errorWithList.errors
          .map((item: unknown) => (item instanceof Error ? item.message : String(item)))
          .join('; ')
      : '';
    const message =
      aggregatedMessages ||
      (err instanceof Error ? err.message : String(err));
    console.warn(`${LOG_PREFIX} Connection error: ${message}`);
  }
});

redis.on('connect', () => {
  _redisAvailable = true;
  console.log(`${LOG_PREFIX} Connected`);
});

redis.on('close', () => {
  _redisAvailable = false;
});

/**
 * Returns true if Redis is currently connected and usable.
 * Services should check this before issuing commands and
 * degrade gracefully when it returns false.
 */
export function isRedisAvailable(): boolean {
  return _redisAvailable;
}

export default redis;
