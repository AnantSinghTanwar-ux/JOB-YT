import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import jobRoutes from './job.routes';
import applicationRoutes from './application.routes';
import creditRoutes from './credit.routes';
import notificationRoutes from './notification.routes';
import messageRoutes from './message.routes';
import paymentRoutes from './payment.routes';
import referralRoutes from './referral.routes';
import adminRoutes from './admin.routes';
import analyticsRoutes from './analytics.routes';
import pipelineRoutes from './pipeline.routes';
import recruiterRoutes from './recruiter.routes';
import roadmapRoutes from './roadmap.routes';
import uploadRoutes from './upload.routes';
import aiRoutes from './ai.routes';
import interviewRoutes from './interview.routes';
import apiKeyRoutes from './apiKey.routes';
import webhookRoutes from './webhook.routes';
import calendarRoutes from './calendar.routes';
import codingRoutes from './coding.routes';
import autoApplyRoutes from './autoApply.routes';
import interviewInviteRoutes from './interviewInvite.routes';
import notificationPreferenceRoutes from './notificationPreference.routes';
import broadcastRoutes from './broadcast.routes';
import pushRoutes from './push.routes';
import coachRoutes from './coach.routes';
import learningRoutes from './learning.routes';
import subscriptionRoutes from './subscription.routes';

const router = Router();

import pool from '../config/database';
import { isRedisAvailable } from '../config/redis';

router.get('/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    const client = await pool.connect();
    client.release();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
  }

  const redisStatus = isRedisAvailable() ? 'connected' : 'disconnected';
  
  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({ 
    success: isHealthy, 
    message: 'API Health Status',
    services: {
      api: 'running',
      database: dbStatus,
      redis: redisStatus
    },
    timestamp: new Date().toISOString() 
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/credits', creditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/payments', paymentRoutes);
router.use('/referrals', referralRoutes);
router.use('/admin', adminRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/pipeline', pipelineRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/roadmaps', roadmapRoutes);
router.use('/upload', uploadRoutes);
router.use('/ai', aiRoutes);
router.use('/interviews', interviewRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/calendar', calendarRoutes);
router.use('/coding', codingRoutes);
router.use('/auto-apply', autoApplyRoutes);
router.use('/coach', coachRoutes);
router.use('/', interviewInviteRoutes);
router.use('/notification-preferences', notificationPreferenceRoutes);
router.use('/', broadcastRoutes);
router.use('/push', pushRoutes);
router.use('/learning', learningRoutes);
router.use('/subscriptions', subscriptionRoutes);

export default router;

// Debug route
import { debugInfo } from '../controllers/debug.controller';
router.get('/debug-ai-config', debugInfo);
