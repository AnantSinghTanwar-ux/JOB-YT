'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { FaRobot, FaCheckCircle, FaLightbulb, FaCheck, FaSpinner } from 'react-icons/fa';
import { FaRegTimesCircle } from 'react-icons/fa';

interface RecruiterInsightsPanelProps {
  applicationId: string;
  fitInsights: string | null | undefined;
  improvementSuggestions: string | null | undefined;
  rejectionReason: string | null | undefined;
  insightsApproved: boolean | undefined;
  insightsGeneratedAt: string | null | undefined;
  onApproved: () => void;
}

function SuggestionList({ text }: { text: string }) {
  const lines = text
    .split('\n')
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(Boolean);
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600">
          <span className="text-slate-400 mt-0.5">•</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export function RecruiterInsightsReviewPanel({
  applicationId,
  fitInsights,
  improvementSuggestions,
  rejectionReason,
  insightsApproved,
  insightsGeneratedAt,
  onApproved,
}: RecruiterInsightsPanelProps) {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(!!insightsApproved);

  // Not generated yet
  if (!insightsGeneratedAt && !fitInsights) {
    return (
      <div className="bg-[#faf9f7] border border-dashed border-[#e8e4dc] rounded-xl p-5 flex items-center gap-3">
        <FaRobot className="text-slate-300 text-xl flex-shrink-0" />
        <p className="text-xs text-slate-400 font-medium">AI insights are being generated. Check back shortly.</p>
      </div>
    );
  }

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.patch(`/applications/${applicationId}/approve-insights`, {});
      setApproved(true);
      onApproved();
      toast.success('Insights shared with applicant');
    } catch {
      toast.error('Failed to approve insights');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="bg-white border border-[#e8e4dc] rounded-2xl overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-3 bg-[#faf9f7] border-b border-[#e8e4dc] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaRobot className="text-slate-400 text-sm" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Insights Preview</span>
        </div>
        {approved ? (
          <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-wider">
            <FaCheckCircle className="text-emerald-500" /> Shared with applicant
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">Not yet shared</span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Fit Insights */}
        {fitInsights && (
          <div>
            <p className="text-[9px] font-black text-[#1a1a1a] uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <FaCheckCircle className="text-emerald-500" /> Fit Summary
            </p>
            <p className="text-[12px] text-slate-700 leading-relaxed">{fitInsights}</p>
          </div>
        )}

        {/* Improvement Suggestions */}
        {improvementSuggestions && (
          <div>
            <p className="text-[9px] font-black text-[#1a1a1a] uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <FaLightbulb className="text-amber-500" /> Improvement Suggestions
            </p>
            <SuggestionList text={improvementSuggestions} />
          </div>
        )}

        {/* Rejection Reason — clearly labelled as draft */}
        {rejectionReason && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <FaRegTimesCircle /> AI Draft — Rejection Reason
            </p>
            <p className="text-[10px] text-rose-500 italic mb-2">
              Only shown to applicant if their status is set to Rejected.
            </p>
            <p className="text-[12px] text-slate-700 leading-relaxed italic">"{rejectionReason}"</p>
          </div>
        )}

        {/* Approve Button */}
        {!approved && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#333] text-white text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {approving ? (
              <><FaSpinner className="animate-spin" /> Approving...</>
            ) : (
              <><FaCheck /> Approve & Share with Applicant</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
