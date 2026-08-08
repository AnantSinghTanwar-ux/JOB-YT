'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApplications } from '@/hooks/useApplications';
import { api } from '@/lib/api';
import { APPLICATION_STATUS_LABELS } from '@/constants';
import { FaArrowUpRightFromSquare, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { SelectionProbabilityBadge } from '@/components/jobs/SelectionProbability';
import { FaInfoCircle, FaRegLightbulb } from 'react-icons/fa';
import { ATSBreakdown, ApplicationStatus } from '@/types';
import { ATSScoreBadge } from '@/components/ui/ATSScoreBadge';
import { ATSInsightsPanel } from '@/components/ui/ATSInsightsPanel';
import { InsightsDrawer } from '@/components/ui/InsightsDrawer';
import { getSelectionProbability } from '@/lib/atsInsights';

type ApplicationView = {
    companyName?: string | null;
    job_title?: string;
    status_updated_at?: string;
    selectionProbability?: number;
    ats_score?: number | null;
    ats_breakdown?: ATSBreakdown | null;
    fit_insights?: string | null;
    improvement_suggestions?: string | null;
    insights_approved?: boolean;
    insights_generated_at?: string | null;
    interview_status?: 'scheduled' | 'live' | 'completed' | 'cancelled';
};

const STATUS_STYLES: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700',
    in_review: 'bg-yellow-100 text-yellow-700',
    shortlisted: 'bg-purple-100 text-purple-700',
    interview: 'bg-sky-100 text-sky-700',
    offer: 'bg-emerald-100 text-emerald-700',
    hired: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear().toString().slice(-2);
    return `${day} ${month}' ${year}`;
}

function formatRelative(dateStr: string): string {
    const now = Date.now();
    const time = new Date(dateStr).getTime();
    const diffMs = now - time;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < hour) {
        const mins = Math.max(1, Math.floor(diffMs / minute));
        return `${mins}m ago`;
    }
    if (diffMs < day) {
        const hours = Math.floor(diffMs / hour);
        return `${hours}h ago`;
    }
    const days = Math.floor(diffMs / day);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
}

