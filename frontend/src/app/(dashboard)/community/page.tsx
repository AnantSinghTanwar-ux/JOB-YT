'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';

interface RedemptionStatus {
  has_redeemed: boolean;
  redeemed_at: string | null;
}

interface RedeemResponse {
  message: string;
  credits_earned: number;
  referrer_name: string;
}

interface ReferralDashboard {
  code: string;
  link: string;
  total_referrals: number;
  credited_referrals: number;
  total_credits_earned: number;
}

export default function CommunityPage() {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [hasRedeemed, setHasRedeemed] = useState(false);
  const [redemptionDate, setRedemptionDate] = useState<string | null>(null);
  const [myCode, setMyCode] = useState('');
  const [copiedMyCode, setCopiedMyCode] = useState(false);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [creditedReferrals, setCreditedReferrals] = useState(0);
  const [creditsEarned, setCreditsEarned] = useState(0);

  // Check if user already redeemed a code
  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardResponse = await api.get<ReferralDashboard>('/referrals/dashboard');
        setMyCode(dashboardResponse.data?.code ?? '');
        setTotalReferrals(dashboardResponse.data?.total_referrals ?? 0);
        setCreditedReferrals(dashboardResponse.data?.credited_referrals ?? 0);
        setCreditsEarned(dashboardResponse.data?.total_credits_earned ?? 0);
      } catch (err) {
        console.error('Failed to fetch referral dashboard:', err);
      }

      try {
        const statusResponse = await api.get<RedemptionStatus>('/referrals/status');
        setHasRedeemed(Boolean(statusResponse.data?.has_redeemed));
        setRedemptionDate(statusResponse.data?.redeemed_at ?? null);
      } catch (err) {
        // Keep the page usable even if redemption status endpoint fails.
        console.error('Failed to fetch redemption status:', err);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<RedeemResponse>('/referrals/redeem', {
        code: referralCode.trim(),
      });

      toast.success(response.data?.message || 'Referral code redeemed successfully!');
      setHasRedeemed(true);
      setRedemptionDate(new Date().toISOString());
      setReferralCode('');

      // Refresh status
      const statusResponse = await api.get<RedemptionStatus>('/referrals/status');
      setHasRedeemed(Boolean(statusResponse.data?.has_redeemed));
      setRedemptionDate(statusResponse.data?.redeemed_at ?? null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to redeem code');
    } finally {
      setLoading(false);
    }
  };

  const copyMyCode = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCopiedMyCode(true);
    setTimeout(() => setCopiedMyCode(false), 2000);
  };

  if (statusLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] ml-4 sm:ml-6 lg:ml-8 pr-4 space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] tracking-tight mb-2">
          Referral Program
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-base mb-5">
          Every user can take part in our internship referral program. For every person who joins the
          platform using your unique link, you&apos;ll earn credits.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0b0b0b] rounded-2xl border border-gray-900 shadow-lg flex flex-col items-center justify-center py-10">
          <p className="text-xs text-[#a8e02d] font-semibold tracking-wider uppercase mb-4">Total Referrals</p>
          <p className="text-5xl font-bold text-[#c3ff3d]">{totalReferrals.toString().padStart(2, '0')}</p>
        </div>
        <div className="bg-[#0b0b0b] rounded-2xl border border-gray-900 shadow-lg flex flex-col items-center justify-center py-10">
          <p className="text-xs text-[#a8e02d] font-semibold tracking-wider uppercase mb-4">Credited</p>
          <p className="text-5xl font-bold text-[#c3ff3d]">{creditedReferrals.toString().padStart(2, '0')}</p>
        </div>
        <div className="bg-[#0b0b0b] rounded-2xl border border-gray-900 shadow-lg flex flex-col items-center justify-center py-10">
          <p className="text-xs text-[#a8e02d] font-semibold tracking-wider uppercase mb-4">Credits Earned</p>
          <p className="text-5xl font-bold text-[#c3ff3d]">{creditsEarned}</p>
        </div>
      </div>

      {/* Redeem Code Card */}
      <div className="bg-[#0b0b0b] rounded-2xl p-5 sm:p-6 shadow-xl border border-gray-900">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">
          Redeem Referral Code
        </h2>
        <p className="text-xs sm:text-[13px] text-gray-400 font-medium mb-4 sm:mb-6">
          Enter a referral code to earn 10 credits (and give 20 credits to the referrer)
        </p>

        {hasRedeemed ? (
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 sm:p-5">
            <p className="text-sm sm:text-[15px] text-green-400 font-semibold mb-1">
              ✓ Referral Code Already Redeemed
            </p>
            <p className="text-xs sm:text-[13px] text-green-300/70">
              {redemptionDate ? `Redeemed on ${new Date(redemptionDate).toLocaleDateString()}` : ''}
            </p>
            <p className="text-xs sm:text-[13px] text-green-300/70 mt-2">
              Each user can only redeem one referral code. You have already used your redemption.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRedeem} className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter referral code (e.g., ABC123)"
                className="flex-1 px-4 py-3 rounded-lg bg-gray-900 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#c3ff3d] text-sm sm:text-[15px]"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 sm:px-8 py-3 rounded-lg bg-[#c3ff3d] text-black font-bold hover:bg-[#aee62d] transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-[15px] whitespace-nowrap"
              >
                {loading ? 'Redeeming...' : 'Redeem Code'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* How It Works */}
        <div className="bg-[#0b0b0b] rounded-2xl p-5 sm:p-6 shadow-xl border border-gray-900">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 tracking-tight">
            How It Works
          </h3>
          <ul className="space-y-3 text-xs sm:text-[13px]">
            <li className="flex gap-3">
              <span className="text-[#c3ff3d] font-bold flex-shrink-0">1.</span>
              <span className="text-gray-300">
                Ask your friend for their referral code
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#c3ff3d] font-bold flex-shrink-0">2.</span>
              <span className="text-gray-300">
                Paste the code above and redeem it
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#c3ff3d] font-bold flex-shrink-0">3.</span>
              <span className="text-gray-300">
                Get 10 credits instantly
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#c3ff3d] font-bold flex-shrink-0">4.</span>
              <span className="text-gray-300">
                Your friend gets 20 credits too!
              </span>
            </li>
          </ul>
        </div>

        {/* Benefits */}
        <div className="bg-[#0b0b0b] rounded-2xl p-5 sm:p-6 shadow-xl border border-gray-900">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 tracking-tight">
            Benefits
          </h3>
          <ul className="space-y-3 text-xs sm:text-[13px]">
            <li className="flex gap-3 items-start">
              <span className="text-[#c3ff3d] flex-shrink-0 mt-0.5">✓</span>
              <span className="text-gray-300">
                <strong>Win-Win:</strong> Both you and your friend earn credits
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-[#c3ff3d] flex-shrink-0 mt-0.5">✓</span>
              <span className="text-gray-300">
                <strong>One-Time Only:</strong> You get one chance to redeem a code
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-[#c3ff3d] flex-shrink-0 mt-0.5">✓</span>
              <span className="text-gray-300">
                <strong>Bonus Credits:</strong> Use credits on job postings and more
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-[#c3ff3d] flex-shrink-0 mt-0.5">✓</span>
              <span className="text-gray-300">
                <strong>No Limits:</strong> Referrers can share unlimited times
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Share Your Code */}
      <div className="bg-[#0b0b0b] rounded-2xl p-5 sm:p-6 border border-gray-900 shadow-xl">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1 tracking-tight">
              Have a Referral Code?
            </h3>
            <p className="text-xs sm:text-[13px] text-gray-400">
              Share this code with friends. You earn 20 credits when they redeem it.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              readOnly
              value={myCode}
              placeholder="Loading your referral code..."
              className="flex-1 rounded-xl bg-[#222] border border-[#333] px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-[15px] font-mono font-bold text-[#c3ff3d] focus:outline-none placeholder-gray-600 text-center tracking-widest"
            />
            <button
              type="button"
              onClick={copyMyCode}
              className="rounded-xl shrink-0 bg-[#c3ff3d] px-6 sm:px-10 py-3 sm:py-3.5 text-sm sm:text-[15px] font-bold text-black hover:bg-[#aee62d] transition-transform active:scale-95 text-center whitespace-nowrap"
            >
              {copiedMyCode ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <a
            href={ROUTES.referral}
            className="text-xs sm:text-[13px] text-[#a8e02d] hover:text-[#c3ff3d] hover:underline font-medium self-start"
          >
            View full referral stats
          </a>
        </div>
      </div>
    </div>
  );
}
