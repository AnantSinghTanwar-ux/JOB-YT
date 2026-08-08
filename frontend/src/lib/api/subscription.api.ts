import { api } from '../api';

export interface SubscriptionTier {
  id: string;
  name: string;
  target_audience: 'STUDENT' | 'EMPLOYER';
  price_monthly: number;
  price_annual: number;
  currency: string;
  features: Record<string, any>;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier_id: string;
  billing_cycle: 'monthly' | 'annual';
  status: 'active' | 'canceled' | 'expired';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  tier?: SubscriptionTier;
}

export const subscriptionApi = {
  async getTiers(audience?: 'STUDENT' | 'EMPLOYER'): Promise<SubscriptionTier[]> {
    const path = audience ? `/subscriptions/tiers?audience=${audience}` : '/subscriptions/tiers';
    const res = await api.get<SubscriptionTier[]>(path);
    return res.data ?? [];
  },

  async subscribe(tierName: string, billingCycle: 'monthly' | 'annual' = 'monthly'): Promise<Subscription> {
    const res = await api.post<Subscription>('/subscriptions/subscribe', { tierName, billingCycle });
    return res.data!;
  },

  async initiateSubscribe(tierName: string, billingCycle: 'monthly' | 'annual' = 'monthly'): Promise<any> {
    const res = await api.post<any>('/subscriptions/subscribe/initiate', { tierName, billingCycle });
    return res.data;
  },

  async verifySubscribe(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    tierName: string;
    billingCycle: 'monthly' | 'annual';
  }): Promise<any> {
    const res = await api.post<any>('/subscriptions/subscribe/verify', params);
    return res.data;
  },

  async checkLimit(featureKey: string): Promise<any> {
    const res = await api.get<{ limit: any }>(`/subscriptions/check-limit/${featureKey}`);
    return res.data?.limit ?? null;
  }
};
