import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { sendSuccess } from '../utils/response';

export const SubscriptionController = {
  async getActiveTiers(req: Request, res: Response, next: NextFunction) {
    try {
      const audience = req.query.audience as 'STUDENT' | 'EMPLOYER' | undefined;
      const tiers = await SubscriptionService.getActiveTiers(audience);
      sendSuccess(res, tiers);
    } catch (err) {
      next(err);
    }
  },

  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { tierName, billingCycle } = req.body;
      const subscription = await SubscriptionService.subscribeUser(userId, tierName, billingCycle || 'monthly');
      sendSuccess(res, subscription, 'Subscription successful', 201);
    } catch (err) {
      next(err);
    }
  },

  async checkFeatureLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const featureKey = req.params.featureKey as string;
      const limit = await SubscriptionService.checkFeatureLimit(userId, featureKey);
      sendSuccess(res, { limit });
    } catch (err) {
      next(err);
    }
  },

  async initiateSubscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { tierName, billingCycle } = req.body;
      const checkout = await SubscriptionService.initiateSubscriptionCheckout(userId, tierName, billingCycle || 'monthly');
      sendSuccess(res, checkout, 'Checkout initialized successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async verifySubscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, tierName, billingCycle } = req.body;
      const verification = await SubscriptionService.verifySubscriptionCheckout(userId, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        tierName,
        billingCycle: billingCycle || 'monthly',
      });
      sendSuccess(res, verification, 'Subscription payment verified successfully');
    } catch (err) {
      next(err);
    }
  },
};
