'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';

interface Interview {
  id: string;
  application_id: string;
  interviewer_id: string;
  candidate_id: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  code_language?: string;
  notes?: string;
  feedback?: string;
  rating?: number;
  scheduled_at: string;
  started_at?: string;
  ended_at?: string;
  jobTitle?: string;
  companyName?: string;
}

export default function InterviewsHistoryPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const res = await api.get<{ data: Interview[] }>('/interviews');
        setInterviews(res.data?.data || (res.data as any) || []);
      } catch (err) {
        console.error('Failed to fetch interviews', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Interviews History</h1>
      <p className="text-slate-500 mb-8">View your scheduled and completed interviews.</p>

      {interviews.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📅</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Interviews Yet</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            You haven't been scheduled for any interviews yet. Keep applying to jobs and answering application questions to get noticed!
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {interviews.map((interview) => (
            <div key={interview.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Interview Session
                  </h3>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      interview.status === 'live'
                        ? 'bg-rose-100 text-rose-700 animate-pulse'
                        : interview.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : interview.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {interview.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">📅</span>
                    <span className="font-medium">{new Date(interview.scheduled_at).toLocaleString()}</span>
                  </div>
                  {interview.status === 'completed' && interview.rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">⭐</span>
                      <span className="font-medium text-slate-900">{interview.rating}/5 Rating</span>
                    </div>
                  )}
                  {interview.code_language && (
                     <div className="flex items-center gap-2">
                     <span className="text-slate-400">💻</span>
                     <span className="font-medium capitalize">{interview.code_language}</span>
                   </div>
                  )}
                </div>

                {interview.status === 'completed' && interview.feedback && (
                  <div className="mt-4 bg-slate-50 p-4 rounded-xl text-sm italic text-slate-700 border border-slate-100">
                    "{interview.feedback}"
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0 md:w-32">
                {interview.status === 'live' || interview.status === 'scheduled' ? (
                  <Link
                    href={`/interviews/live/${interview.id}`}
                    className="w-full text-center px-4 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Join Room
                  </Link>
                ) : (
                  <Link
                    href={`/interviews/${interview.id}`}
                    className="w-full text-center px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    View Details
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
