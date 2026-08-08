'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Spinner, Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import { Job } from '@/types';
import {
    FaArrowRight,
    FaLocationDot,
    FaEye,
    FaPlus,
} from 'react-icons/fa6';

interface RecruiterSummary {
    total_jobs: number;
    active_jobs: number;
    total_applications: number;
    total_hired: number;
    total_views: number;
}

interface RecruiterSummaryPayload {
    summary: RecruiterSummary;
}

interface RecruiterApplicationsStats {
    total: number;
    applied: number;
    in_review: number;
    shortlisted: number;
    interview: number;
    offer: number;
    hired: number;
    rejected: number;
}

interface RecruiterApplicant {
    id: string;
    name: string | null;
    photo_url?: string | null;
    status: string;
    job_title: string;
    job_location: string | null;
    created_at: string;
}

interface ExtendedJob extends Job {
    application_count?: number;
}

const statusPillClass: Record<string, string> = {
    applied: 'bg-yellow-100 text-yellow-700',
    in_review: 'bg-blue-100 text-blue-700',
    shortlisted: 'bg-purple-100 text-purple-700',
    interview: 'bg-orange-100 text-orange-700',
    offer: 'bg-teal-100 text-teal-700',
    hired: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
};

const statusLabelMap: Record<string, string> = {
    applied: 'PENDING',
    in_review: 'REVIEWED',
    shortlisted: 'SHORTLISTED',
    interview: 'INTERVIEWED',
    offer: 'OFFER',
    hired: 'HIRED',
    rejected: 'REJECTED',
};

const formatRelative = (isoDate: string) => {
    const now = Date.now();
    const time = new Date(isoDate).getTime();
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
    return `${days}d ago`;
};

const formatStatusLabel = (status: string) => {
    return statusLabelMap[status] || status.toUpperCase();
}

const getJobDisplayState = (job: ExtendedJob) => {
    if (job.job_approval_status === 'pending_approval') {
        return { label: 'IN REVIEW', className: 'bg-black text-lime-300' };
    }
    if (job.job_approval_status === 'rejected') {
        return { label: 'CLOSED', className: 'bg-black text-lime-300' };
    }
    if (job.job_approval_status === 'approved') {
        return { label: 'ACTIVE', className: 'bg-lime-100 text-lime-800' };
    }
    if (job.status === 'active') {
        return { label: 'ACTIVE', className: 'bg-lime-100 text-lime-800' };
    }
    if (job.status === 'draft') {
        return { label: 'DRAFT', className: 'bg-slate-100 text-slate-700' };
    }
    return { label: 'CLOSED', className: 'bg-slate-200 text-slate-700' };
};

