'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ROUTES } from '@/constants';
import { sortSpazorlabsFirst } from '@/lib/companyFlags';
import { useAuthStore } from '@/store/auth.store';
import { Job } from '@/types';
import { Button } from '@/components/ui';
import {
    BackendJob,
    JobCardGrid,
    SkeletonGrid,
    getJobTypeLabel,
    normalizeJob,
} from '@/components/ui/JobCard';

const AVAILABLE_SKILLS = ['React', 'Figma', 'Python', 'Marketing', 'UI/UX', 'SQL', 'Node.js'];
const WORK_TYPES = ['Remote', 'Hybrid', 'On-site'];
const DURATIONS = ['1-3 Months', '3-6 Months', '6+ Months'];
const JOBS_PAGE_SIZE = 50;

export default function DashboardPage() {
    const { user } = useAuthStore();
    const searchParams = useSearchParams();
    const router = useRouter();
    const keywordParam = searchParams.get('keyword') || '';

    const [balance, setBalance] = useState(0);
    const [stats, setStats] = useState({ applications: 0, saved: 0 });
    const [loading, setLoading] = useState(true);
    const [nudges, setNudges] = useState<any[]>([]);
    const [dismissedNudges, setDismissedNudges] = useState<string[]>([]);

    const [jobs, setJobs] = useState<BackendJob[]>([]);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [jobsLoadingMore, setJobsLoadingMore] = useState(false);
    const [jobTotal, setJobTotal] = useState(0);
    const [jobPage, setJobPage] = useState(1);
    const [hasMoreJobs, setHasMoreJobs] = useState(false);

    // Search & filter state
    const [keyword, setKeyword] = useState(keywordParam);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [selectedWorkType, setSelectedWorkType] = useState('');
    const [selectedDuration, setSelectedDuration] = useState('');

    // Sync keyword from URL params
    useEffect(() => {
        setKeyword(keywordParam);
    }, [keywordParam]);

    const isSearchMode = keywordParam.length > 0;

    const clearSearch = () => {
        router.push('/dashboard');
    };

    const fetchStats = useCallback(async () => {
        try {
            const [credit, apps, saved] = await Promise.all([
                api.get<{ balance: number }>('/credits/balance'),
                api.getPaginated<unknown>('/applications/my?limit=1'),
                api.get<unknown[]>('/users/me/saved-jobs'),
            ]);
            setBalance(credit.data?.balance ?? 0);
            setStats({
                applications: apps.pagination?.total ?? 0,
                saved: (saved.data ?? []).length,
            });
        } catch { /* silent */ }
    }, []);

    const fetchNudges = useCallback(async () => {
        try {
            const res = await api.get<any[]>('/coach/nudges');
            setNudges(res.data ?? []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchStats().finally(() => setLoading(false));
        fetchNudges();
    }, [fetchStats, fetchNudges]);

    const fetchJobsPage = useCallback(async (page: number, append: boolean) => {
        if (append) {
            setJobsLoadingMore(true);
        } else {
            setJobsLoading(true);
        }

        try {
            const response = await api.getPaginated<BackendJob>(
                `/jobs?page=${page}&limit=${JOBS_PAGE_SIZE}`,
            );

            const jobsData = response.data ?? [];
            const normalizedJobs = jobsData.map((job) => normalizeJob(job));
            const total = response.pagination?.total ?? 0;

            setJobTotal(total);
            setJobPage(page);
            setHasMoreJobs(page * JOBS_PAGE_SIZE < total);
            setJobs((prev) => (append ? [...prev, ...normalizedJobs] : normalizedJobs));
        } catch {
            if (!append) {
                setJobs([]);
            }
        } finally {
            if (append) {
                setJobsLoadingMore(false);
            } else {
                setJobsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchJobsPage(1, false);
    }, [fetchJobsPage]);

    const handleLoadMoreJobs = useCallback(() => {
        if (jobsLoading || jobsLoadingMore || !hasMoreJobs) return;
        fetchJobsPage(jobPage + 1, true);
    }, [fetchJobsPage, hasMoreJobs, jobPage, jobsLoading, jobsLoadingMore]);

    const toggleSkill = (s: string) =>
        setSelectedSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

    const filteredJobs = useMemo(() => {
        const visibleJobs = jobs.filter((job) => {
            if (keyword) {
                const q = keyword.toLowerCase();
                if (
                    !job.title.toLowerCase().includes(q) &&
                    !job.companyName?.toLowerCase().includes(q)
                )
                    return false;
            }
            if (selectedSkills.length > 0) {
                if (!job.skills.some((s) => selectedSkills.includes(s))) return false;
            }
            if (selectedWorkType) {
                const wt = selectedWorkType.toLowerCase();
                const isRemote =
                    job.type === 'remote' || job.location?.toLowerCase().includes('remote');
                if (wt === 'remote' && !isRemote) return false;
                if (wt === 'on-site' && isRemote) return false;
            }
            return true;
        });
        return sortSpazorlabsFirst(visibleJobs);
    }, [jobs, keyword, selectedSkills, selectedWorkType]);

    const userName = user?.email ? user.email.split('@')[0] : 'User';
    const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const statCards = [
        { value: balance.toLocaleString(), label: 'CREDIT', sublabel: 'BALANCE', href: ROUTES.credits },
        { value: stats.applications.toString(), label: 'APPLICATIONS', sublabel: '', href: ROUTES.applications },
        { value: stats.saved.toString(), label: 'SAVED JOBS', sublabel: '', href: ROUTES.savedJobs },
    ];

    return (
        <div className="max-w-[1360px] w-full ml-4 sm:ml-6 lg:ml-8 pr-4">
            {/* Proactive Career Coach Nudges Banner */}
            {nudges.filter(n => !dismissedNudges.includes(n.id)).slice(0, 1).map((nudge) => (
                <div
                    key={nudge.id}
                    className="mb-6 mr-4 bg-gradient-to-r from-slate-900 via-slate-800 to-black text-white p-5 rounded-2xl border border-white/10 flex items-center justify-between gap-4 shadow-xl transition-all"
                >
                    <div className="flex items-center gap-4">
                        <span className="text-2xl select-none">💡</span>
                        <div>
                            <h4 className="text-[12px] font-bold text-lime-400 uppercase tracking-widest mb-0.5">AI Career Coach Advice</h4>
                            <p className="text-[14px] text-slate-200 font-medium leading-relaxed">{nudge.text}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {nudge.actionUrl && (
                            <button
                                onClick={() => router.push(nudge.actionUrl)}
                                className="bg-[#C3FF3D] hover:bg-[#aee62d] text-black text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
                            >
                                {nudge.actionLabel || 'Take Action'}
                            </button>
                        )}
                        <button
                            onClick={() => setDismissedNudges(prev => [...prev, nudge.id])}
                            className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-2 hover:bg-white/5 rounded-lg transition-all"
                            title="Dismiss advice"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}

            {!isSearchMode ? (
                <>
                    {/* Welcome */}
                    <div className="mb-4">
                        <h1 className="text-3xl md:text-4xl lg:text-[52px] font-extrabold text-[#1a1a1a] tracking-tight leading-[1.05]">
                            Welcome back, {displayName}!
                        </h1>
                        <p className="text-slate-600 font-medium text-sm md:text-base mt-2">
                            Here&apos;s your overview for today
                        </p>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-10 max-w-[260px] sm:max-w-[900px]">
                        {statCards.map((stat) => (
                            <button
                                type="button"
                                key={stat.label}
                                onClick={() => router.push(stat.href)}
                                className="bg-[#141414] rounded-2xl p-4 md:p-5 flex items-center gap-4 lg:gap-5 border border-white/5 shadow-xl text-left transition-all hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-[#fcfcfc]"
                            >
                                <span className="text-[40px] md:text-[44px] leading-none font-extrabold tracking-tight text-lime-400 drop-shadow-md shrink-0">
                                    {stat.value}
                                </span>
                                <div className="flex flex-col justify-center">
                                    <span className="text-[12px] md:text-[13px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                                        {stat.label}
                                    </span>
                                    {stat.sublabel && (
                                        <span className="text-[12px] md:text-[13px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                                            {stat.sublabel}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Latest Job Openings */}
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a1a1a] tracking-tight mb-8">
                            Latest Job Openings
                        </h2>
                        {jobsLoading ? (
                            <SkeletonGrid count={8} gridClass="!ml-0 !mr-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
                        ) : filteredJobs.length > 0 ? (
                            <JobCardGrid jobs={filteredJobs} gridClass="!ml-0 !mr-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
                        ) : jobs.length > 0 ? (
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                                <p className="text-2xl mb-2">🔍</p>
                                <p className="text-slate-500 font-medium text-lg">No jobs match your current filters.</p>
                                <button
                                    onClick={clearSearch}
                                    className="mt-4 bg-[#1a1a1a] text-white rounded-full px-5 py-2 text-xs font-semibold hover:bg-black transition-colors"
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                                <p className="text-2xl mb-2">🚀</p>
                                <p className="text-slate-500 font-medium text-lg">New opportunities coming soon</p>
                            </div>
                        )}

                        {!jobsLoading && jobs.length > 0 && (
                            <div className="mt-8 flex flex-col items-center gap-3">
                                <Button
                                    variant="brand"
                                    onClick={handleLoadMoreJobs}
                                    isLoading={jobsLoadingMore}
                                    disabled={jobsLoadingMore || !hasMoreJobs}
                                >
                                    {jobsLoadingMore ? 'Loading more jobs...' : (hasMoreJobs ? 'Load more jobs' : 'No more jobs')}
                                </Button>
                                <p className="text-sm text-slate-500">Showing {jobs.length} of {jobTotal} jobs</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* ── Search Mode: Internships-style layout ── */
                <div>
                    {/* Header */}
                    <div className="mb-10 lg:mb-12">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h1 className="font-display text-3xl md:text-4xl lg:text-[42px] font-extrabold text-[#1a1a1a] tracking-tight mb-2">
                                    Explore Opportunities
                                </h1>
                                <p className="text-slate-600 font-medium text-sm md:text-base">
                                    Find and apply to the best opportunities
                                </p>
                            </div>
                            <button
                                onClick={clearSearch}
                                className="flex items-center gap-2 bg-[#1a1a1a] text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-black transition-colors"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12" />
                                    <polyline points="12 19 5 12 12 5" />
                                </svg>
                                Back to Dashboard
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
                        {/* ── Dark Sidebar Filters ── */}
                        <aside className="w-full lg:w-70 shrink-0">

                            {/* MOBILE PILL: search + filter toggle */}
                            <div className="lg:hidden bg-[#1a1a1a] rounded-full px-4 py-2.5 flex items-center gap-3 shadow-lg">
                                <svg className="text-slate-400 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="Search internships..."
                                    className="flex-1 min-w-0 bg-transparent text-white placeholder-slate-500 text-sm outline-none"
                                />
                                <button
                                    onClick={() => setFilterOpen(!filterOpen)}
                                    className="shrink-0 flex items-center gap-1.5 bg-[#2a2a2a] rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-300 border border-white/10 hover:border-white/25 transition-colors"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime-400">
                                        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                                        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                                        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                                        <line x1="1" y1="14" x2="7" y2="14" />
                                        <line x1="9" y1="8" x2="15" y2="8" />
                                        <line x1="17" y1="16" x2="23" y2="16" />
                                    </svg>
                                    Filters
                                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className={`transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`}>
                                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>

                            {/* MOBILE EXPANDED FILTER PANEL */}
                            {filterOpen && (
                                <div className="lg:hidden mt-3 bg-[#1a1a1a] rounded-[20px] p-6 shadow-xl animate-in slide-in-from-top-2 duration-200">
                                    <div className="mb-6">
                                        <h4 className="text-[12px] text-slate-400 font-medium mb-2.5 uppercase tracking-wider">Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {AVAILABLE_SKILLS.map(skill => (
                                                <button key={skill} onClick={() => toggleSkill(skill)}
                                                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${selectedSkills.includes(skill) ? 'border-lime-400 text-lime-400' : 'border-white/20 text-slate-300 hover:border-white/40'
                                                        }`}
                                                >{skill}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb-6">
                                        <h4 className="text-[12px] text-slate-400 font-medium mb-2.5 uppercase tracking-wider">Work Type</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {WORK_TYPES.map(type => (
                                                <button key={type} onClick={() => setSelectedWorkType(type === selectedWorkType ? '' : type)}
                                                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${selectedWorkType === type ? 'border-lime-400 text-lime-400' : 'border-white/20 text-slate-300 hover:border-white/40'
                                                        }`}
                                                >{type}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <h4 className="text-[12px] text-slate-400 font-medium mb-2.5 uppercase tracking-wider">Duration</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {DURATIONS.map(dur => (
                                                <button key={dur} onClick={() => setSelectedDuration(dur === selectedDuration ? '' : dur)}
                                                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${selectedDuration === dur ? 'border-lime-400 text-lime-400' : 'border-white/20 text-slate-300 hover:border-white/40'
                                                        }`}
                                                >{dur}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => setFilterOpen(false)} className="w-full bg-lime-400 text-black font-bold text-sm rounded-full py-2.5 mt-2 hover:bg-lime-300 transition-colors">
                                        Apply Filters
                                    </button>
                                </div>
                            )}

                            {/* DESKTOP FULL SIDEBAR */}
                            <div className="hidden lg:block bg-[#1a1a1a] text-white rounded-3xl p-7 md:p-8 h-fit shadow-xl">
                                <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-5">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime-400">
                                        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                                        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                                        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                                        <line x1="1" y1="14" x2="7" y2="14" />
                                        <line x1="9" y1="8" x2="15" y2="8" />
                                        <line x1="17" y1="16" x2="23" y2="16" />
                                    </svg>
                                    <h3 className="font-semibold text-[17px] text-white tracking-wide">Filters</h3>
                                </div>

                                {/* Keyword */}
                                <div className="mb-8">
                                    <h4 className="text-[13px] text-slate-300 font-medium mb-3">Keywords</h4>
                                    <div className="relative">
                                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                                            placeholder="e.g. Frontend"
                                            className="w-full bg-[#2a2a2a] text-white placeholder-slate-500 rounded-full py-2.5 pl-9 pr-4 text-sm outline-none border border-transparent focus:border-lime-500/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Skills */}
                                <div className="mb-8">
                                    <h4 className="text-[13px] text-slate-300 font-medium mb-3">Skills</h4>
                                    <div className="flex flex-wrap gap-2.5">
                                        {AVAILABLE_SKILLS.map(skill => (
                                            <button key={skill} onClick={() => toggleSkill(skill)}
                                                className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${selectedSkills.includes(skill)
                                                        ? 'bg-transparent border-lime-400 text-lime-400'
                                                        : 'bg-transparent border-white/20 text-slate-300 hover:border-white/40'
                                                    }`}
                                            >{skill}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Work Type */}
                                <div className="mb-8">
                                    <h4 className="text-[13px] text-slate-300 font-medium mb-3">Work Type</h4>
                                    <div className="flex flex-col gap-2.5">
                                        {WORK_TYPES.map(type => (
                                            <button key={type} onClick={() => setSelectedWorkType(type === selectedWorkType ? '' : type)}
                                                className={`text-left text-[13px] transition-colors ${selectedWorkType === type ? 'text-lime-400 font-semibold' : 'text-slate-400 hover:text-white'
                                                    }`}
                                            >{type}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Duration */}
                                <div>
                                    <h4 className="text-[13px] text-slate-300 font-medium mb-3">Duration</h4>
                                    <div className="flex flex-col gap-2.5">
                                        {DURATIONS.map(dur => (
                                            <button key={dur} onClick={() => setSelectedDuration(dur === selectedDuration ? '' : dur)}
                                                className={`text-left text-[13px] transition-colors ${selectedDuration === dur ? 'text-lime-400 font-semibold' : 'text-slate-400 hover:text-white'
                                                    }`}
                                            >{dur}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Main Content Area — Job Cards Grid */}
                        <div className="flex-1 w-full min-w-0">
                            {jobsLoading ? (
                                <SkeletonGrid count={9} gridClass="!mx-0 grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
                            ) : filteredJobs.length > 0 ? (
                                <JobCardGrid jobs={filteredJobs} gridClass="!mx-0 grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
                            ) : (
                                <div className="w-full flex flex-col items-center justify-center py-32 text-center rounded-3xl border-2 border-dashed border-slate-200">
                                    <span className="text-4xl mb-4">🔍</span>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">No internships found</h3>
                                    <p className="text-slate-500 text-sm">Try tweaking your filters or search terms.</p>
                                    <button
                                        onClick={() => {
                                            setKeyword('');
                                            setSelectedSkills([]);
                                            setSelectedWorkType('');
                                            setSelectedDuration('');
                                        }}
                                        className="mt-6 text-sm font-semibold text-lime-600 hover:text-lime-700 underline"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}

                            {!jobsLoading && jobs.length > 0 && (
                                <div className="mt-8 flex flex-col items-center gap-3">
                                    <Button
                                        variant="brand"
                                        onClick={handleLoadMoreJobs}
                                        isLoading={jobsLoadingMore}
                                        disabled={jobsLoadingMore || !hasMoreJobs}
                                    >
                                        {jobsLoadingMore ? 'Loading more jobs...' : (hasMoreJobs ? 'Load more jobs' : 'No more jobs')}
                                    </Button>
                                    <p className="text-sm text-slate-500">Showing {jobs.length} of {jobTotal} jobs</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
