import { Router } from 'express';
import { body } from 'express-validator';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Public/optional endpoints
router.get('/tiers', SubscriptionController.getActiveTiers);

// Authenticated endpoints
router.use(authenticate);
router.post(
  '/subscribe',
  body('tierName').isString().notEmpty(),
  body('billingCycle').optional().isIn(['monthly', 'annual']),
  validate,
  SubscriptionController.subscribe
);

router.post(
  '/subscribe/initiate',
  body('tierName').isString().notEmpty(),
  body('billingCycle').optional().isIn(['monthly', 'annual']),
  validate,
  SubscriptionController.initiateSubscribe
);

router.post(
  '/subscribe/verify',
  body('razorpayOrderId').isString().notEmpty(),
  body('razorpayPaymentId').isString().notEmpty(),
  body('razorpaySignature').isString().notEmpty(),
  body('tierName').isString().notEmpty(),
  body('billingCycle').optional().isIn(['monthly', 'annual']),
  validate,
  SubscriptionController.verifySubscribe
);
router.get('/check-limit/:featureKey', SubscriptionController.checkFeatureLimit);

export default router;
