'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Spinner, Badge, Button, Input } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ROUTES } from '@/constants';

interface PendingJob {
  id: string;
  title: string;
  companyName: string | null;
  recruiter_id: string;
  status: string;
  created_at: string;
}

export default function AdminJobApprovalsPage() {
  const [jobs, setJobs] = useState<PendingJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const fetchJobs = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const res = await api.getPaginated<PendingJob>(
        `/admin/jobs/pending-approval?page=${p}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`
      );
      setJobs(res.data || []);
      setTotal(res.pagination.total);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'Failed to fetch pending jobs');
      } else {
        toast.error('Failed to fetch pending jobs');
      }
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

  const approve = async (jobId: string) => {
    setActing(jobId);
    try {
      await api.patch(`/admin/jobs/${jobId}/approve-job`, {});
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success('Job approved!');
    } catch (error) {
      toast.error('Failed to approve job');
    } finally {
      setActing(null);
    }
  };

  const reject = async (jobId: string) => {
    const reason = rejectReason[jobId];
    if (!reason?.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActing(jobId);
    try {
      await api.patch(`/admin/jobs/${jobId}/reject-job`, { reason });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setTotal((prev) => Math.max(0, prev - 1));
      setShowRejectModal(null);
      setRejectReason((prev) => {
        const updated = { ...prev };
        delete updated[jobId];
        return updated;
      });
      toast.success('Job rejected');
    } catch (error) {
      toast.error('Failed to reject job');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-6">
      <section>
        <h1 className="text-[44px] leading-[1.05] font-black tracking-tight text-black">Job Approvals</h1>
        <p className="mt-2 text-xl leading-tight text-black/80">Review and approve pending job postings from recruiters.</p>
      </section>

      <section className="rounded-2xl bg-[#ece9e2] border border-black/5 shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job title..."
            className="sm:max-w-sm"
          />
          <Button type="submit" size="sm" className="sm:w-auto">
            Search
          </Button>
          <p className="sm:ml-auto text-sm font-semibold text-slate-600">{total} pending approvals</p>
        </form>
      </section>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-8 text-center">
          <p className="text-slate-600 font-medium">No pending job approvals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-2xl bg-white border border-black/5 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{job.companyName}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="warning">Pending Approval</Badge>
                    <span className="text-xs text-slate-400">{formatDate(job.created_at)}</span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Link href={ROUTES.adminJobDetail(job.id)}>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="primary"
                    isLoading={acting === job.id}
                    onClick={() => approve(job.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setShowRejectModal(job.id)}
                    disabled={acting === job.id}
                  >
                    Reject
                  </Button>
                </div>
              </div>

              {/* Reject Modal */}
              {showRejectModal === job.id && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Rejection Reason *</label>
                  <textarea
                    value={rejectReason[job.id] || ''}
                    onChange={(e) => setRejectReason((prev) => ({ ...prev, [job.id]: e.target.value }))}
                    placeholder="Explain why this job is being rejected..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="danger"
                      isLoading={acting === job.id}
                      onClick={() => reject(job.id)}
                    >
                      Confirm Rejection
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRejectModal(null)}
                      disabled={acting === job.id}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            disabled={page === 1} 
            onClick={() => { 
              setPage(page - 1); 
              void fetchJobs(search, page - 1); 
            }}
          >
            Prev
          </Button>
          <span className="self-center text-sm text-slate-600 font-semibold">Page {page}</span>
          <Button 
            size="sm" 
            variant="outline" 
            disabled={page * 20 >= total} 
            onClick={() => { 
              setPage(page + 1); 
              void fetchJobs(search, page + 1); 
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
