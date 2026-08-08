import { Router } from 'express';
import { body, query } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { OtpController } from '../controllers/otp.controller';
import rateLimit from 'express-rate-limit';

const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: { success: false, message: 'Too many OTP requests, please try again later.' },
});


const router = Router();

const weakPasswords = new Set([
  '123456',
  '12345678',
  '123456789',
  'password',
  'password123',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'welcome123',
  'letmein123',
]);

const passwordPolicy = body('password').custom((value: string, { req }) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Password is required');
  }
  if (value.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(value)) {
    throw new Error('Password must include at least one uppercase letter');
  }
  if (!/[a-z]/.test(value)) {
    throw new Error('Password must include at least one lowercase letter');
  }
  if (!/[0-9]/.test(value)) {
    throw new Error('Password must include at least one number');
  }
  
  const lowerPassword = value.toLowerCase();
  
  if (weakPasswords.has(lowerPassword)) {
    throw new Error('Password is too common. Please choose a stronger password');
  }

  // Prevent patterns like abc123, 123abc, qwerty
  const commonPatterns = ['abc123', '123abc', 'qwerty', 'asdfgh'];
  if (commonPatterns.some(pattern => lowerPassword.includes(pattern))) {
    throw new Error('Password contains a common easily guessable pattern');
  }

  // No User Info: Prevent password from containing email prefix
  const email = req.body.email;
  if (email && typeof email === 'string') {
    const prefix = email.split('@')[0];
    if (prefix.length >= 4 && lowerPassword.includes(prefix.toLowerCase())) {
      throw new Error('Password cannot contain your email or username');
    }
  }

  return true;
});

const oauthCredentialPresence = body().custom((value) => {
  const payload = (value ?? {}) as {
    tokenOrCode?: unknown;
    idToken?: unknown;
    code?: unknown;
  };

  const hasCredential = Boolean(payload.tokenOrCode || payload.idToken || payload.code);
  if (!hasCredential) {
    throw new Error('At least one of tokenOrCode, idToken, or code is required');
  }

  return true;
});

router.post(
  '/register',
  body('email').isEmail().normalizeEmail(),
  passwordPolicy,
  body('role').isIn(['applicant', 'recruiter']),
  body('referralCode').optional().isString(),
  validate,
  AuthController.register,
);

router.get('/verify-email', query('token').notEmpty(), validate, AuthController.verifyEmail);

router.post(
  '/verify-email',
  body('token').notEmpty().isString(),
  body('email').optional().isString(),
  validate,
  (req, res, next) => {
    if (req.body.email) {
      // It's a standard OTP verification
      req.query.email = req.body.email;
      req.query.token = req.body.token;
      return AuthController.verifyEmail(req, res, next);
    }
    return AuthController.verifyEmailPost(req, res, next);
  }
);

router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  AuthController.login,
);

router.post(
  '/oauth/state',
  body('provider').isIn(['github', 'linkedin']),
  body('state').notEmpty().isString().isLength({ min: 16, max: 128 }),
  validate,
  AuthController.registerOAuthState,
);

router.post(
  '/google',
  oauthCredentialPresence,
  body('idToken').notEmpty().isString(),
  validate,
  AuthController.googleLogin,
);

router.post(
  '/github',
  body('code').notEmpty().isString(),
  body('state').notEmpty().isString(),
  validate,
  AuthController.githubLogin,
);

router.post(
  '/linkedin',
  body('code').notEmpty().isString(),
  body('state').notEmpty().isString(),
  validate,
  AuthController.linkedinLogin,
);

router.post(
  '/refresh-token',
  body('refreshToken').notEmpty(),
  validate,
  AuthController.refreshToken,
);

router.post(
  '/logout',
  body('refreshToken').optional().isString(),
  validate,
  AuthController.logout,
);

router.post(
  '/forgot-password',
  body('email').isEmail().normalizeEmail(),
  validate,
  AuthController.forgotPassword,
);

router.post(
  '/reset-password',
  body('token').notEmpty(),
  passwordPolicy,
  validate,
  AuthController.resetPassword,
);

// --- OTP Verification Routes ---
router.post(
  '/otp/send',
  authenticate,
  otpRateLimiter,
  body('channel').isIn(['email', 'whatsapp']).withMessage('Channel must be email or whatsapp'),
  validate,
  OtpController.sendOtp,
);

router.post(
  '/otp/verify',
  authenticate,
  body('channel').isIn(['email', 'whatsapp']).withMessage('Channel must be email or whatsapp'),
  body('code').notEmpty().isString().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  validate,
  OtpController.verifyOtp,
);

router.get('/me', authenticate, AuthController.me);

// Dev-only: instantly verify an account without needing the email token
router.post(
  '/add-email',
  authenticate,
  body('email').isEmail().normalizeEmail(),
  validate,
  AuthController.addEmail,
);

router.post(
  '/resend-verification',
  authenticate,
  validate,
  AuthController.resendVerification,
);

if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/verify', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'email required' });
      return;
    }
    const pool = (await import('../config/database')).default;
    const result = await pool.query(
      `UPDATE users SET is_verified = TRUE, verify_token = NULL WHERE email = $1 RETURNING id, email`,
      [email],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    // Grant registration credits if not already granted
    const { CreditService } = await import('../services/credit.service');
    try {
      await CreditService.grantRegistrationCredits(result.rows[0].id);
    } catch {}
    res.json({ success: true, message: `✅ ${email} verified`, data: result.rows[0] });
  });
}

export default router;
