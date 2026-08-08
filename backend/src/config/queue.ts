import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

const LOG_PREFIX = '[BullMQ]';

// ── Lazy Redis Connection ───────────────────────────────────────────────────
// BullMQ requires its own connection with `maxRetriesPerRequest: null`.
// We defer creation so a missing Redis doesn't crash the import chain.

let _redisConnection: IORedis | null = null;
let _connectionFailed = false;

function getRedisConnection(): IORedis | null {
  if (_redisConnection) return _redisConnection;
  if (_connectionFailed) return null;

  try {
    const queueRedisOptions: any = {
      maxRetriesPerRequest: null,
      family: 4,
      retryStrategy(times: number) {
        if (times > 3) {
          console.warn(`${LOG_PREFIX} Max connection retries reached. Stopping reconnect attempts.`);
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      }
    };

    _redisConnection = process.env.REDIS_URL
      ? new IORedis(process.env.REDIS_URL, queueRedisOptions)
      : new IORedis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          username: process.env.REDIS_USER || 'default',
          password: process.env.REDIS_PASSWORD || undefined,
          ...queueRedisOptions
        });

    _redisConnection.on('error', (err) => {
      if (!_connectionFailed) {
        _connectionFailed = true;
        console.warn(
          `${LOG_PREFIX} Redis connection error — background workers will be unavailable: ${err.message}`,
        );
      }
    });

    _redisConnection.on('connect', () => {
      _connectionFailed = false;
    });

    return _redisConnection;
  } catch (err) {
    _connectionFailed = true;
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`${LOG_PREFIX} Failed to create Redis connection: ${message}`);
    return null;
  }
}

/** Expose for workers that need the raw connection. Returns null if Redis is unavailable. */
export function getRedisConnectionForWorker(): IORedis | null {
  return getRedisConnection();
}

// Keep the old export name so existing code can import it, but it's now nullable.
export { _redisConnection as redisConnection };

// ── Lazy Queue Factory ──────────────────────────────────────────────────────
// Queues are created on first access rather than at module load.
// If Redis is unavailable, getters return null and callers skip enqueuing.

const queueCache = new Map<string, Queue>();

function getOrCreateQueue(name: string, extraOptions?: Partial<QueueOptions>): Queue | null {
  if (queueCache.has(name)) return queueCache.get(name)!;

  const connection = getRedisConnection();
  if (!connection) {
    console.warn(`${LOG_PREFIX} Cannot create queue "${name}" — Redis unavailable`);
    return null;
  }

  const defaultJobOptions = {
    removeOnComplete: true,
    removeOnFail: false,
    ...(extraOptions?.defaultJobOptions || {}),
  };

  const queue = new Queue(name, {
    connection: connection as any,
    defaultJobOptions,
    ...extraOptions,
  });

  queueCache.set(name, queue);
  return queue;
}

// ── Queue Getters ───────────────────────────────────────────────────────────
// Each getter returns Queue | null. Callers must guard for null.

export function getRecommendationQueue() {
  return getOrCreateQueue('recommendationQueue');
}

export function getNotificationQueue() {
  return getOrCreateQueue('notificationQueue');
}

export function getWebhookQueue() {
  return getOrCreateQueue('webhookQueue');
}

export function getCodingEvaluationQueue() {
  return getOrCreateQueue('codingEvaluationQueue');
}

export function getAutoApplyQueue() {
  return getOrCreateQueue('autoApplyQueue', {
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });
}

export function getBroadcastQueue() {
  return getOrCreateQueue('broadcastQueue');
}

export function getVideoTranscriptionQueue() {
  return getOrCreateQueue('videoTranscriptionQueue', {
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    },
  });
}

export function getVideoEvaluationQueue() {
  return getOrCreateQueue('videoEvaluationQueue', {
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    },
  });
}

export function getBulkInterviewQueue() {
  return getOrCreateQueue('bulkInterviewQueue');
}

export function getSchedulerQueue() {
  return getOrCreateQueue('schedulerQueue');
}

export function getLearningRoadmapQueue() {
  return getOrCreateQueue('learning-roadmap-queue');
}

export function getLearningCourseScrapingQueue() {
  return getOrCreateQueue('learning-course-scraping-queue');
}

// ── Backward-compatible named exports ───────────────────────────────────────
// These are getters on the module so existing `import { recommendationQueue }` works.
// They may be null when Redis is down.

export const recommendationQueue = null as Queue | null;
export const notificationQueue = null as Queue | null;
export const webhookQueue = null as Queue | null;
export const codingEvaluationQueue = null as Queue | null;
export const autoApplyQueue = null as Queue | null;
export const broadcastQueue = null as Queue | null;
export const videoTranscriptionQueue = null as Queue | null;
export const videoEvaluationQueue = null as Queue | null;
export const bulkInterviewQueue = null as Queue | null;

// ── Cleanup ─────────────────────────────────────────────────────────────────
export const closeQueues = async () => {
  for (const [, queue] of queueCache) {
    try {
      await queue.close();
    } catch {
      // Ignore close errors during shutdown
    }
  }
  queueCache.clear();
};
