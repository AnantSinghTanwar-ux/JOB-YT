'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ApplicationStatus } from '@/types';
import { getSelectionProbability, ProbabilityTier } from '@/lib/atsInsights';
import { FaTimes, FaClock, FaExclamationCircle, FaCheckCircle, FaLightbulb, FaBan } from 'react-icons/fa';

interface InsightsData {
  pending?: boolean;
  unavailable?: boolean;
  status?: ApplicationStatus;
  fit_insights?: string | null;
  improvement_suggestions?: string | null;
  rejection_reason?: string | null;
}

interface InsightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string | null;
  applicationStatus: ApplicationStatus;
  atsScore?: number | null;
  jobTitle?: string;
  companyName?: string | null;
  profileIncomplete?: boolean;
}

const TIER_STYLES: Record<ProbabilityTier, { bar: string; text: string; card: string }> = {
  hired:    { bar: 'bg-emerald-500', text: 'text-emerald-700', card: 'bg-emerald-50 border-emerald-200' },
  offer:    { bar: 'bg-emerald-500', text: 'text-emerald-700', card: 'bg-emerald-50 border-emerald-200' },
  high:     { bar: 'bg-emerald-500', text: 'text-emerald-700', card: 'bg-emerald-50 border-emerald-200' },
  medium:   { bar: 'bg-amber-400',   text: 'text-amber-700',   card: 'bg-amber-50 border-amber-200' },
  low:      { bar: 'bg-slate-400',   text: 'text-slate-600',   card: 'bg-[#faf9f7] border-[#e8e4dc]' },
  very_low: { bar: 'bg-slate-300',   text: 'text-slate-500',   card: 'bg-[#faf9f7] border-[#e8e4dc]' },
  rejected: { bar: 'bg-rose-400',    text: 'text-rose-600',    card: 'bg-rose-50 border-rose-200' },
};

function SuggestionList({ text }: { text: string }) {
  const lines = text
    .split('\n')
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(Boolean);

  return (
    <ul className="space-y-3">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 w-5 h-5 rounded-full bg-[#1a1a1a] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
            {i + 1}
          </span>
          <span className="text-[14px] text-[#1a1a1a] leading-relaxed">{line}</span>
        </li>
      ))}
    </ul>
  );
}

