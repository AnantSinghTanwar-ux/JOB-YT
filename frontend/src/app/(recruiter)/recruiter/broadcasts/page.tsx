'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner, Card } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface BroadcastMessage {
  id: string;
  job_id: string;
  job_title?: string;
  message_body: string;
  channels: string[];
  created_at: string;
  recipient_count?: number;
}

const CHANNEL_LABELS: Record<string, { icon: string; label: string }> = {
  in_app: { icon: '🔔', label: 'In-App' },
  email: { icon: '📧', label: 'Email' },
  push: { icon: '📱', label: 'Push' },
  whatsapp: { icon: '💬', label: 'WhatsApp' },
};

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        // Fetch broadcast history from the recruiter's jobs
        const res = await api.get<BroadcastMessage[]>('/recruiter/broadcasts');
        setBroadcasts(res.data ?? []);
      } catch (err: any) {
        // If endpoint doesn't exist yet, show empty state gracefully
        if (err?.status === 404) {
          setBroadcasts([]);
        } else {
          setError('Failed to load broadcast history.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-4xl py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Broadcast History</h1>
        <p className="text-sm text-gray-500 mt-1">
          All messages you've sent to applicants across your job listings.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-red-500">{error}</Card>
      ) : broadcasts.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-amber-50 p-4 text-3xl">📢</div>
          <h3 className="text-sm font-semibold text-slate-900">No broadcasts yet</h3>
          <p className="text-sm text-slate-500 mt-1">
            Go to a job listing's applicants page and use the "Broadcast" button to send a message to all applicants.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {broadcast.job_title && (
                    <p className="text-xs font-semibold text-lime-700 uppercase tracking-wide mb-1">
                      {broadcast.job_title}
                    </p>
                  )}
                  <p className="text-sm text-slate-800 leading-relaxed">{broadcast.message_body}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-slate-400">{formatDate(broadcast.created_at)}</p>
                  {broadcast.recipient_count !== undefined && (
                    <p className="text-xs text-slate-500 mt-1">{broadcast.recipient_count} recipient{broadcast.recipient_count !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>

              {/* Channels */}
              <div className="mt-3 flex flex-wrap gap-2">
                {broadcast.channels.map((ch) => {
                  const meta = CHANNEL_LABELS[ch] ?? { icon: '📡', label: ch };
                  return (
                    <span
                      key={ch}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                    >
                      {meta.icon} {meta.label}
                    </span>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
