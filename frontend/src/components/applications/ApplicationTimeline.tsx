'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PipelineEvent } from '@/types';
import { Spinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '@/constants';

interface ApplicationTimelineProps {
  applicationId: string;
}

export const ApplicationTimeline = ({ applicationId }: ApplicationTimelineProps) => {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        if (active) setLoading(true);
        const res = await api.get<PipelineEvent[]>(`/applications/${applicationId}/events`);
        if (!active) return;
        setEvents(res.data ?? []);
        setError(null);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load timeline events';
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [applicationId]);

  if (loading) {
    return <div className="flex justify-center py-6"><Spinner size="md" /></div>;
  }

  if (error) {
    return <div className="text-sm text-red-500 text-center py-4">{error}</div>;
  }

  if (events.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-4">No events found.</div>;
  }

  return (
    <div className="relative border-l border-gray-200 ml-3 space-y-6 pb-4">
      {events.map((event) => (
        <div key={event.id} className="relative pl-6">
          {/* Timeline Dot */}
          <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">
                {event.previous_status ? (
                  <>
                    <span className="text-gray-500 line-through mr-1 text-xs">
                      {APPLICATION_STATUS_LABELS[event.previous_status]}
                    </span>
                    <span className="text-gray-400 mr-1 text-xs px-1">➔</span>
                  </>
                ) : null}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${APPLICATION_STATUS_COLORS[event.new_status] || 'bg-gray-100 text-gray-800'}`}>
                  {APPLICATION_STATUS_LABELS[event.new_status]}
                </span>
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(event.created_at)}
              </span>
            </div>
            
            <p className="text-sm text-gray-600">
              {event.changed_by ? (
                <span>
                  Updated by{' '}
                  <span className="font-medium">
                    {event.changed_by.name || 'System'}
                  </span>{' '}
                  <span className="text-xs text-gray-400 capitalize">
                    ({event.changed_by.role})
                  </span>
                </span>
              ) : (
                <span>System Update</span>
              )}
            </p>

            {event.notes && (
              <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm italic text-gray-600 border border-gray-100">
                &quot;{event.notes}&quot;
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
