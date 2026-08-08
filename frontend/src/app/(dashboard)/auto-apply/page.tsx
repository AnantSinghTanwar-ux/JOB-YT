'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AutoApplyApi, QueueItem } from '@/lib/api/autoApply.api';
import { ROUTES } from '@/constants';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

import { FaGear, FaBuilding, FaRotateRight, FaCheck, FaXmark, FaCircleExclamation } from 'react-icons/fa6';

const TABS = ['pending_approval', 'matched', 'submitted', 'skipped', 'failed'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  pending_approval: 'Pending Approval',
  matched: 'Matched',
  submitted: 'Submitted',
  skipped: 'Skipped',
  failed: 'Failed',
};

const STATUS_COLORS: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-700 border-amber-200',
  submitted: 'bg-green-100 text-green-700 border-green-200',
  skipped: 'bg-slate-100 text-slate-500 border-slate-200',
  failed: 'bg-red-100 text-red-600 border-red-200',
  tailoring: 'bg-blue-100 text-blue-600 border-blue-200',
  submitting: 'bg-blue-100 text-blue-600 border-blue-200',
  matched: 'bg-purple-100 text-purple-600 border-purple-200',
  expired: 'bg-slate-100 text-slate-400 border-slate-200',
  cancelled: 'bg-slate-100 text-slate-400 border-slate-200',
};

