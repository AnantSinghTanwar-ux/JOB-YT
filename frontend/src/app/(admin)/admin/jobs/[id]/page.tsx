'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Job } from '@/types';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

import { formatSalaryRange } from '@/lib/salary';

export default function AdminJobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJob = async () => {
      setLoading(true);
      try {
        const res = await api.get<Job>(`/admin/jobs/${jobId}`);
        if (!res.data) {
          setJob(null);
          return;
        }
        setJob(res.data as Job);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to fetch job details';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void loadJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto pb-6">
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
          <p className="text-slate-600 font-medium">Job not found</p>
          <Link href={ROUTES.adminJobApprovals} className="inline-block mt-4">
            <Button variant="outline">Back to Approvals</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-6">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-[1.05] font-black tracking-tight text-black">{job.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={job.job_approval_status === 'pending_approval' ? 'warning' : job.job_approval_status === 'rejected' ? 'danger' : 'success'}>
              {(job.job_approval_status || 'approved').replace('_', ' ')}
            </Badge>
            <Badge variant={job.status === 'active' ? 'success' : job.status === 'closed' ? 'danger' : 'default'}>
              {job.status}
            </Badge>
            <span className="text-xs text-slate-500">Posted {formatDate(job.created_at)}</span>
          </div>
        </div>
        <Link href={ROUTES.adminJobApprovals}>
          <Button variant="outline">Back to Approvals</Button>
        </Link>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <article className="lg:col-span-2 rounded-2xl bg-white border border-black/5 shadow-sm p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Job Details</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Description</p>
              <p className="mt-1 whitespace-pre-wrap">{job.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Location</p>
                <p className="mt-1">{job.location || job.company_location || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Type</p>
                <p className="mt-1">{job.type}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Salary</p>
                <p className="mt-1">{formatSalaryRange(job.salary_min, job.salary_max, job.type)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Views</p>
                <p className="mt-1">{job.views_count}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.skills?.length ? job.skills.map((skill) => (
                  <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {skill}
                  </span>
                )) : <span className="text-slate-500">No skills listed</span>}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Company Details</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Company</p>
              <p className="mt-1">{job.companyName || 'Unknown Company'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Company Location</p>
              <p className="mt-1">{job.company_location || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Website</p>
              {job.company_website ? (
                <a
                  href={job.company_website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-blue-600 hover:underline break-all"
                >
                  {job.company_website}
                </a>
              ) : (
                <p className="mt-1">Not specified</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Source</p>
              <p className="mt-1">{job.source || 'recruiter'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Company Type</p>
              <p className="mt-1">{job.is_external_company ? 'External Company' : 'Platform Company'}</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
