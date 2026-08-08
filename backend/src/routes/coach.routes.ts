import { Router } from 'express';
import { body, param } from 'express-validator';
import { CoachController } from '../controllers/coach.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadResume } from '../middleware/upload';

const router = Router();

// Authenticate all coach routes
router.use(authenticate);

// Start a new coaching session
router.post(
  '/sessions',
  uploadResume.single('file'),
  body('mode')
    .isIn(['general', 'resume_review', 'interview_prep', 'career_advice', 'salary_negotiation'])
    .withMessage('Invalid session mode'),
  body('title').optional().isString().trim(),
  validate,
  CoachController.startSession
);

// List all coaching sessions for student
router.get('/sessions', CoachController.listSessions);

// Get proactive advice dashboard nudges
router.get('/nudges', CoachController.getNudges);

// Get specific coaching session details
router.get(
  '/sessions/:id',
  param('id').isUUID().withMessage('Invalid session ID'),
  validate,
  CoachController.getSession
);

// Send message to coaching session
router.post(
  '/sessions/:id/messages',
  param('id').isUUID().withMessage('Invalid session ID'),
  body('message').isString().notEmpty().withMessage('Message is required'),
  validate,
  CoachController.sendMessage
);

// Submit feedback for a message
router.post(
  '/messages/:messageId/feedback',
  param('messageId').isUUID().withMessage('Invalid message ID'),
  body('feedback').isIn(['up', 'down']).withMessage('Feedback must be up or down'),
  body('comment').optional().isString().trim(),
  validate,
  CoachController.submitFeedback
);

export default router;
