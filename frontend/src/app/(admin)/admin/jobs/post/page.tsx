'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { ApplicationQuestion, Job, JobType } from '@/types';
import { Button, Input, Card, CardBody } from '@/components/ui';
import { ROUTES, JOB_TYPES } from '@/constants';
import toast from 'react-hot-toast';

export default function AdminPostJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    location: '',
    type: 'full-time' as JobType,
    salary_min: '',
    salary_max: '',
    description: '',
    skills: '',
    company_id: '', // For existing company
    companyName: '',
    company_location: '',
    company_website: '',
    company_logo: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const [useExistingCompany, setUseExistingCompany] = useState(false);

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

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submitJob = async () => {
    setError('');
    setLoading(true);
    try {
      // Validate required fields
      if (!form.title.trim()) {
        setError('Job title is required');
        setLoading(false);
        return;
      }

      if (!form.description.trim()) {
        setError('Job description is required');
        setLoading(false);
        return;
      }

      if (!useExistingCompany) {
        if (!form.companyName.trim()) {
          setError('Company name is required');
          setLoading(false);
          return;
        }
        if (!form.company_location.trim()) {
          setError('Company location is required');
          setLoading(false);
          return;
        }
      } else {
        if (!form.company_id.trim()) {
          setError('Please select a company');
          setLoading(false);
          return;
        }
      }

      const payload: any = {
        title: form.title.trim(),
        location: form.location.trim() || undefined,
        type: form.type,
        salary_min: form.salary_min ? Number(form.salary_min) : undefined,
        salary_max: form.salary_max ? Number(form.salary_max) : undefined,
        description: form.description.trim(),
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        status: 'active',
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
      };

      if (useExistingCompany) {
        payload.company_id = form.company_id;
      } else {
        payload.companyName = form.companyName.trim();
        payload.company_location = form.company_location.trim();
        if (form.company_website.trim()) {
          payload.company_website = form.company_website.trim();
        }
        if (form.company_logo.trim()) {
          payload.company_logo = form.company_logo.trim();
        }
      }

      const res = await api.post<Job>('/admin/jobs', payload);
      toast.success('Job posted successfully!');
      router.push(ROUTES.adminJobs);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to create job');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-6">
      <section>
        <h1 className="text-[44px] leading-[1.05] font-black tracking-tight text-black">Post a Job</h1>
        <p className="mt-2 text-xl leading-tight text-black/80">
          Create and post a new job listing directly to the platform.
        </p>
      </section>

      {error && (
        <Card className="bg-red-50 border border-red-200">
          <CardBody className="text-red-700">{error}</CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="space-y-6">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Job Title *</label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g., Senior Frontend Engineer"
              className="text-base"
            />
          </div>

          {/* Job Type and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Job Type *</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {JOB_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('-', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Location</label>
              <Input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="e.g., San Francisco, CA"
                className="text-base"
              />
            </div>
          </div>

          {/* Salary Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Min Salary (Optional)</label>
              <Input
                type="number"
                value={form.salary_min}
                onChange={(e) => set('salary_min', e.target.value)}
                placeholder="e.g., 80000"
                className="text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Max Salary (Optional)</label>
              <Input
                type="number"
                value={form.salary_max}
                onChange={(e) => set('salary_max', e.target.value)}
                placeholder="e.g., 150000"
                className="text-base"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Job Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Enter the full job description..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              rows={8}
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Skills (comma-separated)</label>
            <Input
              type="text"
              value={form.skills}
              onChange={(e) => set('skills', e.target.value)}
              placeholder="e.g., React, TypeScript, Node.js"
              className="text-base"
            />
          </div>

          {/* Company Section */}
          <div className="pt-6 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Company Information *</h2>

            <div className="mb-4">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={useExistingCompany}
                  onChange={() => setUseExistingCompany(true)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-900">Posted by existing company on Jobyt</span>
              </label>
              <label className="flex items-center gap-3 mt-3">
                <input
                  type="radio"
                  checked={!useExistingCompany}
                  onChange={() => setUseExistingCompany(false)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-900">External company</span>
              </label>
            </div>

            {useExistingCompany ? (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Select Company *</label>
                <Input
                  type="text"
                  value={form.company_id}
                  onChange={(e) => set('company_id', e.target.value)}
                  placeholder="Enter company ID or select from list"
                  className="text-base"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Note: Integration with company list coming soon. For now, enter the recruiter profile ID.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Company Name *</label>
                    <Input
                      type="text"
                      value={form.companyName}
                      onChange={(e) => set('companyName', e.target.value)}
                      placeholder="e.g., Acme Corp"
                      className="text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Location *</label>
                    <Input
                      type="text"
                      value={form.company_location}
                      onChange={(e) => set('company_location', e.target.value)}
                      placeholder="e.g., New York, NY"
                      className="text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Website (Optional)</label>
                    <Input
                      type="url"
                      value={form.company_website}
                      onChange={(e) => set('company_website', e.target.value)}
                      placeholder="e.g., https://example.com"
                      className="text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Logo URL (Optional)</label>
                    <Input
                      type="url"
                      value={form.company_logo}
                      onChange={(e) => set('company_logo', e.target.value)}
                      placeholder="e.g., https://example.com/logo.png"
                      className="text-base"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Questions Section */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Application Questions (Optional)</h2>
              <Button
                size="sm"
                variant={questions.length === 0 ? 'primary' : 'outline'}
                onClick={addQuestion}
              >
                Add Question
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((question, idx) => (
                <Card key={question.id} className="bg-slate-50 border border-slate-200">
                  <CardBody className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="text"
                        value={question.label}
                        onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                        placeholder="Question label"
                        className="text-sm col-span-2"
                      />
                      <select
                        value={question.type}
                        onChange={(e) =>
                          updateQuestion(idx, { type: e.target.value as any })
                        }
                        className="px-2 py-1 text-sm border border-slate-300 rounded-lg"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="select">Dropdown</option>
                        <option value="rating">Rating</option>
                        <option value="link">Link</option>
                      </select>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">Required</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => removeQuestion(question.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-slate-200 flex gap-3">
            <Button
              onClick={submitJob}
              isLoading={loading}
              className="flex-1"
              size="lg"
            >
              Post Job
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(ROUTES.adminJobs)}
              disabled={loading}
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
