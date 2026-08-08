'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Modal } from '@/components/ui';
import {
  FaBrain,
  FaChevronRight,
  FaFileLines,
  FaLaptop,
  FaRoute,
  FaDollarSign,
  FaStar,
  FaClock,
} from 'react-icons/fa6';

interface CoachSession {
  id: string;
  student_id: string;
  title: string;
  mode: 'general' | 'resume_review' | 'interview_prep' | 'career_advice' | 'salary_negotiation';
  created_at: string;
  updated_at: string;
}

const COACH_MODES = [
  {
    mode: 'general',
    title: 'General Coaching',
    description: 'Brainstorm career goals, get search advice, and ask general professional questions.',
    cost: 1,
    icon: FaBrain,
    color: 'from-blue-600 to-indigo-600',
  },
  {
    mode: 'resume_review',
    title: 'Resume Review',
    description: 'Upload a resume, get structured bullet-by-bullet analysis, and fix word choices.',
    cost: 2,
    icon: FaFileLines,
    color: 'from-purple-600 to-indigo-600',
  },
  {
    mode: 'interview_prep',
    title: 'Interview Preparation',
    description: 'Simulate behavioral or technical mock interview questions and analyze responses.',
    cost: 2,
    icon: FaLaptop,
    color: 'from-amber-600 to-orange-600',
  },
  {
    mode: 'career_advice',
    title: 'Career Advice',
    description: 'Identify target career paths, certificates to acquire, and build 6-month upskilling plans.',
    cost: 2,
    icon: FaRoute,
    color: 'from-teal-600 to-emerald-600',
  },
  {
    mode: 'salary_negotiation',
    title: 'Salary Negotiation',
    description: 'Compare market rates, draft custom scripts, and evaluate job offers.',
    cost: 2,
    icon: FaDollarSign,
    color: 'from-rose-600 to-pink-600',
  },
] as const;

