'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AutoApplyApi, QueueItem } from '@/lib/api/autoApply.api';
import { ROUTES } from '@/constants';
import { Spinner } from '@/components/ui';

interface AuditEvent {
  id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AutoApplyQueueDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<QueueItem | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const itemRes = await api.get<QueueItem>(`/auto-apply/queue/${id}`);
        setItem(itemRes.data || null);
        if (itemRes.data?.job_id) {
          const evRes = await AutoApplyApi.getEvents(itemRes.data.job_id);
          const payload = evRes.data as { events?: AuditEvent[] } | AuditEvent[] | undefined;
          const list = Array.isArray(payload) ? payload : payload?.events || [];
          setEvents(list);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!item) return <p className="text-center py-20 text-slate-500">Not found</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={ROUTES.autoApply} className="text-sm text-slate-500 mb-4 inline-block">← Back to queue</Link>
      <div className="glass-card p-6 mb-6">
        <h1 className="text-2xl font-display text-[#0b1120]">{item.job_title}</h1>
        <p className="text-slate-500">{item.company_name}</p>
        <p className="text-3xl font-bold text-[#c3ff3d] mt-3">{item.match_score}% match</p>
        <p className="text-sm text-slate-600 mt-2">{item.match_reason?.human_summary}</p>
        <p className="text-xs text-slate-400 mt-4">Status: {item.status}</p>
        {item.failure_reason && (
          <p className="text-sm text-rose-600 mt-2">{item.failure_reason}</p>
        )}
      </div>

      <div className="glass-card p-6">
        <h2 className="font-display text-lg mb-4">Activity</h2>
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="text-sm border-l-2 border-[#c3ff3d] pl-3">
              <span className="font-bold">{e.event_type}</span>
              <span className="text-slate-400 ml-2">{new Date(e.created_at).toLocaleString()}</span>
            </li>
          ))}
          {events.length === 0 && <li className="text-slate-400 text-sm">No events yet.</li>}
        </ul>
      </div>
    </div>
  );
}
