'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { API_BASE } from '@/constants';
import { Button } from '@/components/ui';
import { FaArrowLeft, FaFilePdf, FaCircleQuestion, FaTriangleExclamation } from 'react-icons/fa6';

interface AiInterviewSession {
  id: string;
  role_title: string;
  job_description: string | null;
  status: 'created' | 'questions_generated' | 'in_progress' | 'completed' | 'evaluated' | 'report_generated';
  overall_score: number | null;
  completed_at: string | null;
}

interface InterviewReport {
  id: string;
  session_id: string;
  student_id: string;
  job_id: string | null;
  overall_score: number;
  rubric_scores: {
    communicationClarity?: number;
    contentRelevance?: number;
    responseStructure?: number;
    depthOfKnowledge?: number;
    confidenceIndicators?: number;
    [key: string]: number | undefined;
  };
  summary_text: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  question_analysis: Array<{
    question_id: string;
    question_text: string;
    category: 'technical' | 'behavioral' | 'situational';
    response_text: string;
    ai_score: number | null;
    rubric_scores: Record<string, number> | null;
    ai_feedback: {
      feedbackText?: string;
      suggestedImprovements?: string;
      [key: string]: string | undefined;
    } | null;
  }>;
  report_url: string | null;
  generated_at: string;
}

