'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';
import { FaLaptop, FaChevronRight, FaArrowUp, FaArrowDown, FaMinus, FaGraduationCap, FaClock } from 'react-icons/fa6';

interface AiInterviewSession {
  id: string;
  role_title: string;
  job_description: string | null;
  status: 'created' | 'questions_generated' | 'in_progress' | 'completed' | 'evaluated' | 'report_generated';
  overall_score: number | null;
  completed_at: string | null;
  created_at: string;
}

interface StudentReadinessScore {
  current_score: number;
  trend: 'improving' | 'declining' | 'stable';
  last_updated_at: string;
}

interface ReadinessScoreHistory {
  id: string;
  session_id: string;
  previous_score: number | null;
  interview_score: number;
  new_score: number;
  trend: 'improving' | 'declining' | 'stable';
  created_at: string;
}

export default function InterviewsDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AiInterviewSession[]>([]);
  const [readiness, setReadiness] = useState<StudentReadinessScore | null>(null);
  const [history, setHistory] = useState<ReadinessScoreHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [sessionsRes, readinessRes] = await Promise.all([
        api.get<AiInterviewSession[]>('/interviews/sessions'),
        api.get<{ readiness: StudentReadinessScore | null; history: ReadinessScoreHistory[] }>('/interviews/readiness'),
      ]);

      setSessions(sessionsRes.data || []);
      setReadiness(readinessRes.data?.readiness || null);
      setHistory(readinessRes.data?.history || []);
    } catch (err) {
      console.error('Failed to load mock interviews dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getStatusBadge = (status: AiInterviewSession['status']) => {
    switch (status) {
      case 'created':
      case 'questions_generated':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Ready</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">In Progress</span>;
      case 'completed':
      case 'evaluated':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 animate-pulse">
            <FaClock className="text-[10px]" /> Evaluating
          </span>
        );
      case 'report_generated':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Evaluated</span>;
    }
  };

  const getTrendBadge = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FaArrowUp className="text-[10px]" /> Improving
          </span>
        );
      case 'declining':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <FaArrowDown className="text-[10px]" /> Declining
          </span>
        );
      case 'stable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <FaMinus className="text-[10px]" /> Stable
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-lime-400 border-t-transparent animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Loading mock interviews dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] w-full ml-4 sm:ml-6 lg:ml-8 pr-4 text-[#1a1a1a]">
      {/* Welcome Banner */}
      <div className="mb-8 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-white/5 shadow-xl text-white">
        <div className="flex items-center gap-3 text-lime-400 mb-3">
          <FaLaptop className="text-2xl" />
          <span className="text-xs uppercase tracking-wider font-extrabold">AI Interview Agent</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          Mock Interview Center
        </h1>
        <p className="text-slate-400 max-w-[600px] text-sm md:text-base leading-relaxed">
          Practice async mock interviews tailored to any job title. Receive instant grading on 5 criteria and track your preparation readiness scores.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Left Side: Readiness Gauge */}
        <div className="lg:col-span-1 bg-[#141414] text-white rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl flex flex-col items-center text-center justify-between min-h-[360px]">
          <div>
            <h3 className="text-[16px] font-bold text-slate-400 uppercase tracking-wider mb-2">Readiness Rating</h3>
            <p className="text-slate-500 text-xs px-4">Rolling average weighted score based on your mock interview performances.</p>
          </div>

          <div className="my-6 relative flex items-center justify-center w-36 h-36 rounded-full bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="absolute inset-2 rounded-full border border-lime-400/20 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-lime-400">
                {readiness ? readiness.current_score : 0}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-1">out of 100</span>
            </div>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-center gap-3 mb-6">
              {readiness ? getTrendBadge(readiness.trend) : getTrendBadge('stable')}
            </div>
            <Button
              variant="brand"
              onClick={() => router.push('/interviews/setup')}
              className="w-full rounded-2xl font-bold py-3 text-sm flex items-center justify-center gap-2"
            >
              Start New Mock
              <FaChevronRight className="text-[10px]" />
            </Button>
          </div>
        </div>

        {/* Right Side: Readiness Timeline */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">
            Readiness Progression
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[280px] pr-2">
            {history.length > 0 ? (
              <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6 py-2">
                {history.map((hist) => (
                  <div key={hist.id} className="relative">
                    {/* Circle Dot */}
                    <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-lime-500 border border-white"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Readiness updated to {hist.new_score}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            (was {hist.previous_score ?? 0})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Interview graded at <span className="font-semibold text-slate-700">{hist.interview_score}/100</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400">
                          {new Date(hist.created_at).toLocaleDateString()}
                        </span>
                        {getTrendBadge(hist.trend)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                <FaGraduationCap className="text-3xl mb-3 text-slate-300" />
                <p className="text-sm font-medium">No performance records found yet.</p>
                <p className="text-xs mt-1 max-w-[280px]">Complete your first mock interview session to start tracking your progress.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sessions History Table */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm mb-12">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
          Mock Interview History
        </h3>
        
        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Role Title</th>
                  <th className="pb-3">Date Completed</th>
                  <th className="pb-3 text-center">Session Score</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 text-sm">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-2 font-semibold text-slate-800">
                      {session.role_title}
                    </td>
                    <td className="py-4 text-slate-500 text-xs">
                      {session.completed_at
                        ? new Date(session.completed_at).toLocaleDateString()
                        : 'Unfinished'}
                    </td>
                    <td className="py-4 text-center font-bold text-slate-900">
                      {session.overall_score !== null ? `${session.overall_score}/100` : '—'}
                    </td>
                    <td className="py-4">
                      {getStatusBadge(session.status)}
                    </td>
                    <td className="py-4 text-right pr-2">
                      {session.status === 'report_generated' ? (
                        <button
                          onClick={() => router.push(`/interviews/${session.id}/report`)}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                        >
                          View Report
                        </button>
                      ) : ['created', 'questions_generated', 'in_progress'].includes(session.status) ? (
                        <button
                          onClick={() => router.push(`/interviews/${session.id}`)}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold bg-lime-400 text-black hover:bg-lime-500 transition-colors"
                        >
                          Resume
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Processing</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <span className="text-4xl mb-4">🚀</span>
            <h4 className="font-bold text-slate-700 mb-1">Start your first interview</h4>
            <p className="text-xs text-slate-500 max-w-[280px] mb-6">Create mock interview sessions matching the exact jobs you are targeting.</p>
            <Button
              variant="brand"
              onClick={() => router.push('/interviews/setup')}
              className="font-bold rounded-2xl px-6"
            >
              Get Started
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
