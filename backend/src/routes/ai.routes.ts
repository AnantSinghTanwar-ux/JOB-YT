import { Router } from 'express';
import { body } from 'express-validator';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Apply authentication to all AI routes
router.use(authenticate);

/**
 * Main AI orchestration endpoint
 * Accepts any AI task type and routes to appropriate handler
 */
router.post(
  '/orchestrate',
  body('type').isIn(['ats_analysis', 'resume_processing', 'matching_workflow', 'job_ingestion']),
  body('data').isObject(),
  validate,
  AIController.orchestrate
);

/**
 * Get available AI task types
 */
router.get('/task-types', AIController.getTaskTypes);

/**
 * Convenience endpoints for specific AI tasks
 */

// ATS Analysis
router.post(
  '/analyze-ats',
  body('resumeData').isObject(),
  body('jobData').isObject(),
  validate,
  AIController.analyzeATS
);

// Resume Processing
router.post(
  '/process-resume',
  body('rawText').isString().notEmpty(),
  validate,
  AIController.processResume
);

router.post(
  '/job-parse',
  body('rawText').isString().notEmpty(),
  validate,
  AIController.ingestJob
);

// Matching Workflow
router.post(
  '/match-workflow',
  body('userSkills').isArray(),
  body('jobSkills').isArray(),
  body('resumeText').optional().isString(),
  body('jobDescription').optional().isString(),
  validate,
  AIController.matchWorkflow
);

export default router;
