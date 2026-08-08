'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';

interface ReferralEntry {
  id: string;
  referred_email: string;
  name: string | null;
  status: 'credited' | 'pending';
  referred_credited: boolean;
  created_at: string;
}

interface ReferralDashboard {
  code: string;
  link: string;
  total_referrals: number;
  credited_referrals: number;
  total_credits_earned: number;
  referrals: ReferralEntry[];
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<ReferralDashboard>('/referrals/dashboard')
      .then((res) => setData(res.data ?? null))
      .finally(() => setLoading(false));
  }, []);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-brand text-gray-900 pb-10 px-4 sm:px-6">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight">Referral Program</h1>
        <p className="text-sm sm:text-[15px] leading-relaxed max-w-3xl font-medium">
          Every user can take part in our internship referral program. For every person who joins the platform using your unique link, you&apos;ll earn 50 credits. You can also <a href="/community" className="text-[#a8e02d] hover:text-[#c3ff3d] underline">redeem a friend&apos;s code to earn 10 credits</a>.
        </p>
        <p className="text-sm sm:text-[15px] font-medium mt-4">
          Want to promote us? <a href="#" className="text-[#a8e02d] hover:text-[#c3ff3d] hover:underline transition-all">Download banners, sample messages, and logos to get started.</a>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#0b0b0b] rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-lg border border-gray-900 min-h-[140px] sm:min-h-[160px]">
          <p className="text-[10px] sm:text-xs text-[#a8e02d] font-semibold tracking-wider uppercase mb-2 sm:mb-3">Total Referrals</p>
          <p className="text-4xl sm:text-5xl font-bold text-[#c3ff3d]">{(data.total_referrals || 0).toString().padStart(2, '0')}</p>
        </div>
        
        <div className="bg-[#0b0b0b] rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-lg border border-gray-900 min-h-[140px] sm:min-h-[160px]">
          <p className="text-[10px] sm:text-xs text-[#a8e02d] font-semibold tracking-wider uppercase mb-2 sm:mb-3">Credited</p>
          <p className="text-4xl sm:text-5xl font-bold text-[#c3ff3d]">{(data.credited_referrals || 0).toString().padStart(2, '0')}</p>
        </div>
        
        <div className="bg-[#0b0b0b] rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-lg border border-gray-900 min-h-[140px] sm:min-h-[160px]">
          <p className="text-[10px] sm:text-xs text-[#a8e02d] font-semibold tracking-wider uppercase mb-2 sm:mb-3">Credits Earned</p>
          <p className="text-4xl sm:text-5xl font-bold text-[#c3ff3d]">{data.total_credits_earned || 0}</p>
        </div>
      </div>

      {/* Referral list */}
      <div className="bg-[#F4F1E9] rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">Your Referrals</h2>
        {!(data.referrals && data.referrals.length > 0) ? (
          <p className="text-gray-500 font-medium text-sm sm:text-base">No referrals yet. Share your link to start earning!</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {data.referrals.map((r, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-3 sm:py-2 border-b border-gray-200/50 last:border-0">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0 border border-white">
                      <Image
                        src={`https://i.pravatar.cc/150?u=${r.referred_email}`}
                        alt="Avatar"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                      <span className="capitalize">
                        {r.name ?? r.referred_email.split('@')[0]}
                      </span>{' '}Joined!
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-500 font-medium">{r.referred_email}</p>
                    <p className="text-[11px] sm:text-xs text-gray-400 font-medium">{formatDate(r.created_at)}</p>
                  </div>
                </div>
                <div className="pl-14 sm:pl-0 sm:pr-2 self-start sm:self-auto">
                  <span className={`text-[10px] sm:text-xs font-bold px-3 py-1 bg-white rounded-full border inline-block ${r.referred_credited ? 'border-lime-200 text-lime-600' : 'border-gray-200 text-gray-500'}`}>
                    {r.referred_credited ? 'Credited' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referral code & link */}
      <div className="space-y-6">
        {/* Referral Code */}
        <div className="bg-[#0b0b0b] rounded-2xl p-5 sm:p-6 shadow-xl border border-gray-900">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">Your Referral Code</h2>
          <p className="text-xs sm:text-[13px] text-gray-400 font-medium mb-4 sm:mb-6">
            Share this code with friends
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              readOnly
              value={data.code || ''}
              className="flex-1 rounded-xl bg-[#222] border border-[#333] px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-[15px] font-mono font-bold text-[#c3ff3d] focus:outline-none placeholder-gray-600 text-center tracking-widest"
              placeholder="Loading code..."
            />
            <button
              onClick={() => copy(data.code || '')}
              className="rounded-xl shrink-0 bg-[#c3ff3d] px-6 sm:px-10 py-3 sm:py-3.5 text-sm sm:text-[15px] font-bold text-black hover:bg-[#aee62d] transition-transform active:scale-95 text-center whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-[#0b0b0b] rounded-2xl p-5 sm:p-6 shadow-xl border border-gray-900">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">Your Referral Link</h2>
          <p className="text-xs sm:text-[13px] text-gray-400 font-medium mb-4 sm:mb-6">
            Or share this complete link (Earn 50 credits per signup)
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              readOnly
              value={data.link || ''}
              className="flex-1 rounded-xl bg-[#222] border border-[#333] px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-[15px] font-mono text-gray-300 focus:outline-none placeholder-gray-600 truncate"
              placeholder="Loading link..."
            />
            <button
              onClick={() => copy(data.link || '')}
              className="rounded-xl shrink-0 bg-[#c3ff3d] px-6 sm:px-10 py-3 sm:py-3.5 text-sm sm:text-[15px] font-bold text-black hover:bg-[#aee62d] transition-transform active:scale-95 text-center whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
