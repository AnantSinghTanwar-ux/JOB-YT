'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { subscriptionApi, SubscriptionTier } from '@/lib/api/subscription.api';
import { Spinner, Card, CardBody } from '@/components/ui';
import toast from 'react-hot-toast';

const loadRazorpayScript = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  const anyWindow = window as any;
  if (anyWindow.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function SubscriptionsList() {
  const { user } = useAuthStore();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [processingTier, setProcessingTier] = useState<string | null>(null);

  const audience = user?.role === 'recruiter' ? 'EMPLOYER' : 'STUDENT';

  useEffect(() => {
    subscriptionApi
      .getTiers(audience)
      .then((data) => {
        setTiers(data);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load subscription tiers');
      })
      .finally(() => setLoading(false));
  }, [audience]);

  const handleSubscribe = async (tierName: string) => {
    setProcessingTier(tierName);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Unable to load Razorpay checkout. Please try again.');
      }

      const checkout = await subscriptionApi.initiateSubscribe(tierName, billingCycle);
      if (!checkout) {
        throw new Error('Unable to initialize checkout. Please try again.');
      }

      const anyWindow = window as any;
      if (!anyWindow.Razorpay) {
        throw new Error('Razorpay SDK not available after script load');
      }

      const razorpay = new anyWindow.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Jobyt',
        description: `Subscription to ${tierName} (${billingCycle})`,
        order_id: checkout.razorpayOrderId,
        handler: async (response: any) => {
          try {
            await subscriptionApi.verifySubscribe({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              tierName,
              billingCycle,
            });
            toast.success(`Successfully subscribed to ${tierName} plan!`);
          } catch (err: any) {
            toast.error(err.message || 'Verification failed. Please contact support.');
          }
        },
        theme: {
          color: '#84cc16',
        },
      });

      razorpay.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize subscription');
    } finally {
      setProcessingTier(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-12">
      <div className="text-center space-y-4">
        <h2 className="text-[28px] font-display font-medium text-slate-900 tracking-tight">
          Subscriptions & Plans
        </h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Choose the right plan to boost your hiring process or learning progress. Flexible monthly and annual cycles available.
        </p>

        {/* Billing Cycle Switch */}
        <div className="flex justify-center mt-6">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-[#060606] text-[#c1f237] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                billingCycle === 'annual'
                  ? 'bg-[#060606] text-[#c1f237] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual (Save 15%)
            </button>
          </div>
        </div>
      </div>

      {tiers.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">No subscription plans are currently available.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {tiers.map((tier) => {
            const price = billingCycle === 'monthly' ? Number(tier.price_monthly) : Number(tier.price_annual);
            const cycleLabel = billingCycle === 'monthly' ? '/mo' : '/yr';
            
            return (
              <Card key={tier.id} className="relative overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between">
                <CardBody className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 capitalize">
                        {tier.name.toLowerCase().replace('_', ' ')}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">For {tier.target_audience.toLowerCase()}s</p>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold tracking-tight text-slate-900">
                        ${price.toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold leading-6 text-slate-500 ml-1">
                        {cycleLabel}
                      </span>
                    </div>

                    <ul className="space-y-3 text-sm text-slate-600 border-t border-slate-100 pt-4">
                      {Object.entries(tier.features || {}).map(([key, val]) => (
                        <li key={key} className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 text-emerald-500 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2.5"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                          <span className="font-semibold">{String(val)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <button
                      disabled={processingTier !== null}
                      onClick={() => handleSubscribe(tier.name)}
                      className="w-full bg-[#060606] hover:bg-slate-800 disabled:opacity-50 text-[#c1f237] text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm"
                    >
                      {processingTier === tier.name ? 'Processing...' : 'Subscribe'}
                    </button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
