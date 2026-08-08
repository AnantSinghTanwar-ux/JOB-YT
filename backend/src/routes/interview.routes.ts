import { Router } from 'express';
import { body, param } from 'express-validator';
import { InterviewController } from '../controllers/interview.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireEmail } from '../middleware/requireEmail';
import { employerGuard } from '../middleware/employerGuard';
import { validate } from '../middleware/validate';
import { uploadAudio } from '../middleware/upload';

const router = Router();

// Require authenticated user with verified email
router.use(authenticate, requireEmail);

// List all interviews (candidate sees own, recruiter sees own, admin sees all)
router.get('/', authorize('applicant', 'recruiter', 'admin'), InterviewController.listInterviews);

// Start a new mock interview session
router.post(
  '/sessions',
  body('roleTitle')
    .isString()
    .notEmpty()
    .withMessage('Role title is required'),
  body('jobDescription')
    .optional()
    .isString(),
  body('questionCount')
    .optional()
    .isInt({ min: 1, max: 15 })
    .withMessage('Question count must be a positive integer between 1 and 15')
    .toInt(),
  validate,
  InterviewController.startSession
);

// Fetch readiness dashboard score & progression history logs
router.get(
  '/readiness',
  InterviewController.getReadiness
);

// List all mock interview sessions
router.get(
  '/sessions',
  InterviewController.listSessions
);

// Fetch session details, questions, and responses
router.get(
  '/sessions/:id',
  param('id')
    .isUUID()
    .withMessage('Invalid session ID'),
  validate,
  InterviewController.getSession
);

// Submit student response for a specific question
router.post(
  '/sessions/:id/submit',
  param('id')
    .isUUID()
    .withMessage('Invalid session ID'),
  body('questionId')
    .isUUID()
    .withMessage('Invalid question ID'),
  body('responseText')
    .isString()
    .notEmpty()
    .withMessage('Response text is required and cannot be empty'),
  validate,
  InterviewController.submitResponse
);

// Complete interview session, triggering score aggregation & readiness update
router.post(
  '/sessions/:id/complete',
  param('id')
    .isUUID()
    .withMessage('Invalid session ID'),
  validate,
  InterviewController.completeSession
);

// Fetch compiled evaluation PDF report for a session
router.get(
  '/sessions/:id/report',
  param('id')
    .isUUID()
    .withMessage('Invalid session ID'),
  validate,
  InterviewController.getReport
);

// Bulk dispatch interviews (recruiter/admin only)
// Schedule a new interview (recruiter/admin only)
router.post(
  '/',
  authorize('recruiter', 'admin'),
  employerGuard,
  body('applicationId').isUUID().withMessage('applicationId must be a valid UUID'),
  body('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid ISO8601 date string'),
  validate,
  InterviewController.scheduleInterview,
);

// Get specific interview details (candidate, interviewer, or admin only)
router.get('/:id', authorize('applicant', 'recruiter', 'admin'), InterviewController.getInterviewDetails);

// Update private notes (recruiter/admin only)
router.patch(
  '/:id/notes',
  authorize('recruiter', 'admin'),
  employerGuard,
  body('notes').isString().withMessage('notes must be a string'),
  validate,
  InterviewController.updateNotes,
);

// Start the live interview session (recruiter/admin only)
router.post(
  '/:id/start',
  authorize('recruiter', 'admin'),
  employerGuard,
  InterviewController.startInterview,
);

// End/Complete the live interview session (recruiter/admin only)
router.post(
  '/:id/end',
  authorize('recruiter', 'admin'),
  employerGuard,
  body('feedback').optional().isString().withMessage('feedback must be a string'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
  body('codeContent').optional().isString().withMessage('codeContent must be a string'),
  body('language').optional().isString().withMessage('language must be a string'),
  validate,
  InterviewController.endInterview,
);

// Transcribe voice audio channel snippets (applicant, recruiter, admin)
router.post(
  '/:id/transcribe',
  authorize('applicant', 'recruiter', 'admin'),
  uploadAudio.single('file'),
  InterviewController.transcribeAudio,
);

// Synthesize text to speech audio output (applicant, recruiter, admin)
router.post(
  '/:id/tts',
  authorize('applicant', 'recruiter', 'admin'),
  body('text').isString().trim().notEmpty().withMessage('text must be a non-empty string'),
  validate,
  InterviewController.generateTTS,
);

// Async video interview consent & submission
router.post(
  '/video/consent',
  authorize('applicant'),
  body('consentGiven').isBoolean(),
  body('consentVersion').optional().isString(),
  body('retentionDays').optional().isInt({ min: 1 }),
  validate,
  InterviewController.saveVideoConsent
);

router.post(
  '/video/submit',
  authorize('applicant'),
  body('applicationId').isUUID(),
  body('videoUrl').isString().notEmpty(),
  validate,
  InterviewController.submitVideoInterview
);

export default router;