export default function CoachDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creatingMode, setCreatingMode] = useState<string | null>(null);

  // Resume Review Mode config states
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [defaultResume, setDefaultResume] = useState<any | null>(null);
  const [fetchingDefaultResume, setFetchingDefaultResume] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [sessionsRes, creditRes] = await Promise.all([
        api.get<CoachSession[]>('/coach/sessions'),
        api.get<{ balance: number }>('/credits/balance'),
      ]);

      setSessions(sessionsRes.data || []);
      setBalance(creditRes.data?.balance ?? 0);
    } catch (err) {
      console.error('Failed to load Coach dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchDefaultResume = async () => {
    setFetchingDefaultResume(true);
    setResumeUploadError(null);
    try {
      const res = await api.get<any>('/users/me/resumes/default');
      setDefaultResume(res.data?.resume || null);
    } catch (err: any) {
      console.warn('Failed to fetch default resume:', err);
      setDefaultResume(null);
    } finally {
      setFetchingDefaultResume(false);
    }
  };

  const handleStartResumeReviewSession = async (useUploaded: boolean) => {
    if (useUploaded && !selectedFile) {
      setResumeUploadError('Please select a PDF file first.');
      return;
    }

    setCreatingMode('resume_review');
    setResumeUploadError(null);

    try {
      let res;
      if (useUploaded && selectedFile) {
        const formData = new FormData();
        formData.append('mode', 'resume_review');
        formData.append('title', 'Coach: Resume Review');
        formData.append('file', selectedFile);

        res = await api.post<CoachSession>('/coach/sessions', formData);
      } else {
        res = await api.post<CoachSession>('/coach/sessions', {
          mode: 'resume_review',
          title: 'Coach: Resume Review',
        });
      }

      if (res?.data?.id) {
        setIsResumeModalOpen(false);
        router.push(`/coach/${res.data.id}`);
      }
    } catch (err: any) {
      console.error('Failed to start resume review session:', err);
      if (err.statusCode === 402 || err.response?.status === 402) {
        setResumeUploadError('Insufficient credits to start this session. Please purchase more credits.');
      } else {
        setResumeUploadError(err.message || 'Failed to initialize coach session. Please try again.');
      }
    } finally {
      setCreatingMode(null);
    }
  };

  const handleStartSession = async (mode: typeof COACH_MODES[number]['mode'], title: string) => {
    if (mode === 'resume_review') {
      setIsResumeModalOpen(true);
      fetchDefaultResume();
      return;
    }

    setCreatingMode(mode);
    try {
      const res = await api.post<CoachSession>('/coach/sessions', { mode, title });
      if (res.data?.id) {
        router.push(`/coach/${res.data.id}`);
      }
    } catch (err: any) {
      console.error('Failed to start coach session:', err);
      if (err.statusCode === 402 || err.response?.status === 402) {
        alert('Insufficient credits to start this advanced session mode. Please purchase more credits.');
      } else {
        alert('Failed to initialize coach session. Please try again.');
      }
    } finally {
      setCreatingMode(null);
    }
  };

  const getModeLabel = (mode: CoachSession['mode']) => {
    return COACH_MODES.find((m) => m.mode === mode)?.title || mode.replace('_', ' ');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-lime-400 border-t-transparent animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Loading Career Coach dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] w-full ml-4 sm:ml-6 lg:ml-8 pr-4 text-[#1a1a1a]">
      {/* Welcome Banner */}
      <div className="mb-8 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-white/5 shadow-xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-lime-400 mb-3">
            <FaBrain className="text-2xl" />
            <span className="text-xs uppercase tracking-wider font-extrabold">AI Career Coach</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2">
            <FaStar className="text-lime-400 text-sm" />
            <span className="text-xs font-bold text-slate-300">Balance:</span>
            <span className="text-sm font-extrabold text-lime-400">{balance} Credits</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          Your Personal Career Coach
        </h1>
        <p className="text-slate-400 max-w-[700px] text-sm md:text-base leading-relaxed">
          Unlock premium advice on demand. General mode queries cost <span className="text-lime-400 font-semibold">1 credit</span>. 
          Advanced modes (Resume Review, Interview Prep, Career Advice, Salary Negotiation) cost <span className="text-lime-400 font-semibold">2 credits</span> per response.
        </p>
      </div>

      {/* Select Coaching Mode Grid */}
      <div className="mb-12">
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-6">
          Choose a Coaching Mode
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {COACH_MODES.map((item) => {
            const Icon = item.icon;
            const isCreating = creatingMode === item.mode;
            return (
              <div
                key={item.mode}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center mb-4`}>
                    <Icon className="text-xl" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-[16px] mb-2 group-hover:text-lime-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mb-4">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Cost per Message</span>
                    <span className="text-sm font-extrabold text-slate-700">{item.cost} {item.cost === 1 ? 'Credit' : 'Credits'}</span>
                  </div>
                  <Button
                    variant="brand"
                    onClick={() => handleStartSession(item.mode, `Coach: ${item.title}`)}
                    isLoading={isCreating}
                    disabled={creatingMode !== null}
                    className="w-full rounded-xl font-bold py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    Start Session
                    <FaChevronRight className="text-[9px]" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sessions History List */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm mb-12">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
          Coaching Conversations
        </h3>

        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Session Title</th>
                  <th className="pb-3">Mode</th>
                  <th className="pb-3">Last Active</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 text-sm">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-2 font-semibold text-slate-800">
                      {session.title}
                    </td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {getModeLabel(session.mode)}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500 text-xs">
                      <div className="flex items-center gap-1">
                        <FaClock className="text-slate-400" />
                        {new Date(session.updated_at).toLocaleDateString()} at {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <button
                        onClick={() => router.push(`/coach/${session.id}`)}
                        className="px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                      >
                        Resume Chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <span className="text-4xl mb-4">💡</span>
            <h4 className="font-bold text-slate-700 mb-1">Your inbox is empty</h4>
            <p className="text-xs text-slate-500 max-w-[280px]">Select a coaching mode above to begin a personalized career coaching session.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isResumeModalOpen}
        onClose={() => {
          setIsResumeModalOpen(false);
          setSelectedFile(null);
          setResumeUploadError(null);
        }}
        title="Resume Review Setup"
        className="max-w-xl bg-slate-900 border border-white/10 text-white rounded-3xl overflow-hidden"
      >
        <div className="flex flex-col gap-6 py-2">
          <p className="text-slate-400 text-sm leading-relaxed">
            Choose which resume to analyze for this coaching session. Premium Resume Review requires <span className="text-lime-400 font-bold">2 credits</span> per message response.
          </p>

          {resumeUploadError && (
            <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-3 text-red-200 text-xs font-medium">
              ⚠️ {resumeUploadError}
            </div>
          )}

          {/* Option 1: Use Profile Resume */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-200">Option 1: Use Profile Resume</h4>
                <p className="text-slate-400 text-xs mt-1">Use the default resume already uploaded to your profile.</p>
              </div>
            </div>

            {fetchingDefaultResume ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 rounded-full border-2 border-lime-400 border-t-transparent animate-spin"></div>
              </div>
            ) : defaultResume ? (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-semibold text-slate-300">
                  <span className="text-lime-400 text-lg">📁</span>
                  <span className="truncate">{defaultResume.file_name}</span>
                </div>
                <Button
                  variant="brand"
                  className="w-full rounded-xl py-2 font-bold text-xs"
                  onClick={() => handleStartResumeReviewSession(false)}
                  disabled={creatingMode !== null}
                  isLoading={creatingMode === 'resume_review' && !selectedFile}
                >
                  Start Review with Profile Resume
                </Button>
              </div>
            ) : (
              <p className="text-amber-400/80 text-xs bg-amber-950/30 border border-amber-500/20 rounded-xl p-3">
                No default resume found. Please upload a new resume below to get started.
              </p>
            )}
          </div>

          <div className="flex items-center justify-center my-1">
            <span className="h-px bg-white/10 flex-grow"></span>
            <span className="px-3 text-slate-500 text-xs font-bold uppercase tracking-wider select-none">OR</span>
            <span className="h-px bg-white/10 flex-grow"></span>
          </div>

          {/* Option 2: Upload New Resume */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <h4 className="font-bold text-sm text-slate-200">Option 2: Upload New Resume</h4>
              <p className="text-slate-400 text-xs mt-1">Select a new PDF resume file for this specific coaching session.</p>
            </div>

            <div className="flex flex-col gap-3">
              {!selectedFile ? (
                <label className="border-2 border-dashed border-white/10 hover:border-lime-500/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all text-center">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== 'application/pdf') {
                          setResumeUploadError('Only PDF files are allowed.');
                          return;
                        }
                        setSelectedFile(file);
                        setResumeUploadError(null);
                      }
                    }}
                  />
                  <span className="text-2xl">📤</span>
                  <span className="text-xs font-bold text-slate-300">Click to upload a PDF</span>
                  <span className="text-[10px] text-slate-500">Max size: 10MB</span>
                </label>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold text-slate-300">
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-lime-400 text-lg">📄</span>
                      <span className="truncate">{selectedFile.name}</span>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-slate-500 hover:text-red-400 text-xs font-bold px-2 py-1"
                    >
                      Clear
                    </button>
                  </div>
                  <Button
                    variant="brand"
                    className="w-full rounded-xl py-2 font-bold text-xs"
                    onClick={() => handleStartResumeReviewSession(true)}
                    disabled={creatingMode !== null}
                    isLoading={creatingMode === 'resume_review' && !!selectedFile}
                  >
                    Start Review with Uploaded Resume
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
