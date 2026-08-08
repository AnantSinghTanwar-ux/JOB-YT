'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { PracticeSession } from '@/types/coding';
import { ArrowRight, Code2, History, Play } from 'lucide-react';

export default function CodingHubPage() {
  const [progress, setProgress] = useState<{ solved: number; totalAttempts: number } | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [progRes, sessRes] = await Promise.all([
          CodingApi.getPracticeProgress(),
          CodingApi.listPracticeSessions(),
        ]);
        setProgress(progRes.data ?? null);
        setSessions(sessRes.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <Spinner />
      </div>
    );
  }

  const accuracy = progress && progress.totalAttempts > 0 
    ? Math.round((progress.solved / progress.totalAttempts) * 100) 
    : 0;

  return (
    <div className="max-w-[1400px] ml-4 sm:ml-6 lg:ml-8 pr-4 py-8 pb-16 font-sans">
      {/* Hero Section */}
      <div className="mb-10 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0b1120] tracking-tight mb-3 font-display">
            Coding Arena
          </h1>
          <p className="text-slate-500 max-w-lg">
            Practice problems, run your code in the browser, and track your proficiency with real-time metrics.
          </p>
        </div>

        {/* Stats Boxes */}
        {progress && (
          <div className="flex flex-wrap gap-5">
            <div className="bg-[#141414] rounded-2xl px-7 py-5 flex items-center gap-5 min-w-[200px] shadow-sm cursor-default">
              <span className="text-5xl font-extrabold text-[#c3ff3d] leading-none tracking-tight">
                {progress.solved}
              </span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-snug">
                Problems<br />Solved
              </span>
            </div>
            <div className="bg-[#141414] rounded-2xl px-7 py-5 flex items-center gap-5 min-w-[200px] shadow-sm cursor-default">
              <span className="text-5xl font-extrabold text-[#c3ff3d] leading-none tracking-tight">
                {accuracy}
              </span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-snug">
                Accuracy<br />Rate (%)
              </span>
            </div>
            <div className="bg-[#141414] rounded-2xl px-7 py-5 flex items-center gap-5 min-w-[200px] shadow-sm cursor-default">
              <span className="text-5xl font-extrabold text-[#c3ff3d] leading-none tracking-tight">
                {progress.totalAttempts}
              </span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-snug">
                Total<br />Attempts
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Actions Grid - Now 3 Columns to use the space nicely */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        
        {/* Practice Block */}
        <div className="glass-card rounded-2xl p-8 flex flex-col justify-between border border-slate-200/60 bg-white/70 hover:shadow-lg transition-shadow">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#0b1120] text-[#c3ff3d] flex items-center justify-center mb-6">
              <Code2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#0b1120] mb-3">Algorithm Library</h2>
            <p className="text-slate-600 leading-relaxed mb-8 text-sm">
              Access the curated dataset of coding challenges. Execute in the browser. No configuration required.
            </p>
          </div>
          <Link href={ROUTES.codingPractice} className="inline-flex items-center w-fit text-[#0b1120] font-semibold hover:text-blue-600 transition-colors">
            Begin Session
            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
          </Link>
        </div>

        {/* Placeholder / Featured Design Card */}
        <div className="glass-card rounded-2xl p-8 flex flex-col justify-center items-center border border-[#c3ff3d]/30 bg-gradient-to-br from-[#0b1120] to-[#1a253a] relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c3ff3d]/10 blur-3xl rounded-full"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Weekly Challenge</h2>
            <div className="mt-4 px-4 py-1.5 rounded-full border border-[#c3ff3d]/30 bg-[#c3ff3d]/10 text-[#c3ff3d] text-sm font-semibold tracking-wide">
              Coming soon
            </div>
          </div>
        </div>

        {/* Submissions Block */}
        <div className="glass-card rounded-2xl p-8 flex flex-col justify-between border border-slate-200/60 bg-white/70 hover:shadow-lg transition-shadow">
          <div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0b1120] flex items-center justify-center mb-6">
              <History className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#0b1120] mb-3">Execution History</h2>
            <p className="text-slate-600 leading-relaxed mb-8 text-sm">
              Review prior submissions, evaluate runtime complexity, and retrieve historic source code.
            </p>
          </div>
          <Link href={ROUTES.codingSubmissions} className="inline-flex items-center w-fit text-[#0b1120] font-semibold hover:text-blue-600 transition-colors">
            View Records
            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
          </Link>
        </div>

      </div>

      {/* Activity Log */}
      {sessions.length > 0 && (
        <div className="glass-card rounded-2xl border border-slate-200/60 bg-white/70 overflow-hidden">
          <div className="flex items-end justify-between border-b border-slate-100 px-6 py-5 bg-white/40">
            <h2 className="text-lg font-bold text-[#0b1120]">Recent Executions</h2>
            <Link href={ROUTES.codingSubmissions} className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              View all history
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-y border-slate-200/60 text-[10px] font-bold tracking-widest uppercase text-[#0b1120] bg-slate-50/50">
                  <th className="py-4 px-6 w-[20%]">Session ID</th>
                  <th className="py-4 px-6 w-[20%]">Status</th>
                  <th className="py-4 px-6 w-[30%]">Started At</th>
                  <th className="py-4 px-6 w-[15%]">Attempts</th>
                  <th className="py-4 px-6 w-[15%] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.slice(0, 5).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-5 px-6">
                      <span className="font-mono text-xs font-bold text-[#c3ff3d] bg-[#0b1120] px-2.5 py-1.5 rounded-md shadow-sm">
                        #{s.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      {s.solved ? (
                        <span className="px-3 py-1 rounded-md bg-[#c3ff3d]/20 text-[#346538] text-[11px] font-bold tracking-wide uppercase border border-[#c3ff3d]/30">
                          Passed
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold tracking-wide uppercase border border-slate-200">
                          Attempting
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-6 text-sm text-[#0b1120] font-medium">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date'}
                    </td>
                    <td className="py-5 px-6 text-sm text-slate-500 font-semibold">
                      {s.attempts_count}
                    </td>
                    <td className="py-5 px-6 text-right">
                      <Link href={`${ROUTES.codingPractice}/${s.problem_version_id}`}>
                        <span className="text-[13px] font-bold text-[#0b1120] bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-lg group-hover:bg-[#0b1120] group-hover:text-[#c3ff3d] group-hover:border-[#0b1120] transition-all inline-flex items-center">
                          Resume
                          <ArrowRight className="w-3.5 h-3.5 ml-2" strokeWidth={2.5} />
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
