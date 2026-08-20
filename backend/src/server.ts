import 'dotenv/config';
import http from 'http';
import app from './app';
import pool, { connectDB } from './config/database';
import prisma from './config/prisma';
import redis, { isRedisAvailable } from './config/redis';
import { initSocket } from './config/socket';
import { initFirebase } from './config/firebase';
import { InsightsCronService } from './services/insightsCron.service';
import { validateEnvironment } from './config/env.validator';

const PORT = parseInt(process.env.PORT || '5001', 10);
const REDIS_REQUIRED = process.env.REDIS_REQUIRED === 'true';
let httpServer: http.Server;

async function startServer() {
  try {
    // 1. Validate environment variables before anything else
    validateEnvironment();

    // 2. Connect to database
    await connectDB();

    // 2b. Apply supplementary SQL migrations (non-fatal)
    try {
      const { applyProductionSqlMigrations } = await import('./scripts/applyProductionSqlMigrations');
      await applyProductionSqlMigrations(pool);
    } catch (err) {
      console.error('[Server] Production SQL migrations failed (non-fatal):', err instanceof Error ? err.message : err);
    }
    
    // 3. Optional Services
    initFirebase();

    // 4. Test Redis (required only when REDIS_REQUIRED=true)
    try {
      await redis.connect();
      await redis.ping();
      console.log('[Server] Redis connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Server] Redis connection failed: ${message}`);
      redis.disconnect(); // Stop background reconnect attempts

      if (REDIS_REQUIRED) {
        console.error('[Server] REDIS_REQUIRED=true and Redis is unavailable. Exiting.');
        process.exit(1);
      }

      console.warn(
        '[Server] Continuing without Redis (REDIS_REQUIRED is not true). ' +
          'Queue/worker features will remain disabled until Redis is available.',
      );
    }

    // 5. Create HTTP server (required for Socket.io)
    httpServer = http.createServer(app);

    // Initialise Socket.io
    initSocket(httpServer);
    console.log('[Server] Socket.io initialised');

    // 6. Start Server
    httpServer.listen(PORT, async () => {
      console.log(
        `[Server] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`,
      );
      InsightsCronService.startScheduler();

      // Initialize background workers and queue-backed schedulers only when Redis is available
      try {
        if (isRedisAvailable()) {
          const { startWorkers } = await import('./workers');
          startWorkers();
          const { setupDailyScheduler } = await import('./scheduler/dailyScheduler');
          await setupDailyScheduler();

          const { setupNotificationScheduler } = await import('./scheduler/notificationScheduler');
          setupNotificationScheduler();
        } else {
          console.warn('[Server] Redis unavailable. Skipping workers and queue-backed schedulers.');
        }
      } catch (err) {
        console.error('[Server] Failed to initialize workers or scheduler:', err);
      }
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

// ── Graceful Shutdown ───────────────────────────────────────────────────────
async function gracefulShutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop accepting new HTTP requests
  if (httpServer) {
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        console.log('[Server] HTTP server closed');
        resolve();
      });
    });
  }

  // 2. Stop workers
  try {
    const { stopWorkers } = await import('./workers');
    await stopWorkers();
    console.log('[Server] Background workers stopped');
  } catch (err) {
    console.error('[Server] Error stopping workers:', err);
  }

  // 3. Disconnect Redis
  try {
    redis.disconnect();
    console.log('[Server] Redis disconnected');
  } catch (err) {
    console.error('[Server] Error disconnecting Redis:', err);
  }

  // 4. Disconnect Prisma
  try {
    await prisma.$disconnect();
    console.log('[Server] Prisma disconnected');
  } catch (err) {
    console.error('[Server] Error disconnecting Prisma:', err);
  }

  // 5. Disconnect pg pool
  try {
    await pool.end();
    console.log('[Server] Database pool closed');
  } catch (err) {
    console.error('[Server] Error closing database pool:', err);
  }

  console.log('[Server] Shutdown complete. Exiting.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();