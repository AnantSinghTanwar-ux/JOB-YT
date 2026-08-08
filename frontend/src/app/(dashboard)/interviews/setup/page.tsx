'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui';
import { FaArrowLeft, FaWandMagicSparkles } from 'react-icons/fa6';

export default function ConfigureMockInterview() {
  const router = useRouter();
  const [roleTitle, setRoleTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim()) {
      setError('Target role/job title is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ id: string }>('/interviews/sessions', {
        roleTitle: roleTitle.trim(),
        jobDescription: jobDescription.trim() || undefined,
        questionCount,
      });

      if (res.data?.id) {
        router.push(`/interviews/${res.data.id}`);
      } else {
        throw new Error('No session ID returned from the server');
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      console.error('Failed to start mock interview session:', apiErr);
      setError(apiErr.message || 'Failed to start interview. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[720px] w-full ml-4 sm:ml-6 lg:ml-8 pr-4 text-[#1a1a1a]">
      {/* Header Back Button */}
      <button
        onClick={() => router.push('/interviews')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-6 transition-colors group"
      >
        <FaArrowLeft className="text-xs transition-transform group-hover:-translate-x-0.5" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 mb-2">
          Configure Your Mock Interview
        </h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          AI will generate highly contextual questions based on the role and description you provide.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Role Title */}
          <div>
            <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-500 mb-2.5">
              Target Role / Job Title *
            </label>
            <input
              type="text"
              required
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Frontend Engineer, Product Manager, Data Analyst"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors"
            />
          </div>

          {/* Job Description Context */}
          <div>
            <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-500 mb-2.5">
              Job Description / Skill Requirements (Optional)
            </label>
            <textarea
              rows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste specific job requirements, technologies, or skills you want the interview questions to focus on..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors resize-none"
            />
          </div>

          {/* Question Count Select */}
          <div>
            <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-500 mb-2.5">
              Number of Questions
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[3, 5, 8, 10].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setQuestionCount(num)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    questionCount === num
                      ? 'bg-[#141414] text-[#C3FF3D] border-[#141414]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Default is 5 questions. Choose less for a shorter practice session.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 mt-8">
            <Button
              type="submit"
              variant="brand"
              isLoading={loading}
              disabled={loading}
              className="w-full rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2"
            >
              <FaWandMagicSparkles />
              {loading ? 'Generating Mock Interview...' : 'Generate Mock Interview'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
