import { Router } from 'express';
import { body } from 'express-validator';
import { RecruiterController } from '../controllers/recruiter.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { employerGuard } from '../middleware/employerGuard';
import { validate } from '../middleware/validate';
import pool from '../config/database';

const router = Router();

/**
 * GET /api/v1/recruiter/broadcasts
 * Returns paginated broadcast history for the authenticated recruiter
 */
router.get(
  '/broadcasts',
  authenticate,
  authorize('recruiter', 'admin'),
  async (req, res) => {
    try {
      const recruiterId = req.user!.userId;
      const { rows } = await pool.query(
        `SELECT bm.id, bm.job_id, j.title as job_title, bm.message_body, bm.channels,
                bm.created_at,
                (SELECT COUNT(*)::int FROM applications WHERE job_id = bm.job_id) as recipient_count
         FROM broadcast_messages bm
         LEFT JOIN jobs j ON j.id = bm.job_id
         WHERE bm.recruiter_id = $1
         ORDER BY bm.created_at DESC
         LIMIT 50`,
        [recruiterId]
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('[RecruiterRoutes] Error fetching broadcasts:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * GET /api/v1/recruiter/profile
 * Fetch authenticated recruiter's profile
 */
router.get(
  '/profile',
  authenticate,
  authorize('recruiter'),
  employerGuard,
  RecruiterController.getRecruiterProfile,
);

/**
 * PUT /api/v1/recruiter/profile
 * Update recruiter profile (partial update allowed)
 */
router.put(
  '/profile',
  authenticate,
  authorize('recruiter'),
  employerGuard,
  body('companyName').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Company name cannot be empty'),
  body('company_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Company email must be a valid email address')
    .normalizeEmail(),
  body('industry').optional({ checkFalsy: true }).trim().isString(),
  body('description').optional({ checkFalsy: true }).trim().isString(),
  body('company_size').optional({ checkFalsy: true }).trim().isString(),
  body('website').optional({ checkFalsy: true }).trim().isString(),
  body('location').optional({ checkFalsy: true }).trim().isString(),
  body('logo_url').optional({ checkFalsy: true }).trim().isString(),
  validate,
  RecruiterController.updateRecruiterProfile,
);

/**
 * POST /api/v1/recruiter/profile
 * Create recruiter profile (first-time registration)
 */
router.post(
  '/profile',
  authenticate,
  authorize('recruiter'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('company_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Company email must be a valid email address')
    .normalizeEmail(),
  body('industry').optional({ checkFalsy: true }).trim().isString(),
  body('description').optional({ checkFalsy: true }).trim().isString(),
  body('company_size').optional({ checkFalsy: true }).trim().isString(),
  body('website').optional({ checkFalsy: true }).trim().isString(),
  body('location').optional({ checkFalsy: true }).trim().isString(),
  validate,
  RecruiterController.createRecruiterProfile,
);

export default router;
