'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Spinner, Card, CardBody } from '@/components/ui';
import { CreditTransaction, Plan } from '@/types';
import toast from 'react-hot-toast';
import { SubscriptionsList } from '@/components/dashboard/SubscriptionsList';

type RazorpayCheckoutResponse = {
  paymentId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: {
    id: string;
    name: string;
    credits: number;
  };
};

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => Promise<void>;
  theme: {
    color: string;
  };
};

type RazorpayInstance = {
  on: (event: 'payment.failed', handler: () => void) => void;
  open: () => void;
};

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const loadRazorpayScript = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CreditsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);

  const formatSignedAmount = (amount: number, type?: string) => {
    if (type === 'debit') return `-${Math.abs(amount)}`;
    if (type === 'credit') return `+${Math.abs(amount)}`;
    return `${amount > 0 ? '+' : ''}${amount}`;
  };

  const formattedTransactions = transactions.map((t) => ({
    id: t.id,
    transaction: t.description || t.type,
    transactionNo: t.id.slice(0, 10),
    date: new Date(t.created_at).toLocaleDateString(),
    status: t.status || 'success',
    total: formatSignedAmount(t.amount, t.type),
  }));

  useEffect(() => {
    Promise.all([
      api.get<{ balance: number }>('/credits/balance'),
      api.getPaginated<CreditTransaction>('/credits/ledger'),
      api.get<Plan[]>('/payments/plans'),
    ]).then(([bal, txns, plansRes]) => {
      setBalance(bal.data?.balance ?? 0);
      setTransactions(txns.data ?? []);
      setPlans(plansRes.data ?? []);
    }).catch((err) => {
      const message = err instanceof ApiError ? err.message : 'Failed to load credits and plans';
      toast.error(message);
    }).finally(() => setLoading(false));
  }, []);

  const handleBuyPlan = async (planId: string) => {
    setBuyingPlan(planId);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Unable to load Razorpay checkout. Please try again.');
      }

      const res = await api.post<RazorpayCheckoutResponse>('/payments/checkout', { planId });
      const checkout = res.data;
      if (!checkout) {
        throw new Error('Unable to initialize checkout. Please try again.');
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not available after script load');
      }

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Jobyt',
        description: `${checkout.plan.name} - ${checkout.plan.credits} Credits`,
        order_id: checkout.razorpayOrderId,
        handler: async (response: RazorpaySuccessResponse) => {
          await api.post('/payments/verify', response);
          toast.success(`${checkout.plan.credits} credits added successfully`);

          const [bal, txns] = await Promise.all([
            api.get<{ balance: number }>('/credits/balance'),
            api.getPaginated<CreditTransaction>('/credits/ledger'),
          ]);
          setBalance(bal.data?.balance ?? 0);
          setTransactions(txns.data ?? []);
        },
        theme: {
          color: '#84cc16',
        },
      });

      razorpay.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Checkout failed');
    } finally {
      setBuyingPlan(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 sm:space-y-10 px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="text-3xl font-display font-medium text-center text-slate-900 tracking-tight">Credits & Plans</h1>

      <section className="rounded-3xl bg-[#060606] px-5 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[#c1f237] text-xs sm:text-sm font-medium tracking-wide uppercase">Credit Balance</p>
          <p className="text-[#c1f237] text-5xl sm:text-7xl font-semibold leading-none mt-2">{balance}</p>
        </div>
        <button
          onClick={() => router.push('/credits/earn')}
          className="w-full sm:w-auto bg-[#c1f237] hover:bg-[#b0e025] text-black text-sm sm:text-base font-medium px-5 py-2.5 sm:py-2 rounded-xl transition-colors whitespace-nowrap"
        >
          Earn Credits
        </button>
      </section>

      {/* Credit Plans */}
      <div>
        <h2 className="text-[28px] font-display font-medium text-center text-slate-900 mb-8 tracking-tight">Credit Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {plans.length > 0 ? plans.map((plan) => {
            const isFree = plan.price === 0;
            return (
              <div key={plan.id} className="bg-[#0a0a0a] rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center">
                <h3 className="text-white text-[26px] font-display font-medium mb-6">{plan.name}</h3>
                <div className="mb-0.5">
                  <span className="text-[#c1f237] text-[40px] font-semibold">{plan.credits}</span>
                </div>
                <p className="text-[#c1f237] text-xs tracking-widest mb-6">CREDITS</p>
                <p className="text-white/70 text-[15px] font-medium mb-6">
                  {isFree ? 'New User' : `Rs. ${plan.price}/-`}
                </p>
                <div className="mt-auto w-full">
                  <button
                    onClick={() => !isFree && handleBuyPlan(plan.id)}
                    disabled={isFree || buyingPlan === plan.id}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors ${isFree
                        ? 'bg-[#2a2a2a] text-[#8e8e8e] cursor-not-allowed'
                        : 'bg-[#c1f237] hover:bg-[#b0e025] text-black'
                      }`}
                  >
                    {isFree ? 'Credits Claimed' : buyingPlan === plan.id ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full bg-[#0a0a0a] rounded-2xl p-8 text-center">
              <p className="text-white/60 text-lg font-medium">No credit plans available at the moment.</p>
              <p className="text-white/40 text-sm mt-2">Check back soon for new plans.</p>
            </div>
          )}
        </div>
      </div>

      <SubscriptionsList />

      {/* Ledger */}
      <div className="pt-1 sm:pt-2">
        <h2 className="text-[28px] font-display font-medium text-center text-slate-900 mb-8 tracking-tight">Credit Ledger</h2>

        {formattedTransactions.length === 0 ? (
          <Card>
            <CardBody className="p-6 text-center">
              <p className="text-slate-700">No transactions yet</p>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="p-4 sm:p-6 overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="text-slate-500">
                  <tr>
                    <th className="text-left py-2">Transaction</th>
                    <th className="text-left py-2">Transaction No.</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">+/-</th>
                  </tr>
                </thead>

                <tbody>
                  {formattedTransactions.map((tx) => {
                    return (
                      <tr key={tx.id} className="border-t border-slate-100">
                        <td className="py-3 text-slate-800">{tx.transaction}</td>
                        <td className="py-3 text-slate-700">#{tx.transactionNo}</td>
                        <td className="py-3 text-slate-700">{tx.date}</td>
                        <td className="py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              tx.status === 'success'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {tx.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-800">{tx.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
