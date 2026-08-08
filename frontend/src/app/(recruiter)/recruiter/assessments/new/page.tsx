'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Button, Input } from '@/components/ui';
import { ROUTES } from '@/constants';
import toast from 'react-hot-toast';
import { FaArrowLeft } from 'react-icons/fa6';

export default function NewAssessmentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    passing_score: 70 as number | '',
    time_limit_minutes: 60 as number | '',
    max_attempts: 1 as number | '',
    assessment_timing: 'post_apply' as 'during_apply' | 'post_apply',
    allow_resume: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        passing_score: form.passing_score === '' ? undefined : form.passing_score,
        time_limit_minutes: form.time_limit_minutes === '' ? undefined : form.time_limit_minutes,
        max_attempts: form.max_attempts === '' ? undefined : form.max_attempts,
      };
      const res = await CodingApi.createAssessment(payload);
      toast.success('Assessment created successfully');
      if (res.data?.id) router.push(ROUTES.recruiterAssessmentDetail(res.data.id));
    } catch {
      toast.error('Failed to create assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href={ROUTES.recruiterAssessments} className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <FaArrowLeft className="mr-2" /> Back to Assessments
        </Link>
        <h1 className="text-[32px] leading-tight font-bold text-slate-900 font-display tracking-tight">Create Assessment</h1>
        <p className="text-slate-500 mt-1">Configure the rules and settings for your new coding challenge.</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="bg-[#1a1a1a] px-8 py-5">
          <h2 className="text-lg font-semibold text-white">Assessment Details</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1">
            <Input 
              label="Assessment Title" 
              placeholder="e.g. Frontend Engineer Pre-screen"
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
              required 
              className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white transition-colors min-h-[120px] resize-y"
              placeholder="Provide context or instructions for candidates taking this assessment..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input 
              label="Passing Score (%)" 
              type="number" 
              min={0} max={100}
              value={form.passing_score} 
              onChange={(e) => setForm({ ...form, passing_score: e.target.value ? parseInt(e.target.value) : '' })} 
              className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
            <Input 
              label="Time Limit (minutes)" 
              type="number" 
              min={1}
              value={form.time_limit_minutes} 
              onChange={(e) => setForm({ ...form, time_limit_minutes: e.target.value ? parseInt(e.target.value) : '' })} 
              className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input 
              label="Max Attempts" 
              type="number" 
              min={1}
              value={form.max_attempts} 
              onChange={(e) => setForm({ ...form, max_attempts: e.target.value ? parseInt(e.target.value) : '' })} 
              className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Assessment Timing</label>
              <select
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white transition-colors"
                value={form.assessment_timing}
                onChange={(e) => setForm({ ...form, assessment_timing: e.target.value as 'during_apply' | 'post_apply' })}
              >
                <option value="post_apply">After Apply (Post-Screening)</option>
                <option value="during_apply">During Apply (Embedded)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-2">
            <Button 
              type="submit" 
              variant="brand" 
              isLoading={saving}
              className="w-full rounded-xl py-3.5 text-[15px] shadow-[0_8px_20px_rgba(195,255,61,0.2)]"
            >
              Create Assessment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
