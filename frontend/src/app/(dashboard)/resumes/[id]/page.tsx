'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ROUTES } from '@/constants';
import { ApiError, api } from '@/lib/api';
import { Button, Card, CardBody, Spinner } from '@/components/ui';

type ParsedExperienceItem = {
  company?: string | null;
  role?: string | null;
  title?: string | null;
};

type ParsedEducationItem = {
  degree?: string | null;
  institution?: string | null;
};

type ParsedResume = {
  name?: string | null;
  skills?: string[];
  experience?: ParsedExperienceItem[];
  education?: ParsedEducationItem[];
};

type ResumeDetail = {
  id: string;
  file_url: string | null;
  file_name: string | null;
  mime_type?: string | null;
  is_default?: boolean;
  parsed?: ParsedResume | null;
};

type AtsScoreReport = {
  score: number;
  explanation?: string;
};

type ResumeDraft = {
  summary: string;
  skills: string[];
  experience: Array<{
    company?: string | null;
    role?: string | null;
    dates?: string | null;
    description?: string | null;
  }>;
  education: Array<{
    institution?: string | null;
    degree?: string | null;
    dates?: string | null;
    description?: string | null;
  }>;
  contact: {
    email?: string | null;
    phone?: string | null;
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
  };
};

type ResumeResponse = {
  resume?: ResumeDetail;
};

const resolveResumeUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://hiringplatform-production-180d.up.railway.app/api/v1';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
};

const getCloudinaryDownloadUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
};

const isPdfLike = (resume: ResumeDetail): boolean => {
  const mimeType = resume.mime_type?.toLowerCase() || '';
  const fileName = resume.file_name?.toLowerCase() || '';
  return mimeType.includes('pdf') || fileName.endsWith('.pdf');
};

const toText = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const ATS_GENERIC_JOB_DESCRIPTION =
  'Software role requiring strong technical fundamentals, practical project experience, and clear communication.';