export default function AutoApplyDashboardPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>('pending_approval');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        AutoApplyApi.listQueue({ status: tab, page: 1 }),
        AutoApplyApi.getQueueStats(),
      ]);
      setItems(Array.isArray(queueRes.data) ? queueRes.data : []);
      setStats(statsRes.data || {});
    } catch {
      toast.error('Failed to load Auto-Apply queue');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '_approve');
    try {
      await AutoApplyApi.approve(id);
      toast.success('Approved — submitting application...');
      void load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + '_reject');
    try {
      await AutoApplyApi.reject(id);
      toast.success('Skipped');
      void load();
    } catch {
      toast.error('Could not skip item');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (id: string) => {
    setActionLoading(id + '_retry');
    try {
      await AutoApplyApi.retry(id);
      toast.success('Retrying application...');
      void load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Retry failed';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPending = stats.pending_approval || 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display text-[#0b1120] tracking-tight">Auto-Apply Queue</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Review matches and applications Jobyt submits for you.</p>
        </div>
        <Link
          href={ROUTES.autoApplySettings}
          className="px-6 py-2.5 rounded-xl bg-[#0b1120] text-white hover:bg-[#1a2533] shadow-[0_4px_14px_0_rgba(11,17,32,0.15)] hover:shadow-[0_6px_20px_rgba(11,17,32,0.2)] hover:-translate-y-0.5 transition-all duration-200 text-sm font-bold flex items-center gap-2 w-fit"
        >
          <FaGear /> Settings
        </Link>
      </div>

      {/* Stats strip */}
      <div className="flex flex-wrap gap-5 mb-10">
        {[
          { label1: 'Pending', label2: 'Approval', key: 'pending_approval', value: stats.pending_approval || 0 },
          { label1: 'Total', label2: 'Submitted', key: 'submitted', value: stats.submitted || 0 },
          { label1: 'Jobs', label2: 'Skipped', key: 'skipped', value: stats.skipped || 0 },
          { label1: 'Failed', label2: 'Attempts', key: 'failed', value: stats.failed || 0 },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key as Tab)}
            className={`rounded-2xl px-7 py-5 flex items-center gap-5 min-w-[200px] shadow-sm transition-all bg-[#141414] ${
              tab === s.key ? 'ring-2 ring-[#c3ff3d]' : 'hover:bg-[#1c1c1c] ring-1 ring-transparent'
            }`}
          >
            <span className={`text-5xl font-extrabold leading-none tracking-tight ${s.key === 'failed' && s.value > 0 ? 'text-red-400' : 'text-[#c3ff3d]'}`}>
              {s.value}
            </span>
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-snug text-left">
              {s.label1}<br />{s.label2}
            </span>
          </button>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-10 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl w-fit border border-slate-200/60 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              tab === t
                ? 'bg-[#0b1120] text-white shadow-md'
                : 'text-slate-500 hover:text-[#0b1120] hover:bg-slate-100/80'
            }`}
          >
            {TAB_LABELS[t]}
            {t === 'pending_approval' && totalPending > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-[#0b1120] text-[10px] font-black leading-none">
                {totalPending}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="glass-card p-6 group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
              {/* Status accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
                item.status === 'submitted' ? 'bg-green-400' :
                item.status === 'failed' ? 'bg-red-400' :
                item.status === 'skipped' || item.status === 'cancelled' ? 'bg-slate-300' :
                'bg-[#c3ff3d]'
              }`} />

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pl-5">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-display text-xl text-[#0b1120] truncate">{item.job_title || 'Job'}</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-[0.12em] shrink-0 ${STATUS_COLORS[item.status] || STATUS_COLORS.cancelled}`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm font-bold text-slate-500 flex-wrap">
                    <span className="flex items-center gap-2">
                      <FaBuilding className="text-slate-400 shrink-0"/>
                      {item.company_name || 'Unknown Company'}
                    </span>
                    {item.match_score != null && (
                      <span className="flex items-center gap-2 text-[#0b1120]">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${item.match_score >= 80 ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' : item.match_score >= 60 ? 'bg-[#c3ff3d] shadow-[0_0_6px_rgba(195,255,61,0.8)]' : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'}`} />
                        {item.match_score}% Match
                      </span>
                    )}
                  </div>

                  {item.match_reason?.human_summary && (
                    <p className="text-sm text-slate-500 max-w-2xl leading-relaxed font-medium">
                      {item.match_reason.human_summary}
                    </p>
                  )}

                  {/* Failure reason */}
                  {item.status === 'failed' && item.failure_reason && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1">
                      <FaCircleExclamation className="text-red-400 shrink-0 mt-0.5 text-sm" />
                      <p className="text-xs font-semibold text-red-600 leading-snug">{item.failure_reason}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  {item.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => void handleReject(item.id)}
                        disabled={actionLoading === item.id + '_reject'}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading === item.id + '_reject' ? <Spinner size="sm" /> : <FaXmark />}
                        Skip
                      </button>
                      <button
                        onClick={() => void handleApprove(item.id)}
                        disabled={actionLoading === item.id + '_approve'}
                        className="px-5 py-2.5 rounded-xl bg-[#c3ff3d] hover:bg-[#b0f224] text-[#0b1120] text-sm font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading === item.id + '_approve' ? <Spinner size="sm" /> : <FaCheck />}
                        Approve & Apply
                      </button>
                    </>
                  )}

                  {item.status === 'failed' && (
                    <button
                      onClick={() => void handleRetry(item.id)}
                      disabled={actionLoading === item.id + '_retry'}
                      className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === item.id + '_retry' ? <Spinner size="sm" /> : <FaRotateRight />}
                      Retry
                    </button>
                  )}

                  <Link
                    href={ROUTES.autoApplyQueueItem(item.id)}
                    className="px-5 py-2.5 rounded-xl border-2 border-slate-100 hover:border-slate-300 text-[#0b1120] bg-white text-sm font-bold transition-colors text-center"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const map: Record<Tab, { title: string; desc: string; showBtn: boolean }> = {
    pending_approval: {
      title: "Queue is empty",
      desc: "Jobyt is actively searching for new matches. Enable Auto-Apply and run a preview to populate your queue.",
      showBtn: true,
    },
    submitted: {
      title: "No applications yet",
      desc: "Approved matches will appear here once submitted.",
      showBtn: false,
    },
    skipped: {
      title: "No skipped jobs",
      desc: "Jobs you choose to pass on will be archived here.",
      showBtn: false,
    },
    failed: {
      title: "Zero failures",
      desc: "Everything is running smoothly.",
      showBtn: false,
    },
    matched: {
      title: "No matched jobs",
      desc: "Jobs matched by your Auto-Apply settings will appear here.",
      showBtn: false,
    },
  };

  const state = map[tab];

  return (
    <div className="py-24 px-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 max-w-3xl mx-auto">
      <h3 className="text-lg font-bold text-[#0b1120] mb-1">{state.title}</h3>
      <p className="text-sm text-slate-500 font-medium mb-6">{state.desc}</p>
      {state.showBtn && (
        <Link
          href={ROUTES.autoApplySettings}
          className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-[#0b1120] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <FaGear className="text-xs" /> Configure Match Settings
        </Link>
      )}
    </div>
  );
}
