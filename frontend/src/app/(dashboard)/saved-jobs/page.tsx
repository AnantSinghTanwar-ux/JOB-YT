'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Job } from '@/types';
import { API_BASE } from '@/constants';
import { BackendJob, JobCardGrid, SkeletonGrid, normalizeJob } from '@/components/ui/JobCard';
import { FaTrashCan } from 'react-icons/fa6';

export default function SavedJobsPage() {
    const [jobs, setJobs] = useState<BackendJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<Job[]>('/users/me/saved-jobs')
            .then((res) => {
                // Normalize all jobs to ensure they have valid id fields
                const normalizedJobs = (res.data || []).map((j: Job) => normalizeJob(j));
                setJobs(normalizedJobs);
            })
            .catch(() => setJobs([]))
            .finally(() => setLoading(false));
    }, []);

    const unsave = async (jobId: string) => {
        try {
            await api.delete(`/users/me/saved-jobs/${jobId}`);
            setJobs((prev) => prev.filter((j) => j.id !== jobId));
        } catch { /* silent */ }
    };

    return (
        <div className="max-w-[1400px] ml-4 sm:ml-6 lg:ml-8 pr-4">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] tracking-tight mb-2">
                Saved Jobs
            </h1>
            <p className="text-slate-500 font-medium text-sm md:text-base mb-5">
                Saved jobs will be automatically removed from here whenever their application deadline is over
            </p>

            {loading ? (
                <SkeletonGrid count={6} gridClass="!mx-0 grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
            ) : jobs.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                    <p className="text-slate-500 font-medium text-lg">No saved jobs yet</p>
                    <p className="text-slate-400 text-sm mt-1">Browse internships and save the ones you like!</p>
                </div>
            ) : (
                <JobCardGrid jobs={jobs} gridClass="!mx-0 grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
            )}
        </div>
    );
}