const getScoreStyle = (score: number | null): string => {
  if (score === null) return 'bg-slate-100 text-slate-600';
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

const buildResumeTextFromParsed = (parsed?: ParsedResume | null): string => {
  if (!parsed) return '';

  const experienceText = Array.isArray(parsed.experience)
    ? parsed.experience
        .map((item) => {
          const role = toText(item.role) || toText(item.title) || '';
          const company = toText(item.company) || '';
          return [role, company].filter(Boolean).join(' @ ');
        })
        .filter(Boolean)
        .join('\n')
    : '';

  const educationText = Array.isArray(parsed.education)
    ? parsed.education
        .map((item) => [toText(item.degree) || '', toText(item.institution) || ''].filter(Boolean).join(' - '))
        .filter(Boolean)
        .join('\n')
    : '';

  return [
    toText(parsed.name) || '',
    Array.isArray(parsed.skills) && parsed.skills.length > 0 ? `Skills: ${parsed.skills.join(', ')}` : '',
    experienceText ? `Experience:\n${experienceText}` : '',
    educationText ? `Education:\n${educationText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
};

const getExperienceLabel = (item: ParsedExperienceItem): string => {
  const role = toText(item.role) || toText(item.title);
  const company = toText(item.company);

  if (role && company) return `${role} @ ${company}`;
  if (role) return role;
  if (company) return company;
  return 'Experience details unavailable';
};

const getEducationLabel = (item: ParsedEducationItem): string => {
  const degree = toText(item.degree);
  const institution = toText(item.institution);

  if (degree && institution) return `${degree} - ${institution}`;
  if (degree) return degree;
  if (institution) return institution;
  return 'Education details unavailable';
};

export default function ResumeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingDefault, setSettingDefault] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsExplanation, setAtsExplanation] = useState<string | null>(null);
  const [scoringAts, setScoringAts] = useState(false);
  const [draft, setDraft] = useState<ResumeDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [latexLoading, setLatexLoading] = useState(false);

  const fetchResume = useCallback(async () => {
    try {
      const res = await api.get<ResumeResponse>(`/users/me/resumes/${id}`);
      const detail = res.data?.resume ?? null;
      setResume(detail);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setResume(null);
        return;
      }
      const message = err instanceof ApiError ? err.message : 'Failed to load resume.';
      toast.error(message);
      setResume(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchDraft = async () => {
    if (draftLoading) return;
    setDraftLoading(true);
    try {
      const res = await api.post<{ draft: ResumeDraft }>('/users/me/resume-draft', {});
      setDraft(res.data?.draft ?? null);
      toast.success('AI resume draft generated successfully.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to generate resume draft.';
      toast.error(message);
    } finally {
      setDraftLoading(false);
    }
  };

  const downloadLatex = async () => {
    if (latexLoading) return;
    setLatexLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://hiringplatform-production-180d.up.railway.app/api/v1';
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
      const message = err instanceof Error ? err.message : 'Failed to download LaTeX resume.';
      toast.error(message);
    } finally {
      setLatexLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchResume();
  }, [fetchResume]);

  const parsed = resume?.parsed ?? null;
  const skills = Array.isArray(parsed?.skills) ? parsed.skills.filter((skill) => toText(skill)) : [];
  const experience = Array.isArray(parsed?.experience) ? parsed.experience : [];
  const education = Array.isArray(parsed?.education) ? parsed.education : [];

  const hasParsedData = useMemo(() => {
    return Boolean(toText(parsed?.name)) || skills.length > 0 || experience.length > 0 || education.length > 0;
  }, [education.length, experience.length, parsed?.name, skills.length]);

  const canPreview = Boolean(resume?.file_url) && Boolean(resume && isPdfLike(resume));
  const [secureUrl, setSecureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (resume?.id) {
      api.get<{ url: string }>(`/users/me/resumes/${resume.id}/secure-url`)
        .then(res => setSecureUrl(res.data?.url || null))
        .catch(err => console.error('Failed to get secure URL', err));
    }
  }, [resume?.id]);

  const resumePreviewUrl = secureUrl ? `${secureUrl}#view=FitH` : null;
  const resumeDownloadUrl = getCloudinaryDownloadUrl(secureUrl);

  useEffect(() => {
    let canceled = false;

    const scoreResume = async () => {
      if (!resume) {
        setAtsScore(null);
        setAtsExplanation(null);
        return;
      }

      setScoringAts(true);
      try {
        const parsedText = buildResumeTextFromParsed(parsed);

        if (parsedText) {
          const scoreRes = await api.post<AtsScoreReport>('/users/me/resume-score', {
            resumeText: parsedText,
            jobDescription: ATS_GENERIC_JOB_DESCRIPTION,
          });
          if (canceled) return;
          setAtsScore(typeof scoreRes.data?.score === 'number' ? scoreRes.data.score : 0);
          setAtsExplanation(typeof scoreRes.data?.explanation === 'string' ? scoreRes.data.explanation : null);
          return;
        }

        if (!secureUrl) return; // Wait for secureUrl if we need to fetch the file

        const formData = new FormData();

        if (isPdfLike(resume)) {
          const fileRes = await fetch(secureUrl);
          if (!fileRes.ok) throw new Error('Failed to fetch resume file');

          const blob = await fileRes.blob();
          const file = new File([blob], resume.file_name || 'resume.pdf', {
            type: resume.mime_type || 'application/pdf',
          });

          formData.append('file', file);
        } else {
          const parsedText = [
            parsed?.name || '',
            Array.isArray(parsed?.skills) ? parsed?.skills.join(', ') : '',
            Array.isArray(parsed?.experience)
              ? parsed.experience
                  .map((item) => [item.role || item.title || '', item.company || ''].filter(Boolean).join(' at '))
                  .join('\n')
              : '',
            Array.isArray(parsed?.education)
              ? parsed.education
                  .map((item) => [item.degree || '', item.institution || ''].filter(Boolean).join(' - '))
                  .join('\n')
              : '',
          ]
            .filter(Boolean)
            .join('\n\n');

          formData.append('resumeText', parsedText || 'Resume text unavailable');
        }

        formData.append('jobDescription', ATS_GENERIC_JOB_DESCRIPTION);

        const scoreRes = await api.post<AtsScoreReport>('/users/me/resume-score', formData);

        if (canceled) return;
        setAtsScore(typeof scoreRes.data?.score === 'number' ? scoreRes.data.score : 0);
        setAtsExplanation(typeof scoreRes.data?.explanation === 'string' ? scoreRes.data.explanation : null);
      } catch {
        if (canceled) return;
        setAtsScore(0);
        setAtsExplanation(null);
      } finally {
        if (!canceled) setScoringAts(false);
      }
    };

    void scoreResume();

    return () => {
      canceled = true;
    };
  }, [parsed, resume, secureUrl]);

  const setDefaultResume = async () => {
    if (!resume || resume.is_default || settingDefault) return;
    setSettingDefault(true);
    try {
      await api.patch(`/users/me/resumes/${resume.id}/set-default`, {});
      setResume((prev) => (prev ? { ...prev, is_default: true } : prev));
      toast.success('This resume is now your default.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to set default resume.';
      toast.error(message);
    } finally {
      setSettingDefault(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Resume not found</h1>
        <Button variant="outline" onClick={() => router.push(ROUTES.profile)}>
          Back to Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{resume.file_name || 'Resume'}</h1>
        <div className="flex flex-wrap gap-2">
          {resume.file_url && (
            <a href={resumeDownloadUrl || '#'} download={resume.file_name || 'resume.pdf'} target="_blank" rel="noreferrer">
              <Button variant="outline" disabled={!secureUrl}>Download</Button>
            </a>
          )}
          <Button
            variant="outline"
            isLoading={latexLoading}
            onClick={() => void downloadLatex()}
          >
            Download LaTeX
          </Button>
          <Button
            variant="outline"
            isLoading={draftLoading}
            onClick={() => void fetchDraft()}
          >
            Generate AI Draft
          </Button>
          {!resume.is_default && (
            <Button variant="outline" isLoading={settingDefault} onClick={() => void setDefaultResume()}>
              Use for Applications
            </Button>
          )}
          {resume.is_default && (
            <Button variant="secondary" disabled>
              Default Resume
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardBody className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Preview</h2>

            {canPreview ? (
              <>
              <iframe
                src={resumePreviewUrl || undefined}
                className="w-full h-[600px] rounded-lg border border-slate-200"
                aria-label="Resume Preview"
              />
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-sm text-slate-700">Inline preview is unavailable in this browser.</p>
                  {resume.file_url && (
                    <a href={secureUrl || '#'} target="_blank" rel="noreferrer">
                      <Button variant="outline" disabled={!secureUrl}>Open Resume in New Tab</Button>
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-sm text-slate-700">Preview is unavailable for this file type.</p>
                {resume.file_url && (
                  <a href={resumeDownloadUrl || '#'} download={resume.file_name || 'resume.pdf'} target="_blank" rel="noreferrer">
                    <Button variant="outline" disabled={!secureUrl}>Download Resume</Button>
                  </a>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Parsed Information</h2>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-500">ATS Score</p>
              {scoringAts ? (
                <p className="mt-1 text-sm text-slate-600">Analyzing resume...</p>
              ) : (
                <>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${getScoreStyle(atsScore)}`}>
                    {atsScore === null ? 'Unavailable' : `${Math.round(atsScore)}%`}
                  </span>
                  {atsExplanation && <p className="mt-2 text-xs text-slate-600">{atsExplanation}</p>}
                </>
              )}
            </div>

            {!hasParsedData && (
              <p className="text-sm text-slate-500">Resume not parsed yet</p>
            )}

            {hasParsedData && (
              <>
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="text-slate-900">{toText(parsed?.name) || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Skills</p>
                  {skills.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">No skills detected.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-500">Experience</p>
                  {experience.length > 0 ? (
                    <div className="mt-1 space-y-1 text-sm text-slate-700">
                      {experience.map((item, idx) => (
                        <p key={`${getExperienceLabel(item)}-${idx}`}>{getExperienceLabel(item)}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">No experience detected.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-500">Education</p>
                  {education.length > 0 ? (
                    <div className="mt-1 space-y-1 text-sm text-slate-700">
                      {education.map((item, idx) => (
                        <p key={`${getEducationLabel(item)}-${idx}`}>{getEducationLabel(item)}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">No education detected.</p>
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
      {draft && (
        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">AI Resume Draft</h2>
            <div>
              <p className="text-sm text-slate-500">Summary</p>
              <p className="mt-2 text-slate-700 text-sm">{draft.summary}</p>
            </div>
            {draft.skills.length > 0 && (
              <div>
                <p className="text-sm text-slate-500">Suggested skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {draft.skills.map((skill) => (
                    <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {draft.experience.length > 0 && (
              <div>
                <p className="text-sm text-slate-500">Experience</p>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {draft.experience.map((item, idx) => (
                    <div key={`${item.role}-${item.company}-${idx}`}>
                      <p className="font-semibold text-slate-900">
                        {item.role || 'Role'}{item.company ? ` @ ${item.company}` : ''}
                      </p>
                      {item.dates && <p className="text-xs text-slate-500">{item.dates}</p>}
                      {item.description && <p>{item.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {draft.education.length > 0 && (
              <div>
                <p className="text-sm text-slate-500">Education</p>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {draft.education.map((item, idx) => (
                    <div key={`${item.degree}-${item.institution}-${idx}`}>
                      <p className="font-semibold text-slate-900">
                        {item.degree || 'Degree'}{item.institution ? ` - ${item.institution}` : ''}
                      </p>
                      {item.dates && <p className="text-xs text-slate-500">{item.dates}</p>}
                      {item.description && <p>{item.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}      <div>
        <Link href={ROUTES.profile} className="text-sm text-slate-600 hover:text-slate-900">
          Back to profile
        </Link>
      </div>
    </div>
  );
}
