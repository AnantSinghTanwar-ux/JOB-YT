'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { CreditTransaction, Plan } from '@/types';
import toast from 'react-hot-toast';
import { ROUTES } from '@/constants';

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

export default function RecruiterCreditsPage() {
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
      toast.error(err instanceof ApiError ? err.message : 'Could not load credits data');
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
        throw new Error('Invalid checkout response from server');
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-6 animate-pulse px-4">
        <div className="h-12 bg-slate-200 rounded-lg w-[300px] mx-auto mb-8" />
        <div className="h-32 bg-slate-100 rounded-3xl w-full" />
        <div className="h-12 bg-slate-200 rounded-lg w-[300px] mx-auto mt-12 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-[300px] bg-slate-100 rounded-3xl" />
            <div className="h-[300px] bg-slate-100 rounded-3xl" />
            <div className="h-[300px] bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  const topPlans = plans.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-12">
      <h1 className="text-center text-[44px] leading-tight font-black tracking-tight text-black mb-8 font-display">Credits &amp; Plans</h1>

      <section className="mb-12 rounded-3xl bg-black text-lime-300 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/10 to-transparent pointer-events-none" />
        <div className="relative z-10 text-center sm:text-left">
          <p className="text-[12px] uppercase tracking-[0.2em] font-black text-lime-300/60 mb-2">Available Balance</p>
          <p className="text-6xl sm:text-7xl font-black leading-none tracking-tighter">{balance.toLocaleString()}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/recruiter/credits/earn')}
          className="relative z-10 w-full sm:w-auto rounded-2xl bg-lime-400 px-8 py-4 text-[16px] font-black text-black hover:bg-lime-300 transition-all active:scale-95 shadow-lg shadow-lime-400/20"
        >
          Earn Free Credits
        </button>
      </section>

      <h2 className="text-center text-[36px] font-black tracking-tight text-black mb-8 font-display">Select a Plan</h2>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {topPlans.map((plan) => {
          const isFree = Number(plan.price) === 0;
          const isLoadingPlan = buyingPlan === plan.id;

          return (
            <article key={plan.id} className="rounded-3xl bg-black px-8 py-10 min-h-[320px] flex flex-col items-center justify-between shadow-xl relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="text-center space-y-4 relative z-10 w-full">
                  <h3 className="text-white text-2xl font-black tracking-tight">{plan.name}</h3>
                  <div>
                      <p className="text-lime-300 text-[64px] font-black leading-none tracking-tighter">{Number(plan.credits).toLocaleString()}</p>
                      <p className="text-lime-300/60 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Credits</p>
                  </div>
              </div>

              <div className="relative z-10 w-full space-y-6 mt-8">
                  <div className="h-[1px] w-full bg-white/10" />
                  <p className="text-white text-xl font-bold text-center">
                      {isFree ? 'New User Reward' : `Rs. ${Number(plan.price).toLocaleString()}`}
                  </p>
                  <button
                    type="button"
                    disabled={isLoadingPlan || isFree}
                    onClick={() => handleBuyPlan(plan.id)}
                    className={`w-full rounded-2xl py-4 text-[15px] font-black transition-all shadow-lg active:scale-95 ${
                      isFree
                        ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
                        : 'bg-lime-400 text-black hover:bg-lime-300 shadow-lime-400/20'
                    }`}
                  >
                    {isFree ? 'Claimed' : isLoadingPlan ? 'Processing...' : 'Purchase Plan'}
                  </button>
              </div>
            </article>
          );
        })}
        {topPlans.length === 0 && (
          <div className="col-span-full rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 p-16 text-center">
            <p className="text-slate-500 text-xl font-bold">No credit plans available at the moment.</p>
            <p className="text-slate-400 mt-2 font-medium">Please check back later.</p>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-[28px] font-black tracking-tight text-black font-display">Transaction History</h2>
      </div>
      
      <section className="rounded-3xl bg-[#ece9e2] p-2 sm:p-4 shadow-sm border border-black/5 overflow-hidden">
        <div className="overflow-x-auto rounded-2xl bg-white">
            {formattedTransactions.length === 0 ? (
            <div className="p-12 text-center">
                <p className="text-slate-400 font-bold">No transactions found.</p>
            </div>
            ) : (
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-50/80 border-b border-black/5">
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Transaction</th>
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Ref No.</th>
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Date</th>
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Status</th>
                    <th className="py-4 px-6 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 text-right">Amount</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                {formattedTransactions.map((tx) => {
                    const success = tx.status === 'success';
                    const isCredit = tx.total.startsWith('+');
                    return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-[14px] font-bold text-slate-900">{tx.transaction}</td>
                        <td className="py-4 px-6 text-[13px] font-semibold text-slate-500 font-mono">#{tx.transactionNo}</td>
                        <td className="py-4 px-6 text-[13px] font-semibold text-slate-500">{tx.date}</td>
                        <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${success ? 'bg-lime-100 text-lime-700' : 'bg-rose-100 text-rose-700'}`}>
                                {success ? 'Success' : 'Failed'}
                            </span>
                        </td>
                        <td className={`py-4 px-6 text-[15px] font-black text-right ${isCredit ? 'text-lime-600' : 'text-slate-900'}`}>
                            {tx.total}
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
            )}
        </div>
      </section>
    </div>
  );
}
