'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ApiError, api } from '@/lib/api';
import { ROUTES } from '@/constants';
import { Badge, Button, Card, CardBody, Spinner } from '@/components/ui';

export interface ResumeListItem {
  id: string;
  file_name?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  created_at?: string | null;
  is_default?: boolean;
}

type AtsScoreReport = {
  score: number;
};

type ResumeDetailParsed = {
  name?: string | null;
  skills?: string[];
  experience?: Array<{ role?: string | null; title?: string | null; company?: string | null }>;
  education?: Array<{ degree?: string | null; institution?: string | null }>;
};

type ResumeDetailResponse = {
  resume?: {
    parsed?: ResumeDetailParsed | null;
  };
};

interface ResumeListCardProps {
  refreshKey?: number;
  className?: string;
}

const toResumeList = (payload: unknown): ResumeListItem[] => {
  if (!payload || typeof payload !== 'object') return [];

  const wrapped = payload as {
    resumes?: unknown;
    data?: { resumes?: unknown };
  };

  const raw = wrapped.data?.resumes ?? wrapped.resumes;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      file_name: typeof item.file_name === 'string' ? item.file_name : null,
      file_url: typeof item.file_url === 'string' ? item.file_url : null,
      mime_type: typeof item.mime_type === 'string' ? item.mime_type : null,
      created_at: typeof item.created_at === 'string' ? item.created_at : null,
      is_default: Boolean(item.is_default),
    }))
    .filter((item) => item.id.length > 0);
};

const ATS_GENERIC_JOB_DESCRIPTION =
  'Software role requiring strong technical fundamentals, practical project experience, and clear communication.';

const buildResumeTextFromParsed = (parsed?: ResumeDetailParsed | null): string => {
  if (!parsed) return '';

  const experienceText = Array.isArray(parsed.experience)
    ? parsed.experience
        .map((item) => {
          const role = item.role || item.title || '';
          const company = item.company || '';
          return [role, company].filter(Boolean).join(' at ');
        })
        .filter(Boolean)
        .join('\n')
    : '';

  const educationText = Array.isArray(parsed.education)
    ? parsed.education
        .map((item) => [item.degree || '', item.institution || ''].filter(Boolean).join(' - '))
        .filter(Boolean)
        .join('\n')
    : '';

  return [
    parsed.name || '',
    Array.isArray(parsed.skills) ? `Skills: ${parsed.skills.join(', ')}` : '',
    experienceText ? `Experience:\n${experienceText}` : '',
    educationText ? `Education:\n${educationText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
};

import { ATSScoreBadge } from '@/components/ui/ATSScoreBadge';

const formatDate = (value?: string | null): string => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString();
};

export function ResumeListCard({ refreshKey = 0, className }: ResumeListCardProps) {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [atsByResumeId, setAtsByResumeId] = useState<Record<string, number | null>>({});

  const hasResumes = resumes.length > 0;

  const fetchResumes = useCallback(async () => {
    try {
      setError('');
      const res = await api.get<{ resumes: ResumeListItem[] }>('/users/me/resumes');
      setResumes(toResumeList(res));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load resumes.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchResumes();
  }, [fetchResumes, refreshKey]);

  useEffect(() => {
    let canceled = false;

    const scoreResumes = async () => {
      const updates: Record<string, number | null> = {};

      for (const resume of resumes) {
        try {
          const detailRes = await api.get<ResumeDetailResponse>(`/users/me/resumes/${resume.id}`);
          const resumeText = buildResumeTextFromParsed(detailRes.data?.resume?.parsed);
          if (!resumeText) {
            updates[resume.id] = 0;
            if (canceled) return;
            setAtsByResumeId((prev) => ({ ...prev, ...updates }));
            continue;
          }

          const scoreRes = await api.post<AtsScoreReport>('/users/me/resume-score', {
            resumeText,
            jobDescription: ATS_GENERIC_JOB_DESCRIPTION,
          });

          updates[resume.id] = typeof scoreRes.data?.score === 'number' ? scoreRes.data.score : null;
        } catch {
          updates[resume.id] = 0;
        }

        if (canceled) return;
        setAtsByResumeId((prev) => ({ ...prev, ...updates }));
      }
    };

    if (resumes.length > 0) {
      void scoreResumes();
    }

    return () => {
      canceled = true;
    };
  }, [resumes]);

  const setDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await api.patch(`/users/me/resumes/${id}/set-default`, {});
      toast.success('Default resume updated');
      await fetchResumes();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to set default resume.';
      toast.error(message);
    } finally {
      setSettingDefaultId(null);
    }
  };

  const deleteResume = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this resume?')) {
      return;
    }

    setDeletingId(id);
    try {
      await api.delete(`/users/me/resumes/${id}`);
      toast.success('Resume deleted');
      await fetchResumes();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete resume.';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className={className}>
      <CardBody className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">My Resumes</h3>
          <p className="mt-1 text-sm text-slate-500">Manage uploaded resumes and choose your default.</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void fetchResumes()}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && !hasResumes && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
            <p className="text-sm font-medium text-slate-800">No resumes uploaded yet</p>
            <p className="mt-1 text-xs text-slate-500">Upload your first resume to get started.</p>
          </div>
        )}

        {!loading && !error && hasResumes && (
          <div className="space-y-3">
            {resumes.map((resume) => {
              const fileName = resume.file_name || 'Resume';
              const isSettingDefault = settingDefaultId === resume.id;
              const isDeleting = deletingId === resume.id;
              const atsScore = atsByResumeId[resume.id] ?? null;

              return (
                <div
                  key={resume.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{fileName}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {resume.is_default && <Badge variant="info">Default</Badge>}
                      <ATSScoreBadge score={atsScore} size="sm" />
                      <span className="text-xs text-slate-500">{formatDate(resume.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={Boolean(settingDefaultId || deletingId)}
                      onClick={() => router.push(ROUTES.resumeDetail(resume.id))}
                    >
                      View
                    </Button>

                    {!resume.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={isSettingDefault}
                        disabled={Boolean(settingDefaultId || deletingId)}
                        onClick={() => void setDefault(resume.id)}
                      >
                        Set Default
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      size="sm"
                      isLoading={isDeleting}
                      disabled={Boolean(settingDefaultId || deletingId)}
                      onClick={() => void deleteResume(resume.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
