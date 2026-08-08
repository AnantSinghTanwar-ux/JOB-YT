import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDB } from './config/database';
import redis, { isRedisAvailable } from './config/redis';
import { initSocket } from './config/socket';
import { initFirebase } from './config/firebase';
import { InsightsCronService } from './services/insightsCron.service';
import { validateEnvironment } from './config/env.validator';

const PORT = parseInt(process.env.PORT || '5001', 10);

async function startServer() {
  try {
    // 1. Validate environment variables before anything else
    validateEnvironment();

    // 2. Connect to database
    await connectDB();
    
    // 3. Optional Services
    initFirebase();

    // Test Redis (non-blocking for local Docker runs)
    try {
      // With lazyConnect enabled, connect explicitly.
      await redis.connect();
      await redis.ping();
      console.log('Redis connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Redis not available, continuing without Redis connection (${message})`);
      redis.disconnect(); // Stop background reconnect attempts
    }

    // 4. Create HTTP server (required for Socket.io)
    const httpServer = http.createServer(app);

    // Initialise Socket.io
    initSocket(httpServer);
    console.log('Socket.io initialised');

    // 5. Start Server
    httpServer.listen(PORT, async () => {
      console.log(
        `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`,
      );
      InsightsCronService.startScheduler();

      // Initialize background workers and scheduler ONLY if Redis is available
      try {
        if (isRedisAvailable()) {
          const { startWorkers } = await import('./workers');
          startWorkers();
          const { setupDailyScheduler } = await import('./scheduler/dailyScheduler');
          await setupDailyScheduler();
        } else {
          console.warn('[Scheduler] Redis is not available. Background workers and Daily scheduler will NOT be started.');
        }
        
        const { setupNotificationScheduler } = await import('./scheduler/notificationScheduler');
        setupNotificationScheduler(); // Does not strictly require BullMQ if using pure node-cron, but the actions enqueue to BullMQ
      } catch (err) {
        console.error('Failed to initialize workers or scheduler:', err);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();