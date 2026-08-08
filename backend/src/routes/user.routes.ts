import { Router } from 'express';
import { body, query } from 'express-validator';
import { UserController } from '../controllers/user.controller';
import { ResumeController } from '../controllers/resume.controller';
import { ProjectController } from '../controllers/project.controller';
import { CertificationController } from '../controllers/certification.controller';
import * as RoadmapProgressController from '../controllers/roadmapProgress.controller';
import { authenticate, optionalAuth, authorize } from '../middleware/auth';
import { uploadResume, uploadImage } from '../middleware/upload';
import { validate } from '../middleware/validate';

const router = Router();

// Public profile endpoint
router.get('/public/:userId', optionalAuth, UserController.getPublicProfile);

router.use(authenticate);

// ── Own profile ────────────────────────────────────────────────────────────────
router.get('/me', UserController.getMyProfile);

router.put(
  '/me',
  body('name').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((value: string) => value ? value.replace(/[\s\-().]/g, '') : value)
    .isMobilePhone('any'),
  body('bio').optional({ nullable: true }).isString(),
  body('skills').optional().isArray(),
  body('experience').optional().isArray(),
  body('education').optional().isArray(),
  body('visibility').optional().isIn(['public', 'private', 'hidden']).withMessage('Invalid visibility status'),
  body('companyName').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('industry').optional({ nullable: true, checkFalsy: true }).isString(),
  body('website').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('portfolio_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: false })
    .withMessage('Portfolio URL is not a valid URL'),
  body('github_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: false })
    .withMessage('GitHub URL is not a valid URL'),
  body('linkedin_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: false })
    .withMessage('LinkedIn URL is not a valid URL')
    .custom((value: string) => {
      if (!value) return true;
      const normalized = value.replace(/^https?:\/\//i, '').toLowerCase();
      const domainMatch = normalized.match(/^(?:[a-z0-9-]+\.)?linkedin\.com\//);
      if (!domainMatch) {
        throw new Error('LinkedIn URL must be from linkedin.com (e.g. https://linkedin.com/in/username)');
      }
      return true;
    }),
  validate,
  UserController.updateProfile,
);

router.post(
  '/me/import/linkedin',
  authorize('applicant'),
  UserController.importLinkedInProfile
);

router.post(
  '/me/import/github',
  authorize('applicant'),
  UserController.importGithubProfile
);

router.get('/me/preferences', UserController.getPreferences);
router.put(
  '/me/preferences',
  body('email_alerts_enabled').optional().isBoolean(),
  body('whatsapp_alerts_enabled').optional().isBoolean(),
  body('push_alerts_enabled').optional().isBoolean(),
  validate,
  UserController.updatePreferences
);

router.post(
  '/me/device-tokens',
  body('token').isString().trim().notEmpty().withMessage('Token is required'),
  body('platform').isString().trim().notEmpty().withMessage('Platform is required'),
  validate,
  UserController.registerDeviceToken
);

router.delete(
  '/me/device-tokens',
  body('token').isString().trim().notEmpty().withMessage('Token is required'),
  validate,
  UserController.removeDeviceToken
);

// ── File uploads ───────────────────────────────────────────────────────────────
router.post(
  '/me/resume',
  authorize('applicant'),
  uploadResume.single('resume'),
  UserController.uploadResume,
);

router.post(
  '/me/resume-parse',
  authorize('applicant'),
  uploadResume.single('resume'),
  UserController.parseResume,
);

router.post('/me/resume-draft', authorize('applicant'), ResumeController.generateDraft);
router.get(
  '/me/resume-latex',
  authorize('applicant'),
  query('download').optional().isBoolean(),
  query('resume_id').optional().isUUID(),
  validate,
  ResumeController.getLatex,
);

router.post('/me/photo', uploadImage.single('photo'), UserController.uploadPhoto);

// ── Resumes (applicant only) ────────────────────────────────────────────────
router.get('/me/resumes', authorize('applicant'), ResumeController.getMyResumes);
router.get(
  '/me/resumes/default',
  authorize('applicant'),
  ResumeController.getDefaultResume,
);
router.get('/me/resumes/:id', authorize('applicant'), ResumeController.getById);
router.patch(
  '/me/resumes/:id/set-default',
  authorize('applicant'),
  ResumeController.setDefault,
);
router.delete('/me/resumes/:id', authorize('applicant'), ResumeController.delete);
router.post(
  '/me/resume-score',
  authorize('applicant'),
  uploadResume.single('file'),
  body('jobDescription').isString(),
  body('resumeText').optional().isString(),
  body('resume_id').optional().isUUID(),
  validate,
  ResumeController.scoreATS
);

// ── Saved Jobs (applicant only) ───────────────────────────────────────────────
router.get('/me/saved-jobs', authorize('applicant'), UserController.getSavedJobs);
router.post('/me/saved-jobs/:jobId', authorize('applicant'), UserController.saveJob);
router.delete('/me/saved-jobs/:jobId', authorize('applicant'), UserController.unsaveJob);

// ── Project Showcase (applicant only) ───────────────────────────────────────────
router.get('/me/projects', authorize('applicant'), ProjectController.getProjects);
router.post(
  '/me/projects',
  authorize('applicant'),
  body('title').isString().trim().notEmpty().withMessage('Project title is required'),
  body('description').optional({ nullable: true }).isString(),
  body('tech_stack').optional().custom((val) => Array.isArray(val) || typeof val === 'string'),
  body('github_url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('GitHub Link must be a valid URL'),
  body('demo_url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Demo Link must be a valid URL'),
  body('media_url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Media Link must be a valid URL'),
  validate,
  ProjectController.addProject
);
router.put(
  '/me/projects/:id',
  authorize('applicant'),
  body('title').optional().isString().trim().notEmpty().withMessage('Project title cannot be empty'),
  body('description').optional({ nullable: true }).isString(),
  body('tech_stack').optional().custom((val) => Array.isArray(val) || typeof val === 'string'),
  body('github_url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('GitHub Link must be a valid URL'),
  body('demo_url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Demo Link must be a valid URL'),
  body('media_url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Media Link must be a valid URL'),
  validate,
  ProjectController.updateProject
);
router.delete('/me/projects/:id', authorize('applicant'), ProjectController.deleteProject);

// ── Certification Showcase (applicant only) ───────────────────────────────────
router.get('/me/certifications', authorize('applicant'), CertificationController.getCertifications);
router.post(
  '/me/certifications',
  authorize('applicant'),
  body('name').isString().trim().notEmpty().withMessage('Certification name is required'),
  body('issuer').isString().trim().notEmpty().withMessage('Issuer is required'),
  body('issue_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Issue date must be a valid date'),
  body('credential_url').optional({ nullable: true, checkFalsy: true }).isURL({ require_protocol: false }).withMessage('Credential URL must be a valid URL'),
  body('file_url').optional({ nullable: true, checkFalsy: true }).isURL({ require_protocol: false }).withMessage('File URL must be a valid URL'),
  validate,
  CertificationController.addCertification
);
router.put(
  '/me/certifications/:id',
  authorize('applicant'),
  body('name').optional().isString().trim().notEmpty().withMessage('Certification name cannot be empty'),
  body('issuer').optional().isString().trim().notEmpty().withMessage('Issuer cannot be empty'),
  body('issue_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Issue date must be a valid date'),
  body('credential_url').optional({ nullable: true, checkFalsy: true }).isURL({ require_protocol: false }).withMessage('Credential URL must be a valid URL'),
  body('file_url').optional({ nullable: true, checkFalsy: true }).isURL({ require_protocol: false }).withMessage('File URL must be a valid URL'),
  validate,
  CertificationController.updateCertification
);
router.delete('/me/certifications/:id', authorize('applicant'), CertificationController.deleteCertification);

// ── Roadmap Progress & Recommendations ────────────────────────────────────────
router.get('/:userId/roadmaps/:roadmapId/progress', RoadmapProgressController.getUserProgress);
router.get(
  '/:userId/roadmaps/:roadmapId/recommend-next-skill',
  RoadmapProgressController.getRecommendedNextSkill,
);

// ── Public profile ─────────────────────────────────────────────────────────────
router.get('/:userId/resumes/:id/secure-url', ResumeController.getSecureUrl);

export default router;
