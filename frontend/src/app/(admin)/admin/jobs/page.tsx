'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { normalizeCompany } from '@/lib/utils';
import { Job } from '@/types';
import { Spinner, Badge, Button, Input } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  const fetchJobs = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const res = await api.getPaginated<Job>(`/admin/jobs?page=${p}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`);
      setJobs((res.data ?? []).map(normalizeCompany));
      setTotal(res.pagination?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs('', 1);
  }, [fetchJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchJobs(search, 1);
  };

  const closeJob = async (jobId: string) => {
    const reason = prompt('Close reason (required):');
    if (!reason) return;
    setActing(jobId);
    try {
      await api.patch(`/admin/jobs/${jobId}/close`, { reason });
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'closed' as const } : j));
      toast.success('Job closed');
    } catch {
      toast.error('Failed to close job');
    } finally {
      setActing(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    const reason = prompt('Delete reason (required):');
    if (!reason) return;
    setActing(jobId);
    try {
      await api.delete(`/admin/jobs/${jobId}`, { reason });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success('Job deleted');
    } catch {
      toast.error('Failed to delete job');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-6">
      <section>
        <h1 className="text-[44px] leading-[1.05] font-black tracking-tight text-black">Job Moderation</h1>
        <p className="mt-2 text-xl leading-tight text-black/80">Review and moderate all posted jobs.</p>
      </section>

      <section className="rounded-2xl bg-[#ece9e2] border border-black/5 shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="sm:max-w-sm"
          />
          <Button type="submit" size="sm" className="sm:w-auto">Search</Button>
          <p className="sm:ml-auto text-sm font-semibold text-slate-600">{total} jobs</p>
        </form>
      </section>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-black text-[11px] font-bold uppercase text-lime-300 tracking-[0.09em]">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-left">Posted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{job.title}</td>
                  <td className="px-4 py-3 text-slate-600">{job.companyName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        job.job_approval_status === 'approved' || job.status === 'active'
                          ? 'success'
                          : job.job_approval_status === 'rejected' || job.status === 'closed'
                            ? 'danger'
                            : 'default'
                      }
                    >
                      {job.job_approval_status === 'approved'
                        ? 'active'
                        : job.job_approval_status === 'rejected'
                          ? 'closed'
                          : job.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{job.views_count}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(job.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {job.status === 'active' && (
                        <Button size="sm" variant="secondary" isLoading={acting === job.id} onClick={() => closeJob(job.id)}>
                          Close
                        </Button>
                      )}
                      <Button size="sm" variant="danger" isLoading={acting === job.id} onClick={() => deleteJob(job.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => { setPage(page - 1); void fetchJobs(search, page - 1); }}>Prev</Button>
          <span className="self-center text-sm text-slate-600 font-semibold">Page {page}</span>
          <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => { setPage(page + 1); void fetchJobs(search, page + 1); }}>Next</Button>
        </div>
      )}
    </div>
  );
}
