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

export default function EarnCreditsPage() {
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
      redirectTo: ROUTES.credits,
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
      redirectTo: ROUTES.profile,
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

        const hasClaimedCompleteProfile = (ledger.data || []).some(
          (item) => (item.description || '').toLowerCase() === 'complete profile bonus',
        );
        const hasClaimedSignupBonus = (ledger.data || []).some(
          (item) => (item.description || '').toLowerCase() === 'welcome bonus — account registration',
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
      if (task.key === 'completeProfile') {
        if (completeProfileClaimed) return 'Claimed';
        if (profileCompleteness < 100) return 'Go to Profile';
        return 'Claim 10 Credits';
      }

      if (task.key === 'signup') {
        return signupClaimed ? 'Claimed' : 'Pending Verification';
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
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="text-3xl font-display font-medium text-center text-slate-900 tracking-tight">Credits & Plans</h1>

      <div className="relative mt-6 sm:mt-8 mb-6 sm:mb-8 flex items-center justify-center">
        <button
          onClick={() => router.push('/credits')}
          className="absolute left-0 w-9 h-9 sm:w-10 sm:h-10 bg-black rounded-full flex items-center justify-center text-white hover:text-[#c1f237] transition-colors"
        >
          <FaChevronLeft className="text-sm pr-0.5" />
        </button>
        <h2 className="text-[28px] sm:text-3xl font-display font-medium text-slate-900 tracking-tight">Earn Credits</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {earnTasks.map((task) => (
          <div key={task.key} className="bg-[#0a0a0a] rounded-xl p-5 sm:p-6 text-center flex flex-col items-center min-h-60 sm:min-h-63.75">
            <h3 className="text-white text-[22px] font-display font-medium mb-1">{task.title}</h3>
            <p className="text-white/40 text-[11px] mb-5">{task.subtitle}</p>

            <div className="mb-0">
              <span className="text-[#c1f237] text-[36px] font-semibold">{task.credits}</span>
            </div>
            <p className="text-[#c1f237] text-[9px] tracking-widest mb-6">CREDITS</p>

            <div className="mt-auto w-full px-0 sm:px-1">
              <button
                onClick={() => void handleTaskAction(task)}
                disabled={task.key === 'signup' || (task.key === 'completeProfile' && completeProfileClaimed) || (task.key === 'instagram' && instagramClaimed) || claimingTask === task.key}
                className="w-full bg-[#c1f237] hover:bg-[#b0e025] text-black py-2.5 rounded-xl font-medium text-[13px] transition-colors disabled:bg-[#323232] disabled:text-[#8e8e8e] disabled:cursor-not-allowed"
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
