'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaChevronLeft } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { ROUTES } from '@/constants';

type EarnTaskKey = 'signup' | 'refer' | 'completeProfile' | 'redeem' | 'instagram';

type EarnTask = {
  key: EarnTaskKey;
  title: string;
  subtitle: string;
  credits: number;
  redirectTo: string;
  external?: boolean;
};

type MeResponse = {
  completeness?: number;
};

type LedgerEntry = {
  description?: string;
};

type ClaimResponse = {
  awarded: boolean;
  credits_earned: number;
  message: string;
};

export default function RecruiterEarnCreditsPage() {
  const router = useRouter();
  const [claimingTask, setClaimingTask] = useState<EarnTaskKey | null>(null);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [signupClaimed, setSignupClaimed] = useState(false);
  const [completeProfileClaimed, setCompleteProfileClaimed] = useState(false);
  const [instagramClaimed, setInstagramClaimed] = useState(false);

  const earnTasks: EarnTask[] = [
    {
      key: 'signup',
      title: 'Signup Bonus',
      subtitle: 'Welcome credits added after successful account verification',
      credits: 50,
      redirectTo: ROUTES.recruiterCredits,
    },
    {
      key: 'refer',
      title: 'Refer & Earn',
      subtitle: 'Share your code with friends and earn credits when they redeem',
      credits: 20,
      redirectTo: ROUTES.community,
    },
    {
      key: 'completeProfile',
      title: 'Complete Profile',
      subtitle: 'Complete profile to 100% and claim one-time bonus',
      credits: 10,
      redirectTo: ROUTES.recruiterProfile,
    },
    {
      key: 'redeem',
      title: 'Redeem Code',
      subtitle: 'Redeem a referral code in community',
      credits: 10,
      redirectTo: ROUTES.community,
    },
    {
      key: 'instagram',
      title: 'Follow us on Instagram',
      subtitle: 'Follow @jobyt.in and claim one-time bonus instantly',
      credits: 10,
      redirectTo: 'https://www.instagram.com/jobyt.in/',
      external: true,
    },
  ];

  useEffect(() => {
    const loadEarnState = async () => {
      try {
        const [me, ledger] = await Promise.all([
          api.get<MeResponse>('/users/me'),
          api.getPaginated<LedgerEntry>('/credits/ledger?page=1&limit=100'),
        ]);

        setProfileCompleteness(typeof me.data?.completeness === 'number' ? me.data.completeness : 0);

        const hasClaimedSignupBonus = (ledger.data || []).some(
          (item) => (item.description || '').toLowerCase() === 'welcome bonus — account registration',
        );
        const hasClaimedCompleteProfile = (ledger.data || []).some(
          (item) => (item.description || '').toLowerCase() === 'complete profile bonus',
        );
        const hasClaimedInstagram = (ledger.data || []).some(
          (item) => (item.description || '').toLowerCase() === 'instagram follow bonus',
        );
        setSignupClaimed(hasClaimedSignupBonus);
        setCompleteProfileClaimed(hasClaimedCompleteProfile);
        setInstagramClaimed(hasClaimedInstagram);
      } catch {
        // Keep page interactive even when status fetch fails.
      }
    };

    void loadEarnState();
  }, []);

  const canClaimCompleteProfile = profileCompleteness >= 100 && !completeProfileClaimed;

  const taskButtonLabel = useMemo(() => {
    return (task: EarnTask): string => {
      if (task.key === 'signup') {
        return signupClaimed ? 'Claimed' : 'Pending Verification';
      }

      if (task.key === 'completeProfile') {
        if (completeProfileClaimed) return 'Claimed';
        if (profileCompleteness < 100) return 'Go to Profile';
        return 'Claim 10 Credits';
      }

      if (task.key === 'instagram') {
        return instagramClaimed ? 'Claimed' : 'Follow + Claim 10';
      }

      return 'Go';
    };
  }, [completeProfileClaimed, instagramClaimed, profileCompleteness, signupClaimed]);

  const navigateTask = (task: EarnTask) => {
    if (task.external) {
      const opened = window.open(task.redirectTo, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.location.href = task.redirectTo;
      }
      return;
    }
    router.push(task.redirectTo);
  };

  const handleTaskAction = async (task: EarnTask) => {
    if (task.key === 'signup') {
      return;
    }

    if (task.key === 'refer' || task.key === 'redeem') {
      navigateTask(task);
      return;
    }

    if (task.key === 'completeProfile') {
      if (completeProfileClaimed) {
        navigateTask(task);
        return;
      }

      if (!canClaimCompleteProfile) {
        toast.error('Complete your profile to 100% to claim this bonus');
        navigateTask(task);
        return;
      }

      setClaimingTask('completeProfile');
      try {
        const res = await api.post<ClaimResponse>('/credits/earn/complete-profile', {});
        if (res.data?.awarded) {
          setCompleteProfileClaimed(true);
          toast.success(res.data.message || 'Complete profile bonus credited');
        } else {
          setCompleteProfileClaimed(true);
          toast.success(res.data?.message || 'Complete profile bonus already claimed');
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to claim complete profile bonus';
        toast.error(message);
      } finally {
        setClaimingTask(null);
      }
      navigateTask(task);
      return;
    }

    if (task.key === 'instagram') {
      if (instagramClaimed) {
        navigateTask(task);
        return;
      }

      setClaimingTask('instagram');
      try {
        const res = await api.post<ClaimResponse>('/credits/earn/follow-instagram', {});
        if (res.data?.awarded) {
          setInstagramClaimed(true);
          toast.success(res.data.message || 'Instagram follow bonus credited');
        } else {
          setInstagramClaimed(true);
          toast.success(res.data?.message || 'Instagram follow bonus already claimed');
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to claim Instagram follow bonus';
        toast.error(message);
      } finally {
        setClaimingTask(null);
      }
      navigateTask(task);
      return;
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-12">
      <h1 className="text-center text-[44px] leading-tight font-black tracking-tight text-black mb-2 font-display">Credits &amp; Plans</h1>

      <div className="relative mt-8 mb-12 flex items-center justify-center">
        <button
          onClick={() => router.push(ROUTES.recruiterCredits)}
          className="absolute left-0 w-12 h-12 bg-black rounded-full flex items-center justify-center text-white hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/10 group"
        >
          <FaChevronLeft className="text-lg pr-0.5 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <h2 className="text-[32px] font-black tracking-tight text-slate-900 font-display">Earn Free Credits</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {earnTasks.map((task) => (
          <div key={task.key} className="bg-black rounded-3xl p-6 text-center flex flex-col items-center min-h-[280px] shadow-xl relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <h3 className="text-white text-[20px] font-black tracking-tight mb-2 relative z-10">{task.title}</h3>
            <p className="text-white/50 text-[11px] font-bold leading-relaxed mb-6 relative z-10 px-2">{task.subtitle}</p>

            <div className="mb-1 relative z-10">
              <span className="text-lime-300 text-[48px] font-black leading-none tracking-tighter">{task.credits}</span>
            </div>
            <p className="text-lime-300/60 text-[10px] font-black uppercase tracking-[0.3em] mb-8 relative z-10">Credits</p>

            <div className="mt-auto w-full relative z-10">
              <button
                onClick={() => void handleTaskAction(task)}
                disabled={task.key === 'signup' || (task.key === 'completeProfile' && completeProfileClaimed) || (task.key === 'instagram' && instagramClaimed) || claimingTask === task.key}
                className="w-full bg-lime-400 hover:bg-lime-300 text-black py-3.5 rounded-2xl font-black text-[13px] uppercase tracking-wide transition-all shadow-lg shadow-lime-400/20 active:scale-95 disabled:bg-white/10 disabled:text-white/30 disabled:border disabled:border-white/5 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {claimingTask === task.key ? 'Claiming...' : taskButtonLabel(task)}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