export function InsightsDrawer({
  isOpen,
  onClose,
  applicationId,
  applicationStatus,
  atsScore,
  jobTitle,
  companyName,
  profileIncomplete,
}: InsightsDrawerProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setData(null);
    try {
      const res = await api.get<InsightsData>(`/applications/${applicationId}/insights`);
      setData((res as any).data ?? res);
    } catch {
      setData({ unavailable: true });
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchInsights();
    }
  }, [isOpen, applicationId, fetchInsights]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const prob = getSelectionProbability(atsScore, applicationStatus);
  const tierStyle = TIER_STYLES[prob.tier];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[460px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#e8e4dc] flex-shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Career Insights</p>
            <h2 className="text-[17px] font-extrabold text-[#1a1a1a] leading-tight">
              {jobTitle || 'Application'}
            </h2>
            {companyName && (
              <p className="text-xs text-slate-500 mt-0.5">{companyName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-[#e8e4dc] flex items-center justify-center transition-colors flex-shrink-0 ml-4"
            aria-label="Close insights"
          >
            <FaTimes className="text-xs text-[#1a1a1a]" />
          </button>
        </div>

        {/* Profile Incomplete Banner */}
        {profileIncomplete && !loading && data && !data.pending && !data.unavailable && (
          <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
            <FaExclamationCircle className="text-amber-500 flex-shrink-0 mt-0.5 text-xs" />
            <p className="text-[12px] text-amber-700 font-medium leading-snug">
              Add at least 3 skills or a bio to your profile for more accurate AI insights.
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Selection Probability Card — always visible, derived from props */}
          <div className="px-6 pt-6 pb-5">
            <div className={`rounded-2xl border p-5 ${tierStyle.card}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Selection Probability</p>
              <div className="flex items-end gap-2 mb-3">
                <span className={`text-[42px] font-black leading-none tracking-tight ${tierStyle.text}`}>
                  {prob.probability}%
                </span>
                <span className={`text-sm font-bold mb-1.5 ${tierStyle.text}`}>{prob.label}</span>
              </div>
              <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full ${tierStyle.bar} rounded-full transition-all duration-700`}
                  style={{ width: `${prob.probability}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{prob.context}</p>
            </div>
          </div>

          <div className="border-t border-[#e8e4dc]" />

          {/* AI Insights sections */}
          <div className="px-6 py-6 space-y-8">

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-6 animate-pulse">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-[#f4f1ea] rounded" />
                <div className="h-4 w-full bg-[#f4f1ea] rounded" />
                <div className="h-4 w-4/5 bg-[#f4f1ea] rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-28 bg-[#f4f1ea] rounded" />
                <div className="h-4 w-full bg-[#f4f1ea] rounded" />
                <div className="h-4 w-3/4 bg-[#f4f1ea] rounded" />
              </div>
            </div>
          )}

          {/* State A: Pending */}
          {!loading && data?.pending && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f4f1ea] flex items-center justify-center mb-4">
                <FaClock className="text-xl text-slate-400" />
              </div>
              <p className="text-[15px] font-bold text-[#1a1a1a] mb-2">Insights under review</p>
              <p className="text-sm text-slate-500 max-w-[280px] leading-relaxed">
                Our team is reviewing your AI-generated insights. Check back soon.
              </p>
            </div>
          )}

          {/* State B: Approved but AI failed */}
          {!loading && data?.unavailable && !data?.pending && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f4f1ea] flex items-center justify-center mb-4">
                <FaExclamationCircle className="text-xl text-slate-300" />
              </div>
              <p className="text-[15px] font-bold text-[#1a1a1a] mb-2">Insights unavailable</p>
              <p className="text-sm text-slate-500 max-w-[280px] leading-relaxed">
                Insights were unavailable for this application.
              </p>
            </div>
          )}

          {/* State C: Approved with data */}
          {!loading && data && !data.pending && !data.unavailable && (
            <>
              {/* Section 1: Fit Summary */}
              {data.fit_insights && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <FaCheckCircle className="text-emerald-500 text-sm" />
                    <h3 className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-widest">
                      {applicationStatus === 'rejected' ? 'Fit Summary' : 'Why You\'re a Fit'}
                    </h3>
                  </div>
                  <p className="text-[14px] text-[#1a1a1a] leading-relaxed">{data.fit_insights}</p>
                </section>
              )}

              {/* Divider */}
              {data.fit_insights && data.improvement_suggestions && (
                <div className="border-t border-[#e8e4dc]" />
              )}

              {/* Section 2: Improvement Suggestions */}
              {data.improvement_suggestions && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <FaLightbulb className="text-amber-500 text-sm" />
                    <h3 className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-widest">
                      How to Improve
                    </h3>
                  </div>
                  <SuggestionList text={data.improvement_suggestions} />
                </section>
              )}

              {/* Section 3: Rejection Reason — ONLY visible if rejected */}
              {applicationStatus === 'rejected' && data.rejection_reason && (
                <>
                  <div className="border-t border-[#e8e4dc]" />
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <FaBan className="text-rose-400 text-sm" />
                      <h3 className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-widest">
                        Rejection Feedback
                      </h3>
                    </div>
                    <div className="bg-[#faf9f7] border border-[#e8e4dc] rounded-xl p-4">
                      <p className="text-[14px] text-slate-600 leading-relaxed italic">
                        &ldquo;{data.rejection_reason}&rdquo;
                      </p>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          </div>{/* end AI Insights sections */}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e8e4dc] flex-shrink-0">
          <p className="text-[10px] text-slate-400 text-center">
            Probability is an estimate based on stage and ATS match · Not a guarantee
          </p>
        </div>
      </div>
    </>
  );
}
