import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '../config/prisma';
import { AppError } from '../utils/appError';

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new AppError('Razorpay is not configured', 500);
  }

  return {
    keyId,
    keySecret,
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
  };
};

export interface SubscriptionTierData {
  name: string;
  targetAudience: 'STUDENT' | 'EMPLOYER';
  priceMonthly: number;
  priceAnnual: number;
  features: Record<string, any>;
}

export const SubscriptionService = {
  /**
   * Retrieve all active subscription tiers
   */
  async getActiveTiers(targetAudience?: 'STUDENT' | 'EMPLOYER') {
    return prisma.subscription_tiers.findMany({
      where: {
        is_active: true,
        ...(targetAudience && { target_audience: targetAudience })
      }
    });
  },

  /**
   * Assign a tier to a user (creating or updating their subscription)
   */
  async subscribeUser(userId: string, tierName: string, billingCycle: 'monthly' | 'annual' = 'monthly') {
    const tier = await prisma.subscription_tiers.findUnique({ where: { name: tierName } });
    if (!tier) throw new Error(`Tier ${tierName} not found`);

    const periodEnd = new Date();
    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return prisma.subscriptions.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        tier_id: tier.id,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: periodEnd,
        cancel_at_period_end: false
      },
      update: {
        tier_id: tier.id,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: periodEnd,
        cancel_at_period_end: false
      }
    });
  },

  /**
   * Check if a user has access to a specific feature based on their tier.
   * Features JSON might look like: { "maxJobs": 5, "aiCreditsPerMonth": 100 }
   */
  async checkFeatureLimit(userId: string, featureKey: string): Promise<any> {
    const sub = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
      include: { tier: true }
    });

    if (!sub || sub.status !== 'active') {
      // Fallback to FREE tier if it exists
      const freeTier = await prisma.subscription_tiers.findFirst({
        where: { name: 'FREE', is_active: true }
      });
      if (!freeTier) return null;
      
      const features = freeTier.features as Record<string, any>;
      return features[featureKey] ?? null;
    }

    const features = sub.tier.features as Record<string, any>;
    return features[featureKey] ?? null;
  },

  async initiateSubscriptionCheckout(userId: string, tierName: string, billingCycle: 'monthly' | 'annual' = 'monthly') {
    const { client, keyId } = getRazorpay();
    
    const tier = await prisma.subscription_tiers.findUnique({ where: { name: tierName } });
    if (!tier) throw new AppError(`Subscription tier ${tierName} not found`, 404);

    const price = billingCycle === 'annual' ? Number(tier.price_annual) : Number(tier.price_monthly);

    // Create a pending payment record
    const payment = await prisma.payments.create({
      data: {
        user_id: userId,
        plan_id: null,
        amount: price,
        currency: 'INR',
        status: 'pending',
      }
    });

    const amountInPaise = Math.round(price * 100);
    const order = await client.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: payment.id,
      notes: {
        paymentId: payment.id,
        userId,
        tierName,
        billingCycle,
      },
    });

    // Update status with order ID as gateway_ref
    await prisma.payments.update({
      where: { id: payment.id },
      data: {
        gateway_ref: order.id,
      }
    });

    return {
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId,
      tier: {
        name: tier.name,
        billingCycle,
      }
    };
  },

  async verifySubscriptionCheckout(userId: string, params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    tierName: string;
    billingCycle: 'monthly' | 'annual';
  }) {
    const { keySecret } = getRazorpay();

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== params.razorpaySignature) {
      // Mark payment as failed
      const payment = await prisma.payments.findFirst({
        where: { gateway_ref: params.razorpayOrderId }
      });
      if (payment) {
        await prisma.payments.update({
          where: { id: payment.id },
          data: { status: 'failed' }
        });
      }
      throw new AppError('Payment signature verification failed', 400);
    }

    // Mark payment as success
    const payment = await prisma.payments.findFirst({
      where: { gateway_ref: params.razorpayOrderId }
    });
    if (payment) {
      await prisma.payments.update({
        where: { id: payment.id },
        data: { status: 'success' }
      });
    }

    // Activate the subscription
    await SubscriptionService.subscribeUser(userId, params.tierName, params.billingCycle);

    return { verified: true };
  },
};
