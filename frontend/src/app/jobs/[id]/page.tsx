'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { ApplicationQuestion, Job } from '@/types';
import { Button, Spinner } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { formatDate, normalizeCompany } from '@/lib/utils';
import { avatarColor, avatarInitials } from '@/components/ui/JobCard';
import { resolveAssetUrl } from '@/lib/assetUrl';
import toast from 'react-hot-toast';
import { ROUTES } from '@/constants';
import { CodingApi } from '@/lib/api/coding.api';
import { InsufficientCreditsCard } from '@/components/credits/InsufficientCreditsCard';
import Link from 'next/link';
import {
  FaArrowLeft,
  FaMapPin,
  FaBriefcase,
  FaCalendar,
  FaIndianRupeeSign,
  FaBookmark,
  FaCheck,
  FaRobot,
  FaRoute,
  FaFileLines,
  FaChevronUp,
  FaChevronDown
} from 'react-icons/fa6';
import { formatSalaryRange } from '@/lib/salary';
import { useAuthStore } from '@/store/auth.store';
import { SelectionProbability, getTier } from '@/components/jobs/SelectionProbability';

interface UserProfilePayload {
  profile?: {
    skills?: string[];
    bio?: string;
  };
}

interface MatchResponse {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

interface SkillGapResponse {
  suggestions: Record<string, string>;
}

interface RoadmapWeek {
  week: number;
  topic: string;
  tasks: string[];
}

interface RoadmapResponse {
  roadmap: RoadmapWeek[];
}

interface AtsScoreReport {
  score: number;
  rolePrediction: string;
  experience: string;
  qualityScore: number;
  explanation: string;
  sectionScores?: {
    skillsScore?: number;
    experienceScore?: number;
    keywordsScore?: number;
  };
  missingKeywords?: string[];
  feedback?: {
    weakAreas?: string[];
    improvements?: string[];
  };
}

interface AtsScoreResponse {
  data: AtsScoreReport;
}

interface ResumeListItem {
  id: string;
  file_name: string;
  is_default: boolean;
}

interface PendingJobApply {
  cover_letter: string;
  resume_id: string;
  answers: Array<{ question_id: string; answer: string }>;
}

function pendingApplyKey(jobId: string) {
  return `pending_job_apply_${jobId}`;
}



function deriveJobRole(title: string): string {
  const cleaned = title
    .replace(/\b(internship|intern|trainee)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || title;
}

function getCompanyName(job: Job): string {
  return job.companyName?.trim() || 'Unknown Company';
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { user, isAuthenticated } = useAuthStore();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [creditError, setCreditError] = useState<{ required: number; available: number } | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    description: true,
    eligibility: false,
    requirements: false,
    perks: false,
    openings: false,
    about: false,
  });

