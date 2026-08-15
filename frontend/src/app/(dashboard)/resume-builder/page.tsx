'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Spinner, Button, Card, CardBody } from '@/components/ui';
import toast from 'react-hot-toast';
import { FaPlus, FaTrash, FaPenToSquare } from 'react-icons/fa6';
import { useForm, useFieldArray } from 'react-hook-form';

type ExperienceItem = {
  company: string;
  role: string;
  dates: string;
  description: string;
};

type EducationItem = {
  institution: string;
  degree: string;
  dates: string;
  description: string;
};

type ResumeData = {
  skills: { name: string }[];
  experience: ExperienceItem[];
  education: EducationItem[];
  name: string;
  bio: string;
};

export default function ResumeBuilderPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [downloadingLatex, setDownloadingLatex] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<any>(null);

  const { register, control, handleSubmit, reset, formState: { isSubmitting } } = useForm<ResumeData>({
    defaultValues: {
      skills: [],
      experience: [],
      education: [],
      name: '',
      bio: ''
    }
  });

  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
    control,
    name: 'skills',
  });

  const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({
    control,
    name: 'experience',
  });

  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({
    control,
    name: 'education',
  });

  const [newSkill, setNewSkill] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const r = await api.get<{ profile: any }>('/users/me');
      const p = r.data?.profile || {};
      
      reset({
        name: p.name || '',
        bio: p.bio || '',
        skills: (p.skills || []).map((s: string) => ({ name: s })),
        experience: p.experience || [],
        education: p.education || []
      });
    } catch (err) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onSubmit = async (data: ResumeData) => {
    try {
      const payload = {
        name: data.name,
        bio: data.bio,
        skills: data.skills.map(s => s.name),
        experience: data.experience,
        education: data.education
      };
      await api.put('/users/me', payload);
      toast.success('Resume data saved successfully!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save');
    }
  };

  const downloadLatex = async () => {
    if (downloadingLatex) return;
    setDownloadingLatex(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://content-connection-production-f00a.up.railway.app/api/v1';
      const response = await fetch(`${apiBase}/users/me/resume-latex?download=true`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download LaTeX resume.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'resume.tex';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('LaTeX resume downloaded successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download LaTeX resume.');
    } finally {
      setDownloadingLatex(false);
    }
  };

  const fetchDraft = async () => {
    if (draftLoading) return;
    setDraftLoading(true);
    try {
      const res = await api.post<{ draft: any }>('/users/me/resume-draft', {});
      setDraftResult(res.data?.draft ?? null);
      toast.success('AI resume draft generated successfully.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to generate resume draft.');
    } finally {
      setDraftLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[32px] font-brand font-normal text-slate-900 tracking-tight">Resume Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Build and edit your profile to generate an AI-optimized resume or LaTeX file.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" isLoading={draftLoading} onClick={() => void fetchDraft()}>
            Generate AI Draft
          </Button>
          <Button variant="outline" isLoading={downloadingLatex} onClick={() => void downloadLatex()}>
            Download LaTeX
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Basic Info */}
            <Card>
              <CardBody className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Basic Info</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input {...register('name')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Professional Summary / Bio</label>
                    <textarea {...register('bio')} rows={4} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 resize-y" />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Skills */}
            <Card>
              <CardBody className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {skillFields.map((field, index) => (
                    <span key={field.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
                      {field.name}
                      <button type="button" onClick={() => removeSkill(index)} className="text-slate-500 hover:text-red-500">
                        <FaTrash className="text-xs" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSkill.trim()) {
                          appendSkill({ name: newSkill.trim() });
                          setNewSkill('');
                        }
                      }
                    }}
                    placeholder="Add a skill (press Enter)"
                    className="w-full sm:w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newSkill.trim()) {
                        appendSkill({ name: newSkill.trim() });
                        setNewSkill('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Experience */}
            <Card>
              <CardBody className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Experience</h2>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendExp({ company: '', role: '', dates: '', description: '' })}>
                    <FaPlus className="mr-2" /> Add Experience
                  </Button>
                </div>
                
                {expFields.map((field, index) => (
                  <div key={field.id} className="relative rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-4">
                    <button type="button" onClick={() => removeExp(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                      <FaTrash />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                        <input {...register(`experience.${index}.company`)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                        <input {...register(`experience.${index}.role`)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Dates</label>
                        <input {...register(`experience.${index}.dates`)} placeholder="e.g. Jan 2020 - Present" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea {...register(`experience.${index}.description`)} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white resize-y" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* Education */}
            <Card>
              <CardBody className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Education</h2>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendEdu({ institution: '', degree: '', dates: '', description: '' })}>
                    <FaPlus className="mr-2" /> Add Education
                  </Button>
                </div>
                
                {eduFields.map((field, index) => (
                  <div key={field.id} className="relative rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-4">
                    <button type="button" onClick={() => removeEdu(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                      <FaTrash />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Institution</label>
                        <input {...register(`education.${index}.institution`)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Degree</label>
                        <input {...register(`education.${index}.degree`)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Dates</label>
                        <input {...register(`education.${index}.dates`)} placeholder="e.g. 2016 - 2020" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                        <textarea {...register(`education.${index}.description`)} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white resize-y" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto px-8">
                Save Resume Data
              </Button>
            </div>
          </form>
        </div>

        {/* AI Draft Preview Panel */}
        <div className="xl:col-span-1">
          <Card className="sticky top-6">
            <CardBody className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">AI Draft Preview</h2>
              {draftResult ? (
                <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Summary</p>
                    <p className="mt-1 text-slate-600 text-sm">{draftResult.summary}</p>
                  </div>
                  {draftResult.skills?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Skills</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {draftResult.skills.map((skill: string) => (
                          <span key={skill} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {draftResult.experience?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Experience</p>
                      <div className="mt-1 space-y-2 text-sm text-slate-600">
                        {draftResult.experience.map((item: any, idx: number) => (
                          <div key={idx}>
                            <p className="font-medium text-slate-900">
                              {item.role || 'Role'}{item.company ? ` @ ${item.company}` : ''}
                            </p>
                            {item.dates && <p className="text-xs text-slate-500">{item.dates}</p>}
                            {item.description && <p className="mt-0.5">{item.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {draftResult.education?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Education</p>
                      <div className="mt-1 space-y-2 text-sm text-slate-600">
                        {draftResult.education.map((item: any, idx: number) => (
                          <div key={idx}>
                            <p className="font-medium text-slate-900">
                              {item.degree || 'Degree'}{item.institution ? ` - ${item.institution}` : ''}
                            </p>
                            {item.dates && <p className="text-xs text-slate-500">{item.dates}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-500 mb-3">Save your data and click Generate AI Draft to see a preview of your optimized resume.</p>
                  <Button variant="outline" size="sm" isLoading={draftLoading} onClick={() => void fetchDraft()}>
                    Generate Now
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