export default function RecruiterDashboardPage() {
    const [balance, setBalance] = useState(0);
    const [summary, setSummary] = useState<RecruiterSummary | null>(null);
    const [appStats, setAppStats] = useState<RecruiterApplicationsStats | null>(null);
    const [activeJobs, setActiveJobs] = useState<ExtendedJob[]>([]);
    const [recentApplicants, setRecentApplicants] = useState<RecruiterApplicant[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [creditRes, summaryRes, statsRes, jobsRes, applicantsRes] = await Promise.allSettled([
                api.get<{ balance: number }>('/credits/balance'),
                api.get<RecruiterSummaryPayload>('/analytics/summary'),
                api.get<RecruiterApplicationsStats>('/applications/recruiter/applicants/stats'),
                api.getPaginated<ExtendedJob>('/jobs/my/listings?limit=5'),
                api.getPaginated<RecruiterApplicant>('/applications/recruiter/applicants?limit=5'),
            ]);

            const creditData = creditRes.status === 'fulfilled' ? creditRes.value : null;
            const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
            const statsData = statsRes.status === 'fulfilled' ? statsRes.value : null;
            const jobsData = jobsRes.status === 'fulfilled' ? jobsRes.value : null;
            const applicantsData = applicantsRes.status === 'fulfilled' ? applicantsRes.value : null;

            const jobRows = jobsData?.data ?? [];
            const preferredJobs = jobRows.filter((job) => job.status !== 'closed').slice(0, 5);

            setBalance(creditData?.data?.balance ?? 0);
            setSummary(summaryData?.data?.summary ?? null);
            setAppStats(statsData?.data ?? null);
            setActiveJobs((preferredJobs.length ? preferredJobs : jobRows).slice(0, 5));
            setRecentApplicants((applicantsData?.data ?? []).slice(0, 5));
        } catch {
            // Keep the dashboard resilient if one endpoint fails.
        }
    }, []);

    useEffect(() => {
        let active = true;

        const load = async () => {
            await fetchData();
            if (active) {
                setLoading(false);
            }
        };

        void load();

        const interval = setInterval(() => {
            void fetchData();
        }, 30000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Spinner size="lg" />
            </div>
        );
    }

    const pendingReviews = (appStats?.applied ?? 0)
        + (appStats?.in_review ?? 0)
        + (appStats?.shortlisted ?? 0)
        + (appStats?.interview ?? 0)
        + (appStats?.offer ?? 0);

    const statCards = [
        {
            label: ['CREDIT', 'BALANCE'],
            value: balance.toLocaleString(),
        },
        {
            label: ['ACTIVE JOBS'],
            value: String(summary?.active_jobs ?? 0),
        },
        {
            label: ['TOTAL', 'APPLICATIONS'],
            value: String(summary?.total_applications ?? 0),
        },
        {
            label: ['PENDING', 'REVIEWS'],
            value: String(pendingReviews),
        },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-6">
            <section className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-4xl md:text-[44px] leading-[1.05] font-black tracking-tight text-black">Welcome back!</h1>
                    <p className="mt-2 text-xl leading-tight text-black/80">Here's what's happening with your internships</p>
                </div>
                <Link href={ROUTES.recruiterNewJob} className="shrink-0">
                    <button className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-lime-300 hover:bg-slate-900">
                        <FaPlus className="text-xs" />
                        Post New Job
                    </button>
                </Link>
            </section>

            <section className="flex flex-wrap gap-4 sm:gap-6">
                {statCards.map((stat) => {
                    return (
                        <article key={stat.label.join('-')} className="rounded-2xl bg-black text-lime-300 px-5 py-4 shadow-xl flex-1 min-w-[140px] max-w-[220px] h-[100px] flex items-center">
                            <div className="flex items-end gap-4">
                                <p className="text-[38px] leading-none font-black tracking-tight">{stat.value}</p>
                                <div className="pb-1">
                                    {stat.label.map((line) => (
                                        <p key={line} className="text-[11px] uppercase tracking-[0.09em] font-bold leading-tight">
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </article>
                    );
                })}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <article className="rounded-2xl bg-[#ece9e2] border border-black/5 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Recent Applications</h2>
                        <Link href={ROUTES.recruiterApplications} className="rounded-full bg-black text-white text-xs font-semibold px-4 py-1.5 hover:bg-slate-900 inline-flex items-center gap-1">
                            View All <FaArrowRight className="text-[10px]" />
                        </Link>
                    </div>

                    {recentApplicants.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white">
                            <p className="text-sm text-slate-500">No applications yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentApplicants.slice(0, 5).map((application) => (
                                <div key={application.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xl font-black text-slate-900">{application.name || 'Candidate'}</p>
                                            <p className="text-sm text-slate-700 mt-0.5">{application.job_title}</p>
                                            <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                                                <FaLocationDot className="text-[10px]" />
                                                {application.job_location || 'Remote'}
                                            </p>
                                        </div>
                                        <span
                                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                statusPillClass[application.status.toLowerCase()] || 'bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            {formatStatusLabel(application.status.toLowerCase())}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-3">Applied {formatRelative(application.created_at)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </article>

                <article className="rounded-2xl bg-[#ece9e2] border border-black/5 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Active Job Posts</h2>
                        <Link href={ROUTES.recruiterJobs} className="rounded-full bg-black text-white text-xs font-semibold px-4 py-1.5 hover:bg-slate-900 inline-flex items-center gap-1">
                            View All <FaArrowRight className="text-[10px]" />
                        </Link>
                    </div>

                    {activeJobs.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white">
                            <p className="text-sm text-slate-500 mb-3">No jobs posted yet.</p>
                            <Link href={ROUTES.recruiterNewJob}>
                                <Button>Post Your First Job</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeJobs.slice(0, 5).map((job) => {
                                const displayState = getJobDisplayState(job);
                                return (
                                <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xl font-black text-slate-900">{job.title}</p>
                                            <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                                                <FaLocationDot className="text-[10px]" />
                                                {job.location || 'Remote'}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${displayState.className}`}>
                                            {displayState.label}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1">
                                                <FaEye className="text-[10px]" />
                                                {job.views_count} views
                                            </span>
                                            <span>•</span>
                                            <span>{job.application_count ?? 0} applications</span>
                                        </span>
                                        <span>Posted {formatRelative(job.created_at)}</span>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </article>
            </section>
        </div>
    );
}
