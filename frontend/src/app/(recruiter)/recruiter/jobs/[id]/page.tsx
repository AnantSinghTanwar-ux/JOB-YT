'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { ApplicationQuestion, Job, JobType } from '@/types';
import { Button, Input, Card, CardBody, Spinner, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { ROUTES, JOB_TYPES } from '@/constants';
import { CodingApi } from '@/lib/api/coding.api';
import { CodingAssessment } from '@/types/coding';
import { InsufficientCreditsCard } from '@/components/credits/InsufficientCreditsCard';
import { FaChevronLeft, FaTrash, FaPlus } from 'react-icons/fa6';

export default function RecruiterJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [creditError, setCreditError] = useState<{ required: number; available: number } | null>(null);
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const updateQuestion = (index: number, updates: Partial<ApplicationQuestion>) => {
    setQuestions((prev) => prev.map((question, idx) => (idx === index ? { ...question, ...updates } : question)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: '',
        type: 'text',
        required: false,
        section: '',
        placeholder: '',
        options: [],
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((question) => question.id !== id));
  };

  const [form, setForm] = useState({
    title: '',
    location: '',
    type: 'full-time' as JobType,
    salary_min: '',
    salary_max: '',
    description: '',
    skills: '',
    disallow_auto_apply: false,
    enable_ai_interview: false,
    ai_interview_type: 'technical',
    ai_interview_rubric: '',
    ai_interview_threshold: '70',
  });
  const [assessments, setAssessments] = useState<CodingAssessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [attachingAssessment, setAttachingAssessment] = useState(false);

  useEffect(() => {
    api.get<Job>(`/jobs/${jobId}`)
      .then((res) => {
        const payload = res.data;
        if (!payload) return;
        setJob(payload);
        setForm({
          title: payload.title,
          location: payload.location ?? '',
          type: payload.type,
          salary_min: payload.salary_min?.toString() ?? '',
          salary_max: payload.salary_max?.toString() ?? '',
          description: payload.description,
          skills: payload.skills.join(', '),
          disallow_auto_apply: Boolean(payload.disallow_auto_apply),
          enable_ai_interview: payload.ai_interview_type !== null,
          ai_interview_type: payload.ai_interview_type ?? 'technical',
          ai_interview_rubric: payload.ai_interview_rubric ?? '',
          ai_interview_threshold: payload.ai_interview_threshold?.toString() ?? '70',
        });
        setQuestions(Array.isArray(payload.application_questions) ? payload.application_questions : []);
      })
      .finally(() => setLoading(false));

    CodingApi.listAssessments()
      .then((res) => setAssessments(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAssessments([]));
  }, [jobId]);

  const handleAttachAssessment = async () => {
    if (!selectedAssessmentId) {
      toast.error('Select an assessment to attach');
      return;
    }
    setAttachingAssessment(true);
    try {
      await CodingApi.attachJob(selectedAssessmentId, jobId);
      const refreshed = await api.get<Job>(`/jobs/${jobId}`);
      if (refreshed.data) setJob(refreshed.data);
      toast.success('Coding assessment attached to job');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to attach assessment');
    } finally {
      setAttachingAssessment(false);
    }
  };

  const set = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        location: form.location || undefined,
        type: form.type,
        salary_min: form.salary_min ? Number(form.salary_min) : undefined,
        salary_max: form.salary_max ? Number(form.salary_max) : undefined,
        description: form.description,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        disallow_auto_apply: form.disallow_auto_apply,
        application_questions: questions
          .map((question) => ({
            ...question,
            label: question.label.trim(),
            section: question.section?.trim() || undefined,
            placeholder: question.placeholder?.trim() || undefined,
            options: (question.options || [])
              .map((option) => option.trim())
              .filter(Boolean),
          }))
          .filter((question) => question.label.length > 0),
        ai_interview_type: form.enable_ai_interview ? form.ai_interview_type : null,
        ai_interview_rubric: form.enable_ai_interview ? form.ai_interview_rubric : null,
        ai_interview_threshold: form.enable_ai_interview ? Number(form.ai_interview_threshold) : null,
      };
      const res = await api.put<Job>(`/jobs/${jobId}`, payload);
      if (res.data) {
        setJob(res.data);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setCreditError(null);
    try {
      await api.patch(`/jobs/${jobId}/publish`, {});
      setJob((prev) => prev ? { ...prev, status: 'active' } : prev);
    } catch (err) {
      if (err instanceof ApiError) {
        const creditData = err.data as
          | { code?: string; required?: number; available?: number; requiredCredits?: number; availableCredits?: number }
          | undefined;

        const isInsufficient =
          err.status === 402 ||
          creditData?.code === 'INSUFFICIENT_CREDITS' ||
          err.code === 'INSUFFICIENT_CREDITS';

        if (isInsufficient) {
          setCreditError({
            required: creditData?.required ?? creditData?.requiredCredits ?? 10,
            available: creditData?.available ?? creditData?.availableCredits ?? 0,
          });
        } else {
          setError(err.message || 'Publish failed');
        }
      } else {
        setError('Publish failed');
      }
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!job) return <p className="text-center text-gray-500">Job not found.</p>;

  const primaryStatusLabel = job.job_approval_status === 'pending_approval'
    ? 'under review'
    : job.job_approval_status === 'rejected'
      ? 'rejected'
      : job.status;

  const canPublish = job.status === 'draft' && (!job.job_approval_status || job.job_approval_status === 'approved');

  return (
    <div className="relative min-h-screen w-full overflow-hidden pb-32">
      {/* Background Blur Effect */}
      <div className="absolute w-[1521px] h-[604px] -left-[111px] -top-[128px] border-[25px] border-[#C3FF3D] blur-[100px] -rotate-[16deg] pointer-events-none opacity-40 z-0" />

      <div className="relative z-10 max-w-[859px] mx-auto pt-8 px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-black hover:opacity-70 transition-opacity font-bold"
          >
            <FaChevronLeft className="text-xs" /> Back to Listings
          </button>

          <div className="flex items-center gap-3">
            <Link href={`${ROUTES.recruiterApplications}?jobId=${encodeURIComponent(jobId)}`}>
              <button className="px-5 py-2.5 bg-white border border-black/10 text-black text-xs font-black rounded-xl hover:bg-black hover:text-white transition-all shadow-sm active:scale-95">
                View Applications
              </button>
            </Link>
            {canPublish && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-5 py-2.5 bg-black text-lime-300 text-xs font-black rounded-xl hover:bg-slate-900 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {publishing ? 'Submitting...' : 'Submit For Review'}
              </button>
            )}
          </div>
        </div>

        <header className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-[40px] leading-tight text-black font-display">{job.title}</h1>
            <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm mt-2 ${job.status === 'active' ? 'bg-lime-300 text-black' :
                primaryStatusLabel === 'under review' ? 'bg-black text-lime-300' :
                  primaryStatusLabel === 'rejected' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
              }`}>
              {primaryStatusLabel}
            </div>
          </div>
          <p className="text-[18px] text-black/60 font-semibold tracking-tight">
            {job.views_count.toLocaleString()} views • Manage your listing and application flow
          </p>

          {job.job_approval_status === 'pending_approval' && (
            <div className="mt-6 rounded-2xl bg-black p-5 border border-lime-300/20 shadow-xl">
              <p className="text-[15px] font-bold text-lime-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-lime-300 animate-pulse" />
                Under Admin Review: This job will be visible to candidates once approved.
              </p>
            </div>
          )}

          {job.job_approval_status === 'rejected' && (
            <div className="mt-6 rounded-2xl bg-rose-50 p-5 border border-rose-100 shadow-sm">
              <p className="text-[15px] font-bold text-rose-600 flex items-center gap-2">
                <FaTrash className="text-xs" />
                This job was rejected by admin. Please update details and resubmit.
              </p>
            </div>
          )}
        </header>

        <div className="bg-[#ece9e2] rounded-[24px] p-6 sm:p-10 shadow-sm space-y-10">
          {error && <div className="rounded-xl bg-rose-100 border border-rose-200 p-4 text-sm font-bold text-rose-700 animate-in fade-in slide-in-from-top-2">{error}</div>}

          {creditError && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <InsufficientCreditsCard
                creditError={creditError}
                onViewCredits={() => router.push(ROUTES.recruiterCredits)}
                onRetry={() => { void handlePublish(); }}
                retryDisabled={publishing}
              />
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-2xl font-display text-black">Job Details</h2>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">Job Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    required
                    className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[16px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => set('location', e.target.value)}
                    className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[16px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">Job Type *</label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => set('type', e.target.value as JobType)}
                      className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[16px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all appearance-none"
                    >
                      {JOB_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black/20">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">Min Salary (USD)</label>
                  <input
                    type="number"
                    value={form.salary_min}
                    onChange={(e) => set('salary_min', e.target.value)}
                    className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[16px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">Max Salary (USD)</label>
                  <input
                    type="number"
                    value={form.salary_max}
                    onChange={(e) => set('salary_max', e.target.value)}
                    className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[16px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">Skills (Comma Separated)</label>
                <input
                  value={form.skills}
                  onChange={(e) => set('skills', e.target.value)}
                  placeholder="React, TypeScript, Node.js"
                  className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[16px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={8}
                  required
                  className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[16px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all resize-none"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-black/5 bg-white p-4">
                <input
                  type="checkbox"
                  checked={form.disallow_auto_apply}
                  onChange={(e) => setForm((prev) => ({ ...prev, disallow_auto_apply: e.target.checked }))}
                  className="mt-1"
                />
                <span>
                  <span className="text-sm font-black text-black block">Disable Auto-Apply for this listing</span>
                  <span className="text-xs text-black/50 font-semibold">
                    Candidates using Auto-Apply will not be matched to this job. Manual applications are still accepted.
                  </span>
                </span>
              </label>
            </div>

            <hr className="border-black/5" />

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display text-black">Coding Assessment</h2>
                <p className="text-sm font-bold text-black/40 mt-1 uppercase tracking-tight">
                  Attach a published assessment to gate or follow up applications
                </p>
              </div>

              {job.active_assessment_version_id ? (
                <div className="rounded-2xl border border-lime-300/50 bg-lime-50 p-5">
                  <p className="text-sm font-bold text-black">
                    Active: {job.assessment_title || 'Coding assessment'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-black/60 uppercase tracking-wide">
                    Timing: {job.assessment_timing === 'during_apply' ? 'During apply' : 'Post apply'}
                  </p>
                  <Link
                    href={ROUTES.recruiterAssessmentDetail(job.coding_assessment_id || '')}
                    className="mt-3 inline-block text-xs font-black text-black underline"
                  >
                    Manage assessment
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-black/5 bg-white p-5 space-y-4">
                  <select
                    value={selectedAssessmentId}
                    onChange={(e) => setSelectedAssessmentId(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-[14px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300"
                  >
                    <option value="">Select assessment...</option>
                    {assessments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.assessment_timing === 'during_apply' ? 'During apply' : 'Post apply'})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { void handleAttachAssessment(); }}
                    disabled={attachingAssessment || !selectedAssessmentId}
                    className="px-5 py-2.5 bg-black text-lime-300 text-xs font-black rounded-xl hover:bg-slate-900 transition-all disabled:opacity-50"
                  >
                    {attachingAssessment ? 'Attaching...' : 'Attach Assessment'}
                  </button>
                  {assessments.length === 0 && (
                    <p className="text-xs text-black/40">
                      No assessments yet.{' '}
                      <Link href={ROUTES.recruiterAssessmentNew} className="underline font-bold">
                        Create one
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>

            <hr className="border-black/5" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-display text-black">Application Questions</h2>
                  <p className="text-sm font-bold text-black/40 mt-1 uppercase tracking-tight">Structured workflow for candidates</p>
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-4 py-2 bg-black text-white text-[11px] font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                >
                  <FaPlus className="text-[10px]" /> Add Question
                </button>
              </div>

              {questions.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-black/5 p-8 text-center bg-white/40">
                  <p className="text-sm font-bold text-black/30 uppercase tracking-widest">No custom questions configured.</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="group rounded-2xl border border-black/5 bg-white p-5 space-y-5 hover:shadow-lg hover:shadow-black/5 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Label</label>
                            <input
                              value={question.label}
                              onChange={(e) => updateQuestion(index, { label: e.target.value })}
                              placeholder="e.g. Share your GitHub profile"
                              className="w-full bg-slate-50 border-none rounded-xl p-3 text-[14px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Type</label>
                            <select
                              value={question.type}
                              onChange={(e) => updateQuestion(index, { type: e.target.value as ApplicationQuestion['type'] })}
                              className="w-full bg-slate-50 border-none rounded-xl p-3 text-[14px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all appearance-none"
                            >
                              <option value="text">Short Text</option>
                              <option value="textarea">Long Text</option>
                              <option value="link">Portfolio/Link</option>
                              <option value="select">Select</option>
                              <option value="rating">Rating</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Section (optional)</label>
                            <input
                              value={question.section || ''}
                              onChange={(e) => updateQuestion(index, { section: e.target.value })}
                              placeholder="e.g. Portfolio"
                              className="w-full bg-slate-50 border-none rounded-xl p-3 text-[14px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Placeholder</label>
                            <input
                              value={question.placeholder || ''}
                              onChange={(e) => updateQuestion(index, { placeholder: e.target.value })}
                              placeholder="Helpful hint..."
                              className="w-full bg-slate-50 border-none rounded-xl p-3 text-[14px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all"
                            />
                          </div>
                        </div>

                        {(question.type === 'select' || question.type === 'rating') && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Options (comma separated)</label>
                            <input
                              value={(question.options || []).join(', ')}
                              onChange={(e) => updateQuestion(index, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })}
                              placeholder={question.type === 'rating' ? '1, 2, 3, 4, 5' : 'Option A, Option B'}
                              className="w-full bg-slate-50 border-none rounded-xl p-3 text-[14px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer group/check">
                            <div className="relative w-5 h-5 flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={question.required}
                                onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                                className="peer appearance-none w-5 h-5 border-2 border-black/10 rounded-md checked:bg-black checked:border-black transition-all"
                              />
                              <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                            </div>
                            <span className="text-xs font-bold text-black/60 uppercase tracking-tight">Required</span>
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        className="p-2 text-black/20 hover:text-rose-500 transition-colors"
                        title="Remove Question"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Interview Settings Section */}
            <div className="bg-white border border-black/5 rounded-[24px] p-6 sm:p-10 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-display text-black">AI Interview Room Settings</h2>
                  <p className="text-sm font-bold text-black/40 mt-1 uppercase tracking-tight">Enable and configure the live AI interviewer mode</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enable_ai_interview}
                    onChange={(e) => set('enable_ai_interview', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-300" />
                </label>
              </div>

              {form.enable_ai_interview && (
                <div className="space-y-6 pt-6 border-t border-black/5 animate-in fade-in slide-in-from-top-2">
                  {/* Interview Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">AI Interview Type *</label>
                    <div className="relative">
                      <select
                        value={form.ai_interview_type}
                        onChange={(e) => set('ai_interview_type', e.target.value)}
                        className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[16px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all appearance-none"
                      >
                        <option value="technical">Technical (Coding & Architecture)</option>
                        <option value="behavioral">Behavioral (Culture & Soft Skills)</option>
                        <option value="hybrid">Hybrid (Combined Technical & Behavioral)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black/20">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Rubric guidelines */}
                  <div className="space-y-2">
                    <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">Grading Rubric / Evaluation Criteria *</label>
                    <textarea
                      required
                      value={form.ai_interview_rubric}
                      onChange={(e) => set('ai_interview_rubric', e.target.value)}
                      placeholder="Specify grading instructions for the AI..."
                      rows={6}
                      className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[16px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all resize-none"
                    />
                  </div>

                  {/* Threshold Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-black text-black/60 uppercase tracking-widest ml-1">Passing Threshold Score (%)</label>
                      <span className="text-[14px] font-bold text-slate-800 bg-slate-100 rounded px-2.5 py-0.5">{form.ai_interview_threshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={form.ai_interview_threshold}
                      onChange={(e) => set('ai_interview_threshold', e.target.value)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <span className="text-xs text-black/40">
                      Candidates must achieve a match/interview score equal to or higher than this value to pass.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-10">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-black text-lime-300 py-4 rounded-2xl text-[18px] font-black hover:bg-slate-900 transition-all active:scale-[0.98] shadow-xl disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Job Details'}
              </button>
              <button
                type="button"
                onClick={() => router.push(ROUTES.recruiterJobs)}
                className="px-8 py-4 bg-white border border-black/5 text-slate-500 rounded-2xl text-[18px] font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
