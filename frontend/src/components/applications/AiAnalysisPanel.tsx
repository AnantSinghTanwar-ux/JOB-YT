'use client';

/**
 * AiAnalysisPanel
 *
 * Recruiter-facing panel that displays AI-generated insights for a candidate application.
 * - Lazily fetches analysis on mount (only if shown).
 * - Displays strengths, weaknesses, and a summary.
 * - Offers a "Refresh Analysis" button (triggers force-regeneration).
 * - Handles loading, error, and fallback states gracefully.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface AiReasoningResult {
  strengths: string[];
  weaknesses: string[];
  summary: string;
  generatedAt: string | null;
}

interface Props {
  applicationId: string;
}

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
};

export function AiAnalysisPanel({ applicationId }: Props) {
  const [reasoning, setReasoning] = useState<AiReasoningResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchReasoning = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(false);

    try {
      const endpoint = forceRefresh
        ? `/applications/recruiter/applicants/${applicationId}/ai-reasoning/refresh`
        : `/applications/recruiter/applicants/${applicationId}/ai-reasoning`;

      const method = forceRefresh ? 'post' : 'get';
      const res = await (method === 'post'
        ? api.post<AiReasoningResult>(endpoint, {})
        : api.get<AiReasoningResult>(endpoint));

      setReasoning(res.data ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchReasoning();
  }, [fetchReasoning]);

  const isUnavailable =
    !loading &&
    !error &&
    reasoning &&
    reasoning.strengths.length === 0 &&
    reasoning.weaknesses.length === 0 &&
    reasoning.summary === 'AI analysis unavailable.';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight">AI Analysis</h3>
            {reasoning?.generatedAt && !loading && (
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                Generated {formatDate(reasoning.generatedAt)}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchReasoning(true)}
          disabled={loading || refreshing}
          title="Regenerate AI analysis"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-50"
        >
          <svg
            className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 bg-slate-100 rounded-full w-1/3" />
            <div className="space-y-2">
              <div className="h-2.5 bg-slate-100 rounded-full w-4/5" />
              <div className="h-2.5 bg-slate-100 rounded-full w-3/5" />
            </div>
            <div className="h-3 bg-slate-100 rounded-full w-1/3 mt-4" />
            <div className="space-y-2">
              <div className="h-2.5 bg-slate-100 rounded-full w-4/5" />
              <div className="h-2.5 bg-slate-100 rounded-full w-2/5" />
            </div>
            <div className="h-8 bg-slate-100 rounded-xl mt-3" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-4">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            </div>
            <p className="text-xs text-slate-500">Failed to load AI analysis.</p>
            <button
              onClick={() => fetchReasoning()}
              className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {/* Unavailable fallback */}
        {isUnavailable && (
          <div className="text-center py-4">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-slate-400">AI analysis is currently unavailable.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Ensure the Gemini API is configured and try refreshing.</p>
          </div>
        )}

        {/* Main content */}
        {!loading && !error && reasoning && !isUnavailable && (
          <>
            {/* Strengths */}
            {reasoning.strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Strengths</h4>
                </div>
                <ul className="space-y-1.5">
                  {reasoning.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-slate-700 leading-snug">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {reasoning.weaknesses.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Areas for Attention</h4>
                </div>
                <ul className="space-y-1.5">
                  {reasoning.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-slate-700 leading-snug">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            {reasoning.summary && reasoning.summary !== 'AI analysis unavailable.' && (
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-3.5">
                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-wider mb-1.5">Summary</p>
                <p className="text-xs text-slate-700 leading-relaxed">{reasoning.summary}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
