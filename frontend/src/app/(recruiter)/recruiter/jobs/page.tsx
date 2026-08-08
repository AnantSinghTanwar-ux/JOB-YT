'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { normalizeCompany } from '@/lib/utils';
import { Job } from '@/types';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { FaPencil, FaTrash, FaPlus, FaBriefcase, FaLocationDot } from 'react-icons/fa6';
import toast from 'react-hot-toast';

interface ExtendedJob extends Job {
  application_count?: number;
  duration?: string | null;
}

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

import { formatSalaryRange } from '@/lib/salary';

const getJobStatusDisplay = (job: ExtendedJob) => {
  if (job.job_approval_status === 'pending_approval') {
    return { label: 'UNDER REVIEW', className: 'bg-black text-lime-300' };
  }
  if (job.job_approval_status === 'rejected') {
    return { label: 'REJECTED', className: 'bg-black text-lime-300' };
  }
  if (job.job_approval_status === 'approved') {
    return { label: 'ACTIVE', className: 'bg-lime-300 text-black' };
  }
  if (job.status === 'active') {
    return { label: 'ACTIVE', className: 'bg-lime-300 text-black' };
  }
  if (job.status === 'draft') {
    return { label: 'DRAFT', className: 'bg-slate-100 text-slate-700' };
  }
  return { label: 'CLOSED', className: 'bg-slate-300 text-slate-700' };
};

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<ExtendedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.getPaginated<ExtendedJob>('/jobs/my/listings?limit=50');
      setJobs((res.data ?? []).map(normalizeCompany));
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Close job "${title}"? This cannot be undone.`)) return;
    
    setDeleting(id);
    try {
      await api.delete(`/jobs/${id}`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success('Job listing closed');
    } catch (err) {
      toast.error('Failed to close job listing');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-6 animate-pulse">
        <div className="h-12 bg-slate-200 rounded-lg w-1/4 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl md:text-[44px] leading-[1.05] font-black tracking-tight text-black">Job Listings</h1>
            <p className="mt-2 text-xl leading-tight text-black/80">Manage and track all your internship postings</p>
          </div>
          <Link href={ROUTES.recruiterNewJob} className="shrink-0">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-black text-lime-300 rounded-xl hover:bg-slate-900 font-black transition-all active:scale-95 shadow-lg shadow-black/10">
              <FaPlus className="text-xs" />
              Post New Job
            </button>
          </Link>
        </section>

        <div className="rounded-2xl p-4 sm:p-6 space-y-4" style={{ backgroundColor: '#ece9e2' }}>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 p-12 sm:p-20 text-center bg-white/50">
          <div className="mx-auto w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-6">
            <FaBriefcase className="text-black/20 text-2xl" />
          </div>
          <h3 className="text-2xl font-black text-black mb-2">No job listings yet</h3>
          <p className="text-sm text-black/60 max-w-xs mx-auto mb-8">
            Start reaching out to thousands of eager candidates by posting your first internship.
          </p>
          <Link href={ROUTES.recruiterNewJob}>
            <button className="px-8 py-3 bg-black text-white rounded-xl hover:bg-slate-900 font-black transition-all active:scale-95">
              Post Your First Job
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => {
            const statusDisplay = getJobStatusDisplay(job);
            return (
            <div key={job.id} className="group rounded-2xl border border-black/5 bg-white p-6 hover:shadow-xl hover:shadow-black/5 transition-all duration-300">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-black truncate mb-1">{job.title}</h3>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-black/50 uppercase tracking-tight">
                        <span className="flex items-center gap-1.5">
                            <FaLocationDot className="text-xs" />
                            {job.location || 'Remote'}
                        </span>
                        {job.duration && (
                        <>
                            <span>•</span>
                            <span>{job.duration}</span>
                        </>
                        )}
                        {(job.salary_min || job.salary_max) && (
                        <>
                            <span>•</span>
                            <span className="text-black/70">{formatSalaryRange(job.salary_min, job.salary_max, job.type)}</span>
                        </>
                        )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm ${statusDisplay.className}`}>
                    {statusDisplay.label}
                  </span>
                </div>

                <p className="text-[14px] leading-relaxed text-black/60 line-clamp-2 bg-slate-50/50 p-3 rounded-xl border border-black/[0.03]">
                    {job.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">Applicants</span>
                            <span className="text-lg font-black text-black">{job.application_count ?? 0}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">Views</span>
                            <span className="text-lg font-black text-black">{job.views_count}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">Posted</span>
                            <span className="text-sm font-bold text-black/70 mt-1">{formatRelative(job.created_at)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={ROUTES.recruiterJobDetail(job.id)}>
                        <button className="px-5 py-2.5 bg-black text-lime-300 rounded-xl hover:bg-slate-900 text-xs font-black transition-all active:scale-95">
                            Manage Listing
                        </button>
                        </Link>
                        <Link href={ROUTES.recruiterJobDetail(job.id)}>
                        <button className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-black hover:text-white flex items-center justify-center transition-all active:scale-95" title="Edit Job">
                            <FaPencil className="text-xs" />
                        </button>
                        </Link>
                        <button
                        onClick={() => handleDelete(job.id, job.title)}
                        disabled={deleting === job.id}
                        className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-rose-500 hover:text-white disabled:opacity-50 flex items-center justify-center transition-all active:scale-95"
                        title="Close Job"
                        >
                        <FaTrash className="text-xs" />
                        </button>
                    </div>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
      </div>
    </div>
  );
}