export default function ApplicationsPage() {
    const router = useRouter();
    const [expandedAppId, setExpandedAppId] = React.useState<string | null>(null);
    const [drawerApp, setDrawerApp] = React.useState<{ id: string; status: ApplicationStatus; atsScore?: number | null; jobTitle?: string; companyName?: string | null } | null>(null);
    const {
        applications, isLoading, page, totalPages, total,
        fetchMyApplications, goToPage,
    } = useApplications();

    const [interviews, setInterviews] = useState<any[]>([]);

    useEffect(() => {
        fetchMyApplications(1);
        const fetchInterviews = async () => {
            try {
                const res = await api.get<any[]>('/interviews');
                const list = (res as any).data || res;
                if (Array.isArray(list)) {
                    setInterviews(list);
                }
            } catch (err) {
                console.error('Failed to fetch interviews', err);
            }
        };
        fetchInterviews();
    }, [fetchMyApplications]);

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                pages.push(i);
            }
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <>
        <div className="max-w-[1200px] mx-auto pb-10">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] tracking-tight">
                    My Applications
                </h1>
                {!isLoading && total > 0 && (
                    <span className="text-sm text-slate-500 font-medium">
                        {total} application{total !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {isLoading && (
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse bg-[#F4F1EA]/60 rounded-2xl h-20" />
                    ))}
                </div>
            )}

            {!isLoading && applications.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                    <p className="text-slate-500 font-medium text-lg">You haven&apos;t applied to any jobs yet.</p>
                    <p className="text-slate-400 text-sm mt-1">Start exploring opportunities!</p>
                </div>
            )}

            {!isLoading && applications.length > 0 && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        {/* Table Header */}
                        <div className="bg-[#1a1a1a] text-white rounded-2xl px-6 py-4 mb-3">
                            <div className="grid grid-cols-12 gap-3 text-[11px] font-bold uppercase tracking-widest">
                                <div className="col-span-2">Company</div>
                                <div className="col-span-3">Profile</div>
                                <div className="col-span-1 -ml-8">Status</div>
                                <div className="col-span-2 -ml-4">ATS Score</div>
                                <div className="col-span-1 -ml-3">Applied</div>
                                <div className="col-span-2 ml-4">Comment</div>
                                <div className="col-span-1 text-center">View</div>
                            </div>
                        </div>

                        {/* Table Rows */}
                        <div className="space-y-2.5">
                            {applications.map((app) => {
                                const view = app as typeof app & ApplicationView;
                                const appInterview = interviews.find((i) => i.application_id === app.id);
                                return (

                                <div key={app.id} className="bg-white border border-[#e8e4dc] rounded-2xl hover:shadow-md transition-shadow flex flex-col">
                                    <div className="px-6 py-5">
                                        <div className="grid grid-cols-12 gap-3 items-center">
                                            <div className="col-span-2 min-w-0">
                                                <span className="text-sm font-semibold text-[#1a1a1a] truncate block">
                                                    {view.companyName || 'Company'}
                                                </span>
                                            </div>
                                            <div className="col-span-3 min-w-0">
                                                <span className="text-sm text-slate-600 truncate block">
                                                    {view.job_title || 'Position'}
                                                </span>
                                            </div>
                                            <div className="col-span-1 -ml-8 flex flex-col items-start gap-1">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[app.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {APPLICATION_STATUS_LABELS[app.status] || app.status}
                                                </span>
                                                {view.interview_status && (
                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                        view.interview_status === 'completed' ? 'bg-purple-100 text-purple-700' :
                                                        view.interview_status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                                                        view.interview_status === 'live' ? 'bg-rose-100 text-rose-700 animate-pulse' :
                                                        'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
                                                        AI {view.interview_status === 'scheduled' ? 'Pending' : view.interview_status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="col-span-2 -ml-4">
                                                {(() => {
                                                    const s = view.ats_score;
                                                    const scoreText = s == null ? '—' : s === 0 ? 'No Match' : `${s}%`;
                                                    const scoreColor = s == null ? 'text-slate-300' : s >= 70 ? 'text-emerald-700' : s >= 40 ? 'text-amber-700' : s === 0 ? 'text-slate-400' : 'text-rose-600';
                                                    const barColor = s == null || s === 0 ? '' : s >= 70 ? 'bg-emerald-500' : s >= 40 ? 'bg-amber-400' : 'bg-rose-400';
                                                    const prob = getSelectionProbability(s, app.status);
                                                    const thumbColor: Record<string, string> = { hired: '#10b981', offer: '#10b981', high: '#10b981', medium: '#f59e0b', low: '#fb7185', very_low: '#f43f5e', rejected: '#94a3b8' };
                                                    const probThumb = thumbColor[prob.tier] ?? '#94a3b8';
                                                    const tierLabel: Record<string, string> = { hired: 'Hired', offer: 'Offer', high: 'Good', medium: 'Moderate', low: 'Low', very_low: 'Very Low', rejected: 'Not Selected' };
                                                    const probTierText = tierLabel[prob.tier] ?? '';
                                                    return (
                                                        <div className="flex flex-col gap-2">
                                                            {/* Score */}
                                                            <div>
                                                                <div className="flex items-baseline gap-1 mb-1">
                                                                    <span className={`text-base font-black leading-none ${scoreColor}`}>{scoreText}</span>
                                                                    {s != null && s !== 0 && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ATS</span>}
                                                                </div>
                                                                {s != null && s > 0 && (
                                                                    <div className="h-[3px] w-14 bg-[#e8e4dc] rounded-full overflow-hidden">
                                                                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${s}%` }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Probability — dark badge */}
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-[#1a1a1a] w-fit">
                                                                <span className="text-sm font-black tabular-nums leading-none" style={{ color: probThumb }}>
                                                                    {prob.tier === 'hired' ? '✓' : prob.tier === 'rejected' ? '✕' : `${prob.probability}%`}
                                                                </span>
                                                                <span className="text-[8px] font-bold uppercase tracking-widest leading-none text-lime-400">
                                                                    {prob.tier === 'hired' ? 'Hired' : prob.tier === 'rejected' ? 'Rejected' : 'Chance'}
                                                                </span>
                                                            </span>
                                                            {/* Actions */}
                                                            <div className="flex items-center gap-1">
                                                                {s != null && (
                                                                    <button
                                                                        onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}
                                                                        className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 bg-[#f4f1ea] hover:bg-[#e8e4dc] px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a]"
                                                                    >
                                                                        <FaInfoCircle aria-hidden="true" className="opacity-40 text-[8px]" />
                                                                        {expandedAppId === app.id ? 'Hide' : 'Details'}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setDrawerApp({ id: app.id, status: app.status, atsScore: s, jobTitle: view.job_title, companyName: view.companyName })}
                                                                    className="text-[10px] font-semibold flex items-center gap-1 bg-[#1a1a1a] hover:bg-[#333] text-white px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1a1a1a]"
                                                                >
                                                                    <FaRegLightbulb aria-hidden="true" className="text-[8px]" />
                                                                    Insights
                                                                </button>
                                                                {app.status === 'interview' && appInterview && appInterview.status !== 'completed' && (
                                                                    <button
                                                                        onClick={() => router.push(`/interviews/live/${appInterview.id}`)}
                                                                        className="text-[10px] font-bold flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1a1a1a]"
                                                                    >
                                                                        Join Interview
                                                                    </button>
                                                                )}
                                                                {app.status === 'interview' && (
                                                                    <button
                                                                        onClick={() => router.push(`/interviews/video/${app.id}`)}
                                                                        className="text-[10px] font-bold flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1a1a1a]"
                                                                    >
                                                                        Record Video Intro
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="col-span-1 -ml-3">
                                                <span className="text-sm text-slate-500">
                                                    {formatDate(app.created_at)}
                                                </span>
                                            </div>
                                            <div className="col-span-2 min-w-0 ml-4">
                                                <div className="group relative">
                                                    <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed">
                                                        {app.latest_comment || 'No comments yet'}
                                                    </p>
                                                    {app.latest_comment && (
                                                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-1">
                                                            {app.latest_comment}
                                                            <div className="absolute top-full left-4 border-8 border-transparent border-t-slate-900" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button
                                                    onClick={() => router.push(`/jobs/${app.job_id}`)}
                                                    className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-[#e8e4dc] flex items-center justify-center transition-colors"
                                                    aria-label="Open job details"
                                                >
                                                    <FaArrowUpRightFromSquare className="text-xs text-[#1a1a1a]" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Expanded Details Row */}
                                    {expandedAppId === app.id && (
                                        <div className="bg-[#faf9f7] border-t border-[#e8e4dc] px-6 py-5 rounded-b-2xl animate-in slide-in-from-top-2 duration-200">
                                            <ATSInsightsPanel 
                                                score={view.ats_score} 
                                                breakdown={view.ats_breakdown} 
                                                perspective="applicant" 
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {applications.map((app) => {
                            const view = app as typeof app & ApplicationView;
                            const appInterview = interviews.find((i) => i.application_id === app.id);
                            return (
                                <div
                                    key={app.id}
                                    className="bg-white border border-[#e8e4dc] rounded-2xl p-5"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-[#1a1a1a]">
                                                    {view.companyName || 'Company'}
                                                </p>
                                                <ATSScoreBadge score={view.ats_score} />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {view.job_title || 'Position'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${STATUS_STYLES[app.status] || 'bg-slate-100 text-slate-600'}`}>
                                                {APPLICATION_STATUS_LABELS[app.status] || app.status}
                                            </span>
                                            {view.interview_status && (
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                    view.interview_status === 'completed' ? 'bg-purple-100 text-purple-700' :
                                                    view.interview_status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                                                    view.interview_status === 'live' ? 'bg-rose-100 text-rose-700 animate-pulse' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
                                                    AI {view.interview_status === 'scheduled' ? 'Pending' : view.interview_status}
                                                </span>
                                            )}
                                            {view.ats_score != null && (
                                                <button 
                                                    onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}
                                                    className="text-[10px] text-blue-600 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                                >
                                                    <FaInfoCircle /> {expandedAppId === app.id ? 'Hide Fit' : 'View Fit'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Mobile Expanded Details */}
                                    {expandedAppId === app.id && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in">
                                            <ATSInsightsPanel 
                                                score={view.ats_score} 
                                                breakdown={view.ats_breakdown} 
                                                perspective="applicant" 
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                        <span className="text-xs text-slate-400">
                                            Applied {formatDate(app.created_at)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {app.status === 'interview' && appInterview && appInterview.status !== 'completed' && (
                                                <button
                                                    onClick={() => router.push(`/interviews/live/${appInterview.id}`)}
                                                    className="px-3 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                                                >
                                                    Join Interview
                                                </button>
                                            )}
                                            {app.status === 'interview' && (
                                                <button
                                                    onClick={() => router.push(`/interviews/video/${app.id}`)}
                                                    className="px-3 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                                >
                                                    Record Video Intro
                                                </button>
                                            )}
                                            <button
                                                onClick={() => router.push(`/jobs/${app.job_id}`)}
                                                className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center hover:bg-[#e8e4dc] transition-colors"
                                                aria-label="Open job details"
                                            >
                                                <FaArrowUpRightFromSquare className="text-[10px] text-[#1a1a1a]" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-2">
                            <button
                                onClick={() => goToPage(page - 1)}
                                disabled={page <= 1}
                                className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-[#e8e4dc] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Previous page"
                            >
                                <FaChevronLeft className="text-xs text-[#1a1a1a]" />
                            </button>

                            {getPageNumbers().map((p, i) =>
                                p === '...' ? (
                                    <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-slate-400">
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => goToPage(p as number)}
                                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${p === page
                                                ? 'bg-[#1a1a1a] text-white'
                                                : 'bg-[#f4f1ea] text-[#1a1a1a] hover:bg-[#e8e4dc]'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}

                            <button
                                onClick={() => goToPage(page + 1)}
                                disabled={page >= totalPages}
                                className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-[#e8e4dc] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Next page"
                            >
                                <FaChevronRight className="text-xs text-[#1a1a1a]" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>

        {/* AI Insights Drawer */}
        <InsightsDrawer
            isOpen={drawerApp !== null}
            onClose={() => setDrawerApp(null)}
            applicationId={drawerApp?.id ?? null}
            applicationStatus={drawerApp?.status ?? 'applied'}
            atsScore={drawerApp?.atsScore}
            jobTitle={drawerApp?.jobTitle}
            companyName={drawerApp?.companyName}
        />
        </>
    );
}