  // AI Feature States
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [skillSuggestions, setSkillSuggestions] = useState<Record<string, string>>({});
  const [loadingInsights, setLoadingInsights] = useState(false);

  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllMissing, setShowAllMissing] = useState(false);

  const [roadmap, setRoadmap] = useState<RoadmapWeek[] | null>(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  const [atsScore, setAtsScore] = useState<AtsScoreReport | null>(null);
  const [scoringAts, setScoringAts] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id || id === 'undefined') {
      setLoading(false);
      router.push(ROUTES.jobs);
      return;
    }

    const fetchJobData = async () => {
      try {
        const jobRes = await api.get<Job>(`/jobs/${id}`);
        const jobData = jobRes.data ?? null;
        setJob(jobData);

        // Auto-scroll to apply section if redirecting back from login
        const applyRequested = new URLSearchParams(window.location.search).get('apply') === '1';
        if (applyRequested && jobData && isAuthenticated) {
          setTimeout(() => {
            const node = document.getElementById('apply-now-section');
            if (node) {
              node.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 500);
        }

        if (isAuthenticated) {
          try {
            const [checkRes, resumeRes, savedRes] = await Promise.all([
              api.get<{ hasApplied: boolean }>(`/applications/jobs/${id}/check`),
              api.get<{ resumes: ResumeListItem[] }>('/users/me/resumes'),
              api.get<Job[]>('/users/me/saved-jobs'),
            ]);

            setHasApplied(checkRes.data?.hasApplied ?? false);
            const availableResumes = Array.isArray(resumeRes.data?.resumes) ? resumeRes.data.resumes : [];
            setResumes(availableResumes);
            
            const defaultResume = availableResumes.find((resume) => resume.is_default);
            if (defaultResume) {
              setSelectedResumeId(defaultResume.id);
            } else if (availableResumes.length > 0) {
              setSelectedResumeId(availableResumes[0].id);
            }

            const savedJobs = Array.isArray(savedRes.data) ? savedRes.data : [];
            const isSavedJob = savedJobs.some((savedJob) => savedJob.id === id);
            setIsSaved(isSavedJob);
          } catch (err) {
            console.error('Failed to fetch user-specific job data:', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch job detail:', err);
        router.push(ROUTES.jobs);
      } finally {
        setLoading(false);
      }
    };

    fetchJobData();
  }, [id, router, isAuthenticated]);

  // Seed matchScore from the backend's selectionProbability if available (set before insights load)
  useEffect(() => {
    if (job?.selectionProbability !== undefined && matchScore === null) {
      setMatchScore(job.selectionProbability);
    }
  }, [job]);

  // Fetch AI Insights once job is loaded
  useEffect(() => {
    if (!job || user?.role !== 'applicant') return;
    
    const fetchInsights = async () => {
      setLoadingInsights(true);
      try {
        const meRes = await api.get<UserProfilePayload>('/users/me');
        const userSkills = meRes.data?.profile?.skills || [];

        if (job.skills.length > 0) {
          const matchRes = await api.post<MatchResponse>('/jobs/match', {
            userSkills,
            jobSkills: job.skills,
          });
          setMatchScore(matchRes.data?.matchScore ?? null);
          setMatchedSkills(matchRes.data?.matchedSkills ?? []);
          setMissingSkills(matchRes.data?.missingSkills ?? []);

          const gapRes = await api.post<SkillGapResponse>('/jobs/skill-gap', {
            userSkills,
            requiredSkills: job.skills,
          });
          setSkillSuggestions(gapRes.data?.suggestions ?? {});
        }
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
      } finally {
        setLoadingInsights(false);
      }
    };

    fetchInsights();
  }, [job, user?.role]);

  const dynamicQuestions: ApplicationQuestion[] = Array.isArray(job?.application_questions)
    ? job.application_questions
    : [];

  const sectionedQuestions = dynamicQuestions.reduce<Record<string, ApplicationQuestion[]>>((acc, question) => {
    const section = (question.section || 'Additional Questions').trim();
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(question);
    return acc;
  }, {});

  const handleApply = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to apply for this job');
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('apply', '1');
      const redirectTarget = currentUrl.pathname + currentUrl.search;
      router.push(`${ROUTES.login}?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    if (!selectedResumeId) {
      toast.error('Please select a resume before applying');
      return;
    }

    for (const question of dynamicQuestions) {
      if (!question.required) continue;
      const answer = (questionAnswers[question.id] || '').trim();
      if (!answer) {
        toast.error(`Please answer: ${question.label}`);
        return;
      }
    }

    const answersPayload = dynamicQuestions
      .map((question) => ({
        question_id: question.id,
        answer: (questionAnswers[question.id] || '').trim(),
      }))
      .filter((answer) => answer.answer.length > 0);

    const needsDuringApplyAssessment =
      Boolean(job?.active_assessment_version_id) && job?.assessment_timing === 'during_apply';

    if (needsDuringApplyAssessment && job?.active_assessment_version_id) {
      setApplying(true);
      try {
        const pending: PendingJobApply = {
          cover_letter: coverLetter,
          resume_id: selectedResumeId,
          answers: answersPayload,
        };
        sessionStorage.setItem(pendingApplyKey(id), JSON.stringify(pending));

        const sessionRes = await CodingApi.startSession(job.active_assessment_version_id);
        const sessionId = sessionRes.data?.id;
        if (!sessionId) {
          toast.error('Could not start coding assessment');
          return;
        }

        setShowModal(false);
        toast.success('Complete the coding assessment to finish your application');
        router.push(`${ROUTES.codingAssessment(sessionId)}?jobId=${encodeURIComponent(id)}`);
      } catch (err: unknown) {
        sessionStorage.removeItem(pendingApplyKey(id));
        if (err instanceof ApiError) {
          toast.error(err.message || 'Failed to start coding assessment');
        } else {
          toast.error('Failed to start coding assessment');
        }
      } finally {
        setApplying(false);
      }
      return;
    }

    setApplying(true);
    try {
      await api.post<{ creditsRemaining?: number }>(`/applications/jobs/${id}`, {
        cover_letter: coverLetter,
        resume_id: selectedResumeId,
        answers: answersPayload,
      });
      setHasApplied(true);
      setShowModal(false);
      setShowSuccessOverlay(true);
      setCreditError(null);

      if (job?.active_assessment_version_id && job.assessment_timing === 'post_apply') {
        try {
          const sessionRes = await CodingApi.startSession(job.active_assessment_version_id);
          const sessionId = sessionRes.data?.id;
          if (sessionId) {
            toast.success('Application submitted! Complete the coding assessment next.');
            router.push(ROUTES.codingAssessment(sessionId));
            return;
          }
        } catch {
          toast('Application submitted. Check your dashboard for the coding assessment link.');
        }
      }
    } catch (err: unknown) {
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
            required: creditData?.required ?? creditData?.requiredCredits ?? 1,
            available: creditData?.available ?? creditData?.availableCredits ?? 0,
          });
          setShowModal(false);
          setShowCreditsModal(true);
        } else {
          toast.error(err.message || 'Failed to apply');
        }
      } else {
        toast.error('Failed to apply');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleSaveJob = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to save this job');
      router.push(`${ROUTES.login}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    try {
      if (isSaved) {
        await api.delete(`/users/me/saved-jobs/${job?.id}`);
        setIsSaved(false);
        toast.success('Job removed from saved');
      } else {
        await api.post(`/users/me/saved-jobs/${job?.id}`, {});
        setIsSaved(true);
        toast.success('Job saved successfully!');
      }
    } catch (err) {
      toast.error(isSaved ? 'Failed to remove from saved' : 'Failed to save job');
    }
  };

  const scrollToApplySection = () => {
    if (!isAuthenticated) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('apply', '1');
      const redirectTarget = currentUrl.pathname + currentUrl.search;
      router.push(`${ROUTES.login}?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }
    const node = document.getElementById('apply-now-section');
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };



  const handleGenerateRoadmap = async () => {
    try {
      setGeneratingRoadmap(true);
      setShowRoadmapModal(true);
      const res = await api.post<RoadmapResponse>('/roadmaps/generate', { missingSkills });
      setRoadmap(res.data?.roadmap ?? null);
    } catch (err) {
      toast.error('Failed to generate roadmap');
      setShowRoadmapModal(false);
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const retryApplyAction = () => {
    setShowCreditsModal(false);
    scrollToApplySection();
  };

  const handleScoreAts = async () => {
    try {
      setScoringAts(true);
      const token = localStorage.getItem('hp_access');
      let data: AtsScoreReport;

      if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        formData.append('jobDescription', job?.description || '');
        if (selectedResumeId) {
          formData.append('resume_id', selectedResumeId);
        }
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://hiringplatform-production-180d.up.railway.app/api/v1'}/users/me/resume-score`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        
        if (!res.ok) throw new Error('ATS scoring failed');
        const json = (await res.json()) as AtsScoreResponse;
        data = json.data;
      } else {
        const customResumeText = resumeText.trim();
        const payload: { jobDescription: string; resumeText?: string; resume_id?: string } = {
          jobDescription: job?.description || '',
        };

        if (customResumeText.length > 0) {
          payload.resumeText = customResumeText;
        } else if (selectedResumeId) {
          payload.resume_id = selectedResumeId;
        } else {
          toast.error('Please select a resume or paste resume text first');
          setScoringAts(false);
          return;
        }

        const res = await api.post<AtsScoreReport>('/users/me/resume-score', payload);
        if (!res.data) throw new Error('ATS scoring failed');
        data = res.data;
      }
      setAtsScore(data);
    } catch (err) {
      toast.error('ATS scoring failed');
      console.error(err);
    } finally {
      setScoringAts(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>;
  if (!job) return null;

  const companyName = getCompanyName(job);
  const jobRole = deriveJobRole(job.title);

  const displaySkills =
    user?.role === 'applicant' && !loadingInsights && matchScore !== null
      ? matchedSkills
      : job.skills;

  return (
    <div className="mx-auto max-w-[1180px] rounded-[30px] bg-[#edf3df] px-4 pb-8 pt-4 md:px-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white"
        >
          <FaArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-center text-3xl font-black tracking-tight text-[#111] md:text-[42px]">{job.title}</h1>
        <button
          onClick={scrollToApplySection}
          disabled={hasApplied}
          className={`rounded-full px-7 py-2.5 text-sm font-extrabold transition ${hasApplied
            ? 'bg-gray-300 text-gray-700'
            : 'bg-[#bbf52f] text-black hover:brightness-95'}`}
        >
          {hasApplied ? 'Already Applied' : 'Apply Now'}
        </button>
      </div>

      <div className="job-mock-scroll rounded-[24px] bg-[#e8e7e2] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] md:max-h-[calc(100vh-130px)] md:overflow-y-scroll md:pr-2 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-[#f3f3f0] p-4">
          <div className="flex items-center gap-3">
            <div 
              style={{
                width: 42,
                height: 42,
                borderRadius: 50,
                background: avatarColor(companyName),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {resolveAssetUrl(job.company_logo) ? (
                <img
                  src={resolveAssetUrl(job.company_logo) || ''}
                  alt={`${companyName} logo`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                  {avatarInitials(companyName)}
                </span>
              )}
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-[#121212]">{companyName}</p>
              <p className="text-lg text-[#333] underline">{companyName.toLowerCase().replace(/\s+/g, '')}.studio</p>
            </div>
          </div>
          <button
            onClick={handleSaveJob}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-bold text-sm transition ${isSaved ? 'border-[#bbf52f] bg-black text-[#bbf52f]' : 'border-black bg-white text-black hover:bg-gray-50'}`}
            aria-label={isSaved ? 'Unsave job' : 'Save job'}
          >
            <FaBookmark className="h-4 w-4" />
            {isSaved ? 'Unsave' : 'Save'}
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-x-3 gap-y-3 rounded-[18px] bg-[#fbfbfb] px-3 py-4 text-center md:grid-cols-6">
          <div>
            <p className="text-[10px] font-bold uppercase text-[#666]">Job Role</p>
            <p className="text-sm font-bold text-[#121212]">{jobRole}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#666]">Location</p>
            <p className="text-sm font-bold text-[#121212]">{job.location || 'Remote'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#666]">Start Date</p>
            <p className="text-sm font-bold text-[#121212]">Immediately</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#666]">Duration</p>
            <p className="text-sm font-bold text-[#121212]">6 Months</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#666]">Stipend</p>
            <p className="text-sm font-bold text-[#121212]">{formatSalaryRange(job.salary_min, job.salary_max, job.type)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#666]">Apply By</p>
            <p className="text-sm font-bold text-[#121212]">{formatDate(job.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3">
            {[
              { key: 'description', title: 'Job Description', content: job.description },
              {
                key: 'eligibility',
                title: 'Eligibility',
                content: job.skills.length ? `Preferred skills: ${job.skills.join(', ')}` : 'Open to applicants with relevant experience.',
              },
              {
                key: 'requirements',
                title: 'Other Requirements',
                content: dynamicQuestions.length > 0
                  ? `You need to answer ${dynamicQuestions.length} additional question${dynamicQuestions.length > 1 ? 's' : ''} while applying.`
                  : 'No additional mandatory requirements listed by recruiter.',
              },
              {
                key: 'perks',
                title: 'Perks',
                content: `Hands-on projects, mentorship, and stipend range ${formatSalaryRange(job.salary_min, job.salary_max, job.type)}.`,
              },
              {
                key: 'openings',
                title: 'Number of Openings',
                content: '1 opening',
              },
              {
                key: 'about',
                title: `About ${companyName}`,
                content: `${companyName} is hiring for a ${job.type.replace('-', ' ')} role in ${job.location || 'multiple locations'}.`,
              },
            ].map((section) => (
              <div key={section.key} className="overflow-hidden rounded-2xl border border-[#dcdcd4] bg-[#f8f8f8]">
                <button
                  onClick={() =>
                    setOpenSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }))
                  }
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#eaeaea] transition-colors duration-200"
                >
                  <span className="text-lg font-bold tracking-tight text-[#111] md:text-xl">{section.title}</span>
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white transition-transform duration-300 ${openSections[section.key] ? 'rotate-180' : ''}`}>
                    <FaChevronDown className="h-3.5 w-3.5" />
                  </span>
                </button>
                {openSections[section.key] && (
                  <div className="border-t border-[#dfdfd9] px-5 pb-4 pt-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-[#252525]">{section.content}</p>
                  </div>
                )}
              </div>
            ))}

            <div id="apply-now-section" className="mt-2 rounded-2xl border border-[#caf36a] bg-[#f8f8f8] px-4 py-5 md:px-6">
              <h2 className="mb-3 text-4xl font-black tracking-tight text-[#98cf2d]">Apply Now</h2>

              {job.active_assessment_version_id && (
                <div className="mb-4 rounded-xl border border-[#98cf2d]/40 bg-[#f0fce0] px-4 py-3">
                  <p className="text-sm font-bold text-[#1c1c1c]">
                    Coding assessment required
                    {job.assessment_title ? `: ${job.assessment_title}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-[#444]">
                    {job.assessment_timing === 'during_apply'
                      ? 'You will complete the coding assessment before your application is submitted.'
                      : 'You will receive a coding assessment link after submitting your application.'}
                  </p>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-2xl font-bold text-[#1c1c1c]">Resume</h3>
                <p className="mb-3 text-sm text-[#444]">Your current resume will be submitted along with this application.</p>
                {resumes.length > 0 ? (
                  <select
                    className="max-w-[250px] rounded-xl border border-black bg-black px-3 py-2 text-sm font-semibold text-white"
                    value={selectedResumeId}
                    onChange={(e) => {
                      setSelectedResumeId(e.target.value);
                      setResumeFile(null);
                      setAtsScore(null);
                    }}
                  >
                    {resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.file_name}{resume.is_default ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="inline-block rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    No resume found. Upload a resume from profile to apply.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-[#1c1c1c]">Additional Questions</h3>
                {dynamicQuestions.length > 0 ? (
                  Object.entries(sectionedQuestions).map(([section, questions]) => (
                    <div key={section} className="space-y-2">
                      <p className="text-sm font-bold text-[#2d2d2d]">{section}</p>
                      {questions.map((question) => (
                        <div key={question.id} className="space-y-1">
                          <label className="text-sm text-[#1f1f1f]">
                            {question.label} {question.required ? <span className="text-red-500">*</span> : null}
                          </label>

                          {(question.type === 'text' || question.type === 'link') && (
                            <input
                              type={question.type === 'link' ? 'url' : 'text'}
                              className="w-full rounded-xl border border-black bg-black px-4 py-3 text-sm text-white placeholder:text-gray-300"
                              placeholder={question.placeholder || (question.type === 'link' ? 'Add Link' : 'Enter answer')}
                              value={questionAnswers[question.id] || ''}
                              onChange={(e) =>
                                setQuestionAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                              }
                            />
                          )}

                          {question.type === 'textarea' && (
                            <textarea
                              className="w-full rounded-xl border border-black bg-black px-4 py-3 text-sm text-white placeholder:text-gray-300"
                              rows={4}
                              placeholder={question.placeholder || 'Enter answer'}
                              value={questionAnswers[question.id] || ''}
                              onChange={(e) =>
                                setQuestionAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                              }
                            />
                          )}

                          {(question.type === 'select' || question.type === 'rating') && (
                            <select
                              className="w-full max-w-[220px] rounded-xl border border-black bg-black px-4 py-3 text-sm text-white"
                              value={questionAnswers[question.id] || ''}
                              onChange={(e) =>
                                setQuestionAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                              }
                            >
                              <option value="">Select Range</option>
                              {(question.options || []).map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#444]">No additional recruiter questions for this role.</p>
                )}
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-bold text-[#252525]">Cover Letter (optional)</label>
                <textarea
                  className="w-full rounded-xl border border-[#cfd7c2] bg-white px-4 py-3 text-sm"
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell the recruiter why you are a strong fit"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={handleApply}
                  disabled={applying || hasApplied || !selectedResumeId}
                  className="rounded-full bg-[#bbf52f] px-7 py-2.5 text-sm font-extrabold text-black disabled:bg-gray-300"
                >
                  {hasApplied ? 'Already Applied' : applying ? 'Submitting...' : !selectedResumeId ? 'Select Resume First' : 'Submit Application'}
                </button>
                {!hasApplied && (
                  <button
                    onClick={scrollToApplySection}
                    className="rounded-full border border-black px-7 py-2.5 text-sm font-bold text-black"
                  >
                    Review Form
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="sticky top-24 z-30 h-fit rounded-3xl bg-black p-3 text-white">
            {user?.role === 'applicant' && job.skills.length > 0 && (
              <>
                <div className="mb-2 text-center">
                  <p className="text-4xl font-black leading-none text-[#bbf52f]">
                    {loadingInsights ? '--' : matchScore !== null ? `${matchScore}%` : '--'}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#bbf52f]">Selection Probability</p>
                  {!loadingInsights && matchScore !== null && (
                    <>
                      <p className="mt-1 text-[11px] font-bold" style={{
                        color: matchScore >= 80 ? '#6ee7a8' : matchScore >= 60 ? '#fcd34d' : '#fca5a5'
                      }}>
                        {matchScore >= 80 ? 'High Selection Chance' : matchScore >= 60 ? 'Moderate Selection Chance' : 'Low Selection Chance'}
                      </p>
                      <p className="mt-1 text-[9px] text-gray-400 leading-relaxed">
                        Based on your profile match with this role.
                      </p>
                    </>
                  )}
                </div>
                <div className="mb-3 h-4 rounded-full bg-[#4a4a4a]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${loadingInsights ? 0 : matchScore ?? 0}%`,
                      background: !loadingInsights && matchScore !== null
                        ? matchScore >= 80 ? '#16c26a' : matchScore >= 60 ? '#f59e0b' : '#ef4444'
                        : '#bbf52f',
                    }}
                  />
                </div>
              </>
            )}

            <h3 className="mb-2 text-lg font-black">
              {user?.role === 'applicant' && !loadingInsights && matchScore !== null ? 'Matched Skills' : 'Required Skills'}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(showAllSkills ? displaySkills : displaySkills.slice(0, 6)).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-[#9acd32] bg-black px-2 py-0.5 text-xs text-[#bbf52f]"
                >
                  {skill}
                </span>
              ))}
              {displaySkills.length > 6 && (
                <button
                  onClick={() => setShowAllSkills((prev) => !prev)}
                  className="rounded-full bg-[#bbf52f] px-2 py-0.5 text-xs font-bold text-black hover:bg-[#aee62d] transition-colors cursor-pointer"
                >
                  {showAllSkills ? 'Show less' : `+${displaySkills.length - 6}`}
                </button>
              )}
            </div>

            {user?.role === 'applicant' && missingSkills.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-300">Missing</p>
                <div className="flex flex-wrap gap-1.5">
                  {(showAllMissing ? missingSkills : missingSkills.slice(0, 4)).map((skill) => (
                    <span key={skill} className="rounded-full border border-white px-2 py-0.5 text-xs text-white">
                      {skill}
                    </span>
                  ))}
                  {missingSkills.length > 4 && (
                    <button
                      onClick={() => setShowAllMissing((prev) => !prev)}
                      className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-black hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      {showAllMissing ? 'Show less' : `+${missingSkills.length - 4}`}
                    </button>
                  )}
                </div>
                <button
                  onClick={handleGenerateRoadmap}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-black"
                >
                  <FaRoute className="h-2.5 w-2.5" /> Roadmap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Roadmap Modal */}
      <Modal isOpen={showRoadmapModal} onClose={() => setShowRoadmapModal(false)} title="Your Custom Learning Roadmap">
        <div className="space-y-6">
          <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-900 border border-indigo-100">
            <p className="font-bold mb-1 flex items-center gap-2"><FaRobot className="text-indigo-600"/> AI-Generated Path</p>
            <p>This roadmap is specifically tailored to bridge your skill gap for this role.</p>
          </div>
          
          {generatingRoadmap ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Spinner size="lg" />
              <p className="text-gray-500 font-medium">Generating your personalized roadmap...</p>
            </div>
          ) : roadmap ? (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {roadmap.map((week, idx: number) => (
                <div key={idx} className="relative pl-6 pb-4 border-l-2 border-indigo-200 last:border-0 last:pb-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white"></div>
                  <h3 className="font-bold text-gray-900 mb-1">Week {week.week}: {week.topic}</h3>
                  <ul className="space-y-2 mt-2">
                    {week.tasks.map((task: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-red-500">Failed to generate roadmap.</p>
          )}
          
          <div className="pt-2">
            <button onClick={() => setShowRoadmapModal(false)} className="w-full py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Apply Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Apply for this Position">
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-[#1a1a1a] mb-1">{job.title}</h3>
            <p className="text-sm text-gray-600">
              {companyName}
              {job.location ? ` • ${job.location}` : ''}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">
              <span className="font-bold">⚡ Cost:</span> 1 Credit will be deducted from your balance
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Choose Resume</p>
              <p className="text-xs text-gray-500">Your selected resume is attached to this application.</p>
            </div>
            {resumes.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No resume found. Upload a resume from profile to proceed with application.
              </p>
            ) : (
              <div className="space-y-2">
                {resumes.map((resume) => (
                  <label key={resume.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <span className="text-sm text-gray-800">{resume.file_name}</span>
                    <span className="inline-flex items-center gap-2">
                      {resume.is_default && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Default</span>}
                      <input
                        type="radio"
                        name="resume_id"
                        checked={selectedResumeId === resume.id}
                        onChange={() => {
                          setSelectedResumeId(resume.id);
                          setResumeFile(null);
                          setAtsScore(null);
                        }}
                      />
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ATS Analyzer */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <FaFileLines className="text-blue-600"/> Resume ATS Analyzer
              </h4>
              <button 
                onClick={handleScoreAts}
                disabled={scoringAts || (!resumeText.trim() && !resumeFile && !selectedResumeId)}
                className="px-3 py-1.5 bg-white border border-gray-300 shadow-sm rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {scoringAts ? 'Analyzing...' : 'Analyze Fit'}
              </button>
            </div>
            
            {!atsScore && (
              <div className="space-y-4">
                <div className="border border-dashed border-gray-400 rounded-xl p-4 text-center hover:bg-gray-100 transition-colors">
                  <label className="cursor-pointer block">
                    <span className="text-sm font-bold text-blue-600 block mb-1">
                      {resumeFile ? '📄 ' + resumeFile.name : 'Click to Upload PDF Resume'}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">For maximum accuracy in ATS scoring</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                      setResumeFile(e.target.files?.[0] || null);
                      setResumeText(''); // clear text fallback
                    }} />
                  </label>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-50 px-2 text-gray-400 font-bold">OR PASTE TEXT</span>
                  </div>
                </div>

                <div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-blue-500 resize-none bg-white opacity-80"
                    rows={3}
                    placeholder="Paste resume text or leave blank to use your profile string..."
                    value={resumeText}
                    onChange={(e) => {
                      setResumeText(e.target.value);
                      setResumeFile(null); // clear file
                    }}
                  />
                </div>
              </div>
            )}

            {atsScore && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Master Match Row */}
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10"></div>
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl font-black ${atsScore.score >= 80 ? 'text-green-600' : atsScore.score >= 50 ? 'text-yellow-600' : 'text-orange-600'}`}>
                      {atsScore.score}%
                    </div>
                    <div>
                      <div className="font-extrabold text-gray-900 leading-tight">Overall Match</div>
                      <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">NLP + LLM AI</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-200">
                      {atsScore.rolePrediction}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">
                      {atsScore.experience} • Q-Score: {atsScore.qualityScore}/100
                    </div>
                  </div>
                </div>

                {/* Section Scores Grid */}
                {atsScore.sectionScores && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Skills', val: atsScore.sectionScores.skillsScore || 0 },
                      { label: 'Experience', val: atsScore.sectionScores.experienceScore || 0 },
                      { label: 'Keyword Overlap', val: atsScore.sectionScores.keywordsScore || 0 }
                    ].map((s) => (
                      <div key={s.label} className="bg-white border border-gray-100 rounded-lg p-2 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.02)]">
                        <div className={`text-lg font-black ${s.val >= 80 ? 'text-green-500' : s.val >= 50 ? 'text-yellow-500' : 'text-red-400'}`}>
                          {s.val}%
                        </div>
                        <div className="text-[10px] uppercase font-bold text-gray-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Explanation Explanation */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-900 leading-relaxed indent-2 italic font-medium">
                  &quot;{atsScore.explanation}&quot;
                </div>

                {/* Feedback Areas */}
                {atsScore.feedback && (
                  <div className="space-y-3">
                    {(atsScore.missingKeywords ?? []).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          <span className="text-xs font-bold text-red-900">Missing Keywords (TF-IDF Priority)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-3.5">
                          {(atsScore.missingKeywords ?? []).map((kw: string) => (
                            <span key={kw} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold border border-red-200">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(atsScore.feedback.weakAreas ?? []).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          <span className="text-xs font-bold text-orange-900">Weak Content Areas</span>
                        </div>
                        <ul className="list-disc pl-7 text-[10px] font-semibold text-orange-800 space-y-0.5">
                          {(atsScore.feedback.weakAreas ?? []).map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}

                    {(atsScore.feedback.improvements ?? []).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          <span className="text-xs font-bold text-green-900">Suggested Improvements</span>
                        </div>
                        <ul className="list-disc pl-7 text-[10px] font-semibold text-green-800 space-y-0.5">
                          {(atsScore.feedback.improvements ?? []).map((imp: string, i: number) => <li key={i}>{imp}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Download Button */}
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(atsScore, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `resume_analysis_${job.title.replace(/\\s+/g, '_')}.json`;
                    a.click();
                  }}
                  className="w-full py-2 bg-[#1a1a1a] text-white font-bold tracking-wide rounded-lg text-xs mt-2 hover:bg-gray-800 transition-colors shadow-lg"
                >
                  ↓ Download Full JSON Report
                </button>
              </div>
            )}
          </div>

          {dynamicQuestions.length > 0 ? (
            Object.entries(sectionedQuestions).map(([section, questions]) => (
              <div key={section} className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">{section}</h4>
                {questions.map((question) => (
                  <div key={question.id} className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      {question.label} {question.required ? <span className="text-red-500">*</span> : null}
                    </label>

                    {(question.type === 'text' || question.type === 'link') && (
                      <input
                        type={question.type === 'link' ? 'url' : 'text'}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder={question.placeholder || (question.type === 'link' ? 'https://...' : 'Enter answer')}
                        value={questionAnswers[question.id] || ''}
                        onChange={(e) =>
                          setQuestionAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                        }
                      />
                    )}

                    {question.type === 'textarea' && (
                      <textarea
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        rows={4}
                        placeholder={question.placeholder || 'Enter answer'}
                        value={questionAnswers[question.id] || ''}
                        onChange={(e) =>
                          setQuestionAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                        }
                      />
                    )}

                    {(question.type === 'select' || question.type === 'rating') && (
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={questionAnswers[question.id] || ''}
                        onChange={(e) =>
                          setQuestionAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                        }
                      >
                        <option value="">Select an option</option>
                        {(question.options || []).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              No additional recruiter questions for this role. You can apply directly.
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Cover Letter <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full px-4 py-3 border border-[#e8e4dc] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent resize-none"
              rows={5}
              placeholder="Tell the recruiter why you're a great fit for this role..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleApply}
              disabled={applying || !selectedResumeId}
              className="flex-1 bg-lime-400 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-lime-500 disabled:opacity-50 transition-all duration-200 active:scale-95"
            >
              {applying ? 'Applying...' : !selectedResumeId ? 'Select Resume First' : 'Confirm & Apply'}
            </button>
            <button
              onClick={() => setShowModal(false)}
              disabled={applying}
              className="flex-1 bg-gray-100 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Credits Insufficient Modal */}
      <Modal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} title="">
        {creditError && (
          <InsufficientCreditsCard
            creditError={creditError}
            onViewCredits={() => router.push(ROUTES.credits)}
            onRetry={retryApplyAction}
            retryDisabled={applying}
          />
        )}
      </Modal>

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center mx-auto">
              <FaCheck className="w-10 h-10 text-lime-600" />
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-2">
                Application Submitted! 🎉
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Your application for <span className="font-bold">{job.title}</span> at <span className="font-bold">{companyName}</span> has been sent. The recruiter will review and get back to you soon.
              </p>
            </div>

            <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 text-sm text-left">
              <p className="text-gray-700">
                <span className="font-bold">Next Step:</span> Check your <Link href={ROUTES.applications} className="text-lime-600 font-bold hover:underline">Applications</Link> to track the status.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowSuccessOverlay(false);
                  router.push(ROUTES.applications);
                }}
                className="flex-1 bg-lime-400 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-lime-500 transition-colors active:scale-95"
              >
                View Applications
              </button>
              <button
                onClick={() => setShowSuccessOverlay(false)}
                className="flex-1 bg-gray-100 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .job-mock-scroll {
          scrollbar-gutter: stable;
          scrollbar-width: auto;
          scrollbar-color: #d8ddd2 #000000;
        }

        .job-mock-scroll::-webkit-scrollbar {
          width: 12px;
        }

        .job-mock-scroll::-webkit-scrollbar-track {
          background: #000000;
          border-radius: 9999px;
        }

        .job-mock-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #f1f1ed 0%, #d7ddd0 100%);
          border-radius: 9999px;
          border: 2px solid #000000;
          min-height: 52px;
        }

        .job-mock-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #f7f7f3 0%, #dfe4d9 100%);
        }
      `}</style>
    </div>
  );
}
