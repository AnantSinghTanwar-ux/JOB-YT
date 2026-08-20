import Redis, { RedisOptions } from 'ioredis';

const LOG_PREFIX = '[Redis]';

// ── Connection Construction ─────────────────────────────────────────────────
export const sharedOptions: Partial<RedisOptions> = {
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

export function getRedisConfig(): { url?: string; options: RedisOptions } {
  const options: RedisOptions = { ...sharedOptions };
  
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL, options };
  }
  
  options.host = process.env.REDIS_HOST || '127.0.0.1';
  options.port = parseInt(process.env.REDIS_PORT || '6379', 10);
  options.username = process.env.REDIS_USER || 'default';
  options.password = process.env.REDIS_PASSWORD || undefined;
  
  return { options };
}

const config = getRedisConfig();
const redis = config.url ? new Redis(config.url, config.options) : new Redis(config.options);

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
