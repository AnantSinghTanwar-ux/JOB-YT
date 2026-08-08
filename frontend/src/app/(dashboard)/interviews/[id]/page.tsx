'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui';
import { FaChevronLeft, FaChevronRight, FaLock, FaCheck, FaPenClip } from 'react-icons/fa6';

interface AiInterviewSession {
  id: string;
  role_title: string;
  job_description: string | null;
  status: 'created' | 'questions_generated' | 'in_progress' | 'completed' | 'evaluated' | 'report_generated';
  overall_score: number | null;
}

interface InterviewQuestion {
  id: string;
  question_text: string;
  category: 'technical' | 'behavioral' | 'situational';
  order_index: number;
}

interface InterviewResponse {
  id: string;
  question_id: string;
  response_text: string;
  ai_score: number | null;
  rubric_scores: Record<string, number> | null;
  ai_feedback: {
    feedbackText?: string;
    suggestedImprovements?: string;
  } | null;
}

export default function ActiveInterviewConsole() {
  const router = useRouter();
  const { id: sessionId } = useParams();

  const [session, setSession] = useState<AiInterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Active question state
  const [activeIndex, setActiveIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionData = useCallback(async () => {
    try {
      const res = await api.get<{
        session: AiInterviewSession;
        questions: InterviewQuestion[];
        responses: InterviewResponse[];
      }>(`/interviews/sessions/${sessionId}`);

      setSession(res.data?.session || null);
      setQuestions(res.data?.questions || []);
      setResponses(res.data?.responses || []);

      // Redirect if session is already completed or evaluated
      if (res.data?.session && ['completed', 'evaluated', 'report_generated'].includes(res.data.session.status)) {
        router.push(`/interviews/${sessionId}/report`);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      console.error('Failed to fetch mock interview session data:', apiErr);
      setError(apiErr.message || 'Failed to load session details.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Sync active question details
  const activeQuestion = useMemo(() => {
    return questions[activeIndex] || null;
  }, [questions, activeIndex]);

  const activeResponse = useMemo(() => {
    if (!activeQuestion) return null;
    return responses.find((r) => r.question_id === activeQuestion.id) || null;
  }, [activeQuestion, responses]);

  // Sync typed answer draft
  useEffect(() => {
    if (activeResponse) {
      setAnswerText(activeResponse.response_text);
    } else {
      setAnswerText('');
    }
  }, [activeResponse, activeIndex]);

  // Determine current progression index (first unsubmitted question index)
  const currentProgressIndex = useMemo(() => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const answered = responses.some((r) => r.question_id === q.id);
      if (!answered) return i;
    }
    return questions.length; // All answered
  }, [questions, responses]);

  // Check if all questions are answered
  const allAnswered = useMemo(() => {
    return questions.length > 0 && responses.length === questions.length;
  }, [questions, responses]);

  // Submit Answer Action
  const handleSubmitAnswer = async () => {
    if (!activeQuestion || !answerText.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<InterviewResponse>(`/interviews/sessions/${sessionId}/submit`, {
        questionId: activeQuestion.id,
        responseText: answerText.trim(),
      });

      const responseData = res.data;
      if (responseData) {
        setResponses((prev) => {
          const filtered = prev.filter((r) => r.question_id !== activeQuestion.id);
          return [...filtered, responseData];
        });
      }

      // Automatically move to the next question if possible
      if (activeIndex < questions.length - 1) {
        setActiveIndex((prev) => prev + 1);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      console.error('Failed to submit response:', apiErr);
      setError(apiErr.message || 'Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Complete Interview Action
  const handleCompleteInterview = async () => {
    if (!allAnswered || completing) return;

    setCompleting(true);
    setError(null);
    try {
      await api.post(`/interviews/sessions/${sessionId}/complete`, {});
      router.push(`/interviews/${sessionId}/report`);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      console.error('Failed to complete mock interview:', apiErr);
      setError(apiErr.message || 'Failed to complete interview session.');
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-lime-400 border-t-transparent animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Initializing interview console...</p>
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Mock interview session not found or has no questions.</p>
        <Button onClick={() => router.push('/interviews')} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] w-full ml-4 sm:ml-6 lg:ml-8 pr-4 text-[#1a1a1a]">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Mock Interview</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
            {session.role_title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Progress: {responses.length} / {questions.length} Answered
          </span>
          {allAnswered && (
            <Button
              variant="brand"
              onClick={handleCompleteInterview}
              isLoading={completing}
              disabled={completing}
              className="rounded-full text-xs font-bold px-5 py-2"
            >
              Finish Interview
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Main Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start mb-12">
        {/* Left Sidebar: Questions Navigation */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-4 space-y-2">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">
            Questions List
          </span>
          {questions.map((q, idx) => {
            const isAnswered = responses.some((r) => r.question_id === q.id);
            const isLocked = idx > currentProgressIndex;
            const isActive = activeIndex === idx;

            return (
              <button
                key={q.id}
                disabled={isLocked}
                onClick={() => setActiveIndex(idx)}
                className={`w-full text-left rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs font-bold border transition-all ${
                  isActive
                    ? 'bg-[#141414] text-[#C3FF3D] border-[#141414]'
                    : isLocked
                    ? 'bg-slate-50 text-slate-300 border-transparent cursor-not-allowed'
                    : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                }`}
              >
                <span className="truncate">
                  {idx + 1}. {q.question_text}
                </span>
                <span className="shrink-0">
                  {isAnswered ? (
                    <FaCheck className={isActive ? 'text-lime-400' : 'text-emerald-500'} />
                  ) : isActive ? (
                    <FaPenClip className="text-lime-400" />
                  ) : isLocked ? (
                    <FaLock />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center/Right Panel: Active Question Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeQuestion && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                  Question {activeIndex + 1}
                </span>
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  activeQuestion.category === 'technical'
                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                    : activeQuestion.category === 'behavioral'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  {activeQuestion.category}
                </span>
              </div>

              {/* Question Text */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-slate-800 font-semibold text-sm leading-relaxed">
                  {activeQuestion.question_text}
                </p>
              </div>

              {/* Response Panel */}
              <div className="space-y-4">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Your Response
                </label>
                <textarea
                  rows={8}
                  disabled={!!activeResponse || submitting}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your structured professional response here... (STAR method is recommended for situational/behavioral questions)"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors disabled:bg-slate-50/50 disabled:text-slate-500 resize-none"
                />

                {!activeResponse ? (
                  <div className="flex items-center justify-end">
                    <Button
                      variant="brand"
                      onClick={handleSubmitAnswer}
                      isLoading={submitting}
                      disabled={submitting || !answerText.trim()}
                      className="rounded-xl font-bold px-6 py-2.5 text-xs flex items-center gap-2"
                    >
                      {submitting ? 'Evaluating answer...' : 'Submit & Evaluate Answer'}
                    </Button>
                  </div>
                ) : (
                  /* Answer already submitted: show feedback */
                  <div className="mt-8 pt-6 border-t border-slate-100 space-y-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                        AI Instant Evaluation
                      </h4>
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Score: {activeResponse.ai_score}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                      {activeResponse.rubric_scores &&
                        Object.entries(activeResponse.rubric_scores).map(([metric, score]) => (
                          <div key={metric} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider truncate">
                              {metric.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <span className="text-sm font-bold text-slate-800 mt-1 block">
                              {score}/100
                            </span>
                          </div>
                        ))}
                    </div>

                    <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3 text-xs leading-relaxed text-slate-700">
                      {activeResponse.ai_feedback?.feedbackText && (
                        <p>
                          <strong>Qualitative Feedback:</strong> {activeResponse.ai_feedback.feedbackText}
                        </p>
                      )}
                      {activeResponse.ai_feedback?.suggestedImprovements && (
                        <p>
                          <strong>Suggested Improvements:</strong> {activeResponse.ai_feedback.suggestedImprovements}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation controls */}
          <div className="flex items-center justify-between">
            <button
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((prev) => prev - 1)}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-800 disabled:text-slate-300 transition-colors"
            >
              <FaChevronLeft className="text-[10px]" />
              Previous Question
            </button>

            <button
              disabled={activeIndex >= currentProgressIndex || activeIndex === questions.length - 1}
              onClick={() => setActiveIndex((prev) => prev + 1)}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-800 disabled:text-slate-300 transition-colors"
            >
              Next Question
              <FaChevronRight className="text-[10px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