export default function MockInterviewReportView() {
  const router = useRouter();
  const { id: sessionId } = useParams();

  const [session, setSession] = useState<AiInterviewSession | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch session meta
      const sessionRes = await api.get<{
        session: AiInterviewSession;
      }>(`/interviews/sessions/${sessionId}`);

      setSession(sessionRes.data?.session || null);

      // Fetch evaluation report details
      const reportRes = await api.get<InterviewReport>(`/interviews/sessions/${sessionId}/report`);
      setReport(reportRes.data || null);
    } catch (err: unknown) {
      console.error('Failed to fetch mock interview report details:', err);
      // Handle the case where the report might not be ready yet
      if (err instanceof ApiError && err.status === 404) {
        setError('Evaluation report is still generating or not found. Please refresh in a moment.');
      } else {
        const apiErr = err as ApiError;
        setError(apiErr.message || 'Failed to load report data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Construct absolute download URL for PDF
  const getPdfDownloadUrl = (reportUrl: string | null) => {
    if (!reportUrl) return '#';
    if (reportUrl.startsWith('http')) return reportUrl;
    // Replace "/api/v1" from API_BASE to get the host root, then append relative report path
    const baseUrl = API_BASE.replace('/api/v1', '');
    return `${baseUrl}${reportUrl}`;
  };

  const getMetricLabel = (key: string): string => {
    switch (key) {
      case 'communicationClarity':
        return 'Communication Clarity';
      case 'contentRelevance':
        return 'Content Relevance';
      case 'responseStructure':
        return 'Response Structure';
      case 'depthOfKnowledge':
        return 'Depth of Knowledge';
      case 'confidenceIndicators':
        return 'Confidence Indicators';
      default:
        return key.replace(/([A-Z])/g, ' $1');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-lime-400 border-t-transparent animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Loading interview performance report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-[720px] w-full ml-4 sm:ml-6 lg:ml-8 pr-4 text-[#1a1a1a] py-8">
        <button
          onClick={() => router.push('/interviews')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-6 transition-colors group"
        >
          <FaArrowLeft className="text-xs transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </button>
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <FaTriangleExclamation className="text-amber-500 text-4xl" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Report Not Found</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            {error || 'The interview session report could not be found.'}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={fetchReportData}>
              Retry Load
            </Button>
            <Button onClick={() => router.push('/interviews')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rubricScores = report.rubric_scores || {};
  const formattedDate = new Date(report.generated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-[1360px] w-full ml-4 sm:ml-6 lg:ml-8 pr-4 text-[#1a1a1a]">
      {/* Back to Dashboard */}
      <button
        onClick={() => router.push('/interviews')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-6 transition-colors group"
      >
        <FaArrowLeft className="text-xs transition-transform group-hover:-translate-x-0.5" />
        Back to Dashboard
      </button>

      {/* Header Banner */}
      <div className="mb-8 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-white/5 shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-lime-400 text-xs font-extrabold uppercase tracking-wider mb-2">
            <span>Evaluation Completed</span>
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400"></span>
            <span>{formattedDate}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            {session?.role_title || 'Mock Interview'} Report
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-[600px] leading-relaxed">
            Cohesive review generated from your completed async mock interview session.
          </p>
        </div>

        {report.report_url && (
          <a
            href={getPdfDownloadUrl(report.report_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 text-xs font-extrabold shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <FaFilePdf className="text-rose-500 text-sm" />
            Download PDF Report
          </a>
        )}
      </div>

      {/* Top Grid: Overall Score and Executive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Overall Score Circle Card */}
        <div className="lg:col-span-1 bg-[#141414] text-white rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl flex flex-col items-center text-center justify-between min-h-[380px]">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Overall Rating</h3>
            <p className="text-slate-500 text-[11px] px-4">Average grade across all completed question evaluations.</p>
          </div>

          <div className="my-6 relative flex items-center justify-center w-36 h-36 rounded-full bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="absolute inset-2 rounded-full border border-lime-400/20 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-lime-400">
                {report.overall_score}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-1">out of 100</span>
            </div>
          </div>

          {/* Rubrics progress indicators */}
          <div className="w-full space-y-3.5 mt-2">
            {[
              'communicationClarity',
              'contentRelevance',
              'responseStructure',
              'depthOfKnowledge',
              'confidenceIndicators',
            ].map((metric) => {
              const score = rubricScores[metric] ?? 0;
              return (
                <div key={metric} className="space-y-1 text-left">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>{getMetricLabel(metric)}</span>
                    <span className="text-white font-extrabold">{score}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-lime-400 rounded-full transition-all duration-500"
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Qualitative Summary Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3.5 mb-4">
            Executive Summary
          </h3>
          
          <div className="flex-1 space-y-6">
            <p className="text-slate-600 text-sm leading-relaxed">
              {report.summary_text}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              {/* Strengths */}
              <div>
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-emerald-600 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Key Strengths
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                  {report.strengths?.map((str, i) => (
                    <li key={i} className="pl-1 text-slate-700">{str}</li>
                  )) || <li className="text-slate-400 italic">No strengths logged.</li>}
                </ul>
              </div>

              {/* Weaknesses */}
              <div>
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-amber-600 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Areas to Improve
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                  {report.weaknesses?.map((weak, i) => (
                    <li key={i} className="pl-1 text-slate-700">{weak}</li>
                  )) || <li className="text-slate-400 italic">No weaknesses logged.</li>}
                </ul>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-blue-600 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Action Plans
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                  {report.recommendations?.map((rec, i) => (
                    <li key={i} className="pl-1 text-slate-700">{rec}</li>
                  )) || <li className="text-slate-400 italic">No recommendations logged.</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Q&A Breakdown */}
      <div className="space-y-6 mb-16">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
          Detailed Question Breakdown
        </h2>

        {report.question_analysis?.map((item, idx) => {
          const rubricObj = item.rubric_scores || {};
          const feedback = item.ai_feedback || {};

          return (
            <div key={item.question_id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Question Card Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-slate-400">
                    QUESTION {idx + 1}
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wider border ${
                    item.category === 'technical'
                      ? 'bg-blue-50 text-blue-600 border-blue-100'
                      : item.category === 'behavioral'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Score:</span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    item.ai_score !== null && item.ai_score >= 70
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {item.ai_score !== null ? `${item.ai_score}/100` : 'Not evaluated'}
                  </span>
                </div>
              </div>

              {/* Question Body */}
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FaCircleQuestion className="text-slate-300" /> Question Prompt
                  </h4>
                  <p className="text-slate-800 font-semibold text-sm leading-relaxed bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                    {item.question_text}
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Your Response
                  </h4>
                  <div className="bg-slate-50/50 border-l-4 border-slate-300 px-4 py-3.5 text-xs text-slate-700 leading-relaxed font-medium rounded-r-2xl">
                    {item.response_text ? (
                      item.response_text.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0">{line}</p>
                      ))
                    ) : (
                      <p className="italic text-slate-400">No response was recorded for this question.</p>
                    )}
                  </div>
                </div>

                {item.ai_score !== null && (
                  <div className="pt-4 border-t border-slate-100 space-y-5">
                    {/* Rubrics breakdown for this specific question */}
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Rubric Grades
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {Object.entries(rubricObj).map(([key, score]) => (
                          <div key={key} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider truncate">
                              {getMetricLabel(key)}
                            </span>
                            <span className="text-xs font-bold text-slate-800 mt-1 block">
                              {score}/100
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI evaluation summary */}
                    <div className="bg-blue-500/5 rounded-2xl p-5 border border-blue-500/10 space-y-3.5 text-xs leading-relaxed text-slate-700">
                      {feedback.feedbackText && (
                        <div>
                          <strong className="text-blue-900 block mb-1">Qualitative Feedback:</strong>
                          <p>{feedback.feedbackText}</p>
                        </div>
                      )}
                      {feedback.suggestedImprovements && (
                        <div>
                          <strong className="text-blue-900 block mb-1">Suggested Improvements:</strong>
                          <p>{feedback.suggestedImprovements}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
