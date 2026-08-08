'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa6';
import { API_BASE } from '@/constants';
import { BackendJob, JobCardGrid, SkeletonGrid, getJobTypeLabel, normalizeJob } from '@/components/ui/JobCard';

interface JobsApiResult {
    success: boolean;
    data?: BackendJob[];
}




export function JobCards() {
    const [jobs, setJobs] = useState<BackendJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        fetch(`${API_BASE}/jobs?limit=12&sort=date`)
            .then(async (res) => {
                if (!res.ok) throw new Error('API Error');
                return res.json();
            })
            .then((data: JobsApiResult) => {
                const jobsData = data.data ?? [];
                if (data.success && jobsData.length > 0) {
                    // Normalize all jobs to ensure they have valid id fields
                    const normalizedJobs = jobsData.map((job) => normalizeJob(job));
                    setJobs(normalizedJobs);
                } else {
                    setJobs([]);
                }
            })
            .catch(() => setJobs([]))
            .finally(() => setLoading(false));
    }, []);

    const categories = useMemo(() => {
        if (jobs.length === 0) return ['All'];

        const typeSet = new Set<string>();
        const skillFrequency = new Map<string, number>();

        for (const job of jobs) {
            typeSet.add(getJobTypeLabel(job.type));
            for (const skill of job.skills) {
                skillFrequency.set(skill, (skillFrequency.get(skill) ?? 0) + 1);
            }
        }

        const typeCategories = Array.from(typeSet);
        const topSkills = Array.from(skillFrequency.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([skill]) => skill)
            .slice(0, 6);

        return ['All', ...[...typeCategories, ...topSkills].slice(0, 8)];
    }, [jobs]);

    const filteredJobs = useMemo(() => {
        if (selectedCategory === 'All') return jobs;

        const selected = selectedCategory.toLowerCase();
        return jobs.filter((job) => {
            const byType = getJobTypeLabel(job.type).toLowerCase() === selected;
            const bySkill = job.skills.some((skill) => skill.toLowerCase() === selected);
            return byType || bySkill;
        });
    }, [jobs, selectedCategory]);

    const SectionHeader = (
        <div className="mb-10">
            <div className="text-center">
                <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Explore Your Next Big Opportunity
                </h2>
            </div>
            {!loading && categories.length > 0 && (
                <>
                    <div className="mt-6 lg:hidden">
                        <label htmlFor="job-category-filter" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            Filter Category
                        </label>
                        <div className="relative w-full max-w-72">
                            <select
                                id="job-category-filter"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="h-10 w-full appearance-none rounded-full border border-slate-300 bg-white pl-4 pr-10 text-[13px] font-semibold text-slate-800 shadow-[0_6px_18px_rgba(15,23,42,0.06)] outline-none transition focus:border-lime-500"
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 hidden lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-2.5">
                        {categories.map((category) => (
                            <button
                                type="button"
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`shrink-0 rounded-full border px-5 py-2 text-sm leading-none transition ${selectedCategory === category
                                    ? 'border-lime-500 bg-lime-300 text-black'
                                    : 'border-black/40 bg-white text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );

    if (loading) {
        return (
            <section className="w-full max-w-[1350px] mx-auto px-2 sm:px-6 md:px-8 xl:px-10 py-20 bg-[#fcfcfc]">
                {SectionHeader}
                <SkeletonGrid count={8} gridClass="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
            </section>
        );
    }

    if (jobs.length === 0) {
        return (
            <section className="w-full max-w-337.5 mx-auto px-2 sm:px-6 md:px-8 xl:px-10 py-20 bg-[#fcfcfc]">
                {SectionHeader}
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                    <p className="text-2xl mb-2">🚀</p>
                    <p className="text-slate-500 font-medium text-lg">New opportunities coming soon</p>
                    <p className="text-slate-400 text-sm mt-1">Check back later or sign up to get notified</p>
                </div>
            </section>
        );
    }

    return (
        <section className="w-full max-w-337.5 mx-auto px-2 py-20 bg-[#fcfcfc]">
            {SectionHeader}
            <div className="relative">
                <div className="mx-auto overflow-hidden max-h-270 md:max-h-212.5">
                    <JobCardGrid jobs={filteredJobs} gridClass="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4" />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-linear-to-b from-transparent via-[#fcfcfc]/80 to-[#fcfcfc]" />
            </div>

            <div className="mt-10 text-center relative z-20">
                <Link
                    href="/internships"
                    className="inline-flex items-center gap-2 rounded-full bg-black px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 hover:scale-105 shadow-xl"
                >
                    View More Opportunities
                    <FaArrowRight />
                </Link>
            </div>
        </section>
    );
}