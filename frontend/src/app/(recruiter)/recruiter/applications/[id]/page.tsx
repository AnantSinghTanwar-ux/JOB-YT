'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import toast from 'react-hot-toast';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { AiAnalysisPanel } from '@/components/applications/AiAnalysisPanel';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUSES } from '@/constants';

interface ApplicationDetail {
  id: string;
  applicant_id: string;
  job_id: string;
  resume_id?: string | null;
  resume_snapshot_url?: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  photo_url?: string | null;
  status: string;
  skills: string[];
  job_skills?: string[];
  education?: Array<{ institution?: string; degree?: string; year?: number; field?: string }>;
  job_title: string;
  job_location: string | null;
  created_at: string;
  /** Backend-computed skill match percentage (0–100). null = not computed. */
  skill_match?: number | null;
  /** Matched skills (backend-computed). */
  matched_skills?: string[];
  /** Missing skills (backend-computed). */
  missing_skills?: string[];
  responses?: Record<string, string>;
  resume_url?: string | null;
  projects?: Array<{
    id: string;
    title: string;
    description: string | null;
    tech_stack: string[];
    github_url: string | null;
    demo_url: string | null;
  }>;
  github_repos?: Array<{
    id: string;
    name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count: number;
  }>;
  certifications?: Array<{
    id: string;
    name: string;
    issuer: string;
    issue_date: string | null;
    credential_url: string | null;
  }>;
}

const getInitials = (name: string | null) => {
  if (!name) return 'C';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const getViolationsArray = (violations: any): any[] => {
  if (!violations) return [];
  if (Array.isArray(violations)) return violations;
  if (typeof violations === 'string') {
    try {
      return JSON.parse(violations);
    } catch {
      return [];
    }
  }
  return [];
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  // Manual Override State Variables
  const [overrideScore, setOverrideScore] = useState<number | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const res = await api.get<ApplicationDetail>(
          `/applications/recruiter/applicants/${applicationId}`
        );
        if (res.data) {
          setApplication(res.data);
          setOverrideScore((res.data as any).override_score);
          setOverrideStatus(res.data.status);
          setOverrideReason((res.data as any).override_reason || '');
        }
      } catch (err) {
        toast.error('Failed to load application details');
        router.push(ROUTES.recruiterApplications);
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId, router]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await api.patch(`/applications/${applicationId}/status`, {
        status: 'in_review',
      });
      toast.success('Application moved to reviewed!');
      router.push(ROUTES.recruiterApplications);
    } catch (err) {
      toast.error('Failed to move application to reviewed');
    } finally {
      setAccepting(false);
    }
  };

  const handleApplyOverride = async () => {
    setIsSavingOverride(true);
    try {
      await api.patch<any>(`/applications/${applicationId}/override`, {
        override_score: overrideScore,
        status: overrideStatus || undefined,
        notes: overrideReason || undefined,
      });
      setApplication((prev) => prev ? { 
        ...prev, 
        status: overrideStatus || prev.status, 
        skill_match: overrideScore !== null ? overrideScore : prev.skill_match,
        override_score: overrideScore,
        override_reason: overrideReason,
      } as any : null);
      toast.success('Manual override applied successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply manual override');
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleResetOverride = async () => {
    setIsSavingOverride(true);
    try {
      await api.patch<any>(`/applications/${applicationId}/override`, {
        override_score: null,
        notes: null,
      });
      // Fetch application details again to restore AI calculated default values
      const detailRes = await api.get<ApplicationDetail>(
        `/applications/recruiter/applicants/${applicationId}`
      );
      if (detailRes.data) {
        setApplication(detailRes.data);
        setOverrideScore(null);
        setOverrideReason('');
        setOverrideStatus(detailRes.data.status);
      }
      toast.success('Manual override reset to AI default.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset override');
    } finally {
      setIsSavingOverride(false);
    }
  };

  const [interview, setInterview] = useState<any | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const res = await api.get<any[]>('/interviews');
        const list = (res as any).data || res;
        const found = Array.isArray(list) ? list.find((i: any) => i.application_id === applicationId) : null;
        if (found) {
          setInterview(found);
        }
      } catch (err) {
        console.error('Failed to load interview details', err);
      }
    };

    if (applicationId) {
      fetchInterview();
    }
  }, [applicationId]);

  const handleScheduleInterview = async () => {
    if (!scheduledAt) {
      toast.error('Please select a date and time');
      return;
    }
    setScheduling(true);
    try {
      const res = await api.post<any>('/interviews', {
        applicationId,
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      const data = (res as any).data || res;
      if (data) {
        setInterview(data);
        toast.success('Interview scheduled successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule interview');
    } finally {
      setScheduling(false);
    }
  };

  const handleStartInterview = async () => {
    if (!interview) return;
    setStarting(true);
    try {
      await api.post(`/interviews/${interview.id}/start`, {});
      toast.success('Interview session started! Joining room...');
      router.push(`/interviews/live/${interview.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start interview');
    } finally {
      setStarting(false);
    }
  };

  const [fetchingResume, setFetchingResume] = useState(false);

  const handleViewResume = async () => {
    setFetchingResume(true);
    try {
      const res = await api.get<{ url: string }>(`/applications/${applicationId}/resume-url`);
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        toast.error('Resume URL not found');
      }
    } catch (err) {
      toast.error('Failed to load secure resume URL');
    } finally {
      setFetchingResume(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center">
        <p className="text-slate-500">Application not found</p>
      </div>
    );
  }

  // Backend is the single source of truth for skill matching.
  // skill_match is always provided by the enriched detail endpoint.
  // null = job has no required skills or score not yet available.
  const skillMatch: number | null =
    typeof application.skill_match === 'number' ? application.skill_match : null;
  const matchedSkills: string[] = application.matched_skills ?? [];
  const missingSkills: string[] = application.missing_skills ?? [];
  const hasResume = Boolean(
    application.resume_url ||
      application.resume_snapshot_url ||
      application.responses?.['resume_url'],
  );
  const jobQuestions = [
    { label: 'Do you have any previous experience? Elaborate.', response: application.responses?.['experience'] || '' },
    { label: 'What are some of the projects you have worked on?', response: application.responses?.['projects'] || '' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="max-w-6xl mx-auto pb-6 pt-6 px-4">
        <button
          onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 text-sm font-medium mb-4"
        >
          ← Back to Applications
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 rounded-xl m-4 space-y-6 pb-6" style={{ backgroundColor: '#ece9e2' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Candidate Info and Responses */}
          <div className="lg:col-span-2 space-y-6">
            {/* Candidate Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4 mb-6">
                {application.photo_url ? (
                  <img
                    src={resolveAssetUrl(application.photo_url) || ''}
                    alt={application.name || 'Candidate'}
                    className="w-24 h-24 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                    {getInitials(application.name)}
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-black text-slate-900 mb-2">{application.name || 'Candidate'}</h1>
                  <p className="text-sm text-slate-600 mb-3">{application.education?.[0]?.institution}</p>
                  <p className="text-xs text-slate-500">Applied {new Date(application.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Personal Info */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-bold text-slate-900 mb-3">Personal Info</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium">Full Name</p>
                    <p className="text-slate-900">{application.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Email</p>
                    <p className="text-slate-900">{application.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Number</p>
                    <p className="text-slate-900">{application.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate's Response */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Candidate's Response</h3>
              {jobQuestions.map((q, idx) => (
                <div key={idx}>
                  <p className="text-sm font-semibold text-slate-900 mb-2">{q.label}</p>
                  <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 min-h-[80px]">
                    {q.response || '(No response provided)'}
                  </div>
                </div>
              ))}
            </div>

            {/* Candidate Projects / Portfolio */}
            {application.projects && application.projects.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-lg">Portfolio & Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {application.projects.map((project) => (
                    <div key={project.id} className="bg-slate-50 rounded-lg p-4 text-sm border border-slate-100 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1">{project.title}</h4>
                        {project.description && <p className="text-slate-600 mb-3 text-xs line-clamp-3">{project.description}</p>}
                        {project.tech_stack && project.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {project.tech_stack.map((tech, i) => (
                              <span key={i} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs font-semibold mt-auto pt-2 border-t border-slate-200/60">
                        {project.github_url && (
                          <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            GitHub <span className="text-[10px]">↗</span>
                          </a>
                        )}
                        {project.demo_url && (
                          <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            Live Demo <span className="text-[10px]">↗</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidate GitHub Repositories */}
            {application.github_repos && application.github_repos.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-lg">GitHub Repositories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {application.github_repos.map((repo) => (
                    <div key={repo.id} className="bg-slate-50 rounded-lg p-4 text-sm border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline">
                          {repo.name}
                        </a>
                        <span className="text-slate-500 text-xs flex items-center gap-1">
                          ⭐ {repo.stargazers_count}
                        </span>
                      </div>
                      {repo.description && <p className="text-slate-600 text-xs mb-2 line-clamp-2">{repo.description}</p>}
                      {repo.language && (
                        <span className="text-xs font-medium text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                          {repo.language}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidate Certifications */}
            {application.certifications && application.certifications.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-lg">Certifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {application.certifications.map((cert) => (
                    <div key={cert.id} className="bg-slate-50 rounded-lg p-4 text-sm border border-slate-100 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900">{cert.name}</h4>
                        <p className="text-slate-600 text-xs">{cert.issuer}</p>
                        {cert.issue_date && (
                          <p className="text-slate-500 text-[11px] mt-1">
                            Issued: {new Date(cert.issue_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                      {cert.credential_url && (
                        <div className="mt-3 pt-2 border-t border-slate-200/60">
                          <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1">
                            View Credential <span className="text-[10px]">↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full px-4 py-3 bg-lime-300 text-black font-bold rounded-full hover:bg-lime-400 disabled:opacity-50 transition-colors"
            >
              {accepting ? 'Moving...' : 'Accept Application'}
            </button>
          </div>

          {/* Right: Skill Match and Resume */}
          <div className="lg:col-span-1 space-y-6">
            {/* Candidate's Skill Match */}
            <div className="bg-black rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-6 text-center">Candidate's Skill Match</h3>
              <div className="flex justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#404040"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#CDDC39"
                      strokeWidth="8"
                      strokeDasharray={skillMatch !== null ? `${(skillMatch / 100) * 339.3} 339.3` : '0 339.3'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {skillMatch !== null ? (
                        <div className="text-3xl font-black text-lime-300">{skillMatch}%</div>
                      ) : (
                        <div className="text-2xl font-black text-slate-400">&mdash;</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched Skills */}
              {matchedSkills.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-lime-300 uppercase tracking-widest mb-2">Matched</p>
                  <div className="space-y-1">
                    {matchedSkills.map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-lime-300 flex-shrink-0"></span>
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {missingSkills.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Missing</p>
                  <div className="space-y-1">
                    {missingSkills.map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-white/60">
                        <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"></span>
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback: raw candidate skills when no job skills defined */}
              {matchedSkills.length === 0 && missingSkills.length === 0 && (
                <div className="space-y-2">
                  {application.skills && application.skills.length > 0 ? (
                    application.skills.map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-lime-300"></span>
                        <span>{skill}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-sm">No skills listed</p>
                  )}
                </div>
              )}
            </div>

            {/* Live Technical Interview */}
            <div className="bg-black rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-4">Technical Interview</h3>
              
              {interview ? (
                <div className="space-y-4">
                  <div className="bg-[#222] p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Status</span>
                      <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                        interview.status === 'live' ? 'bg-rose-500 text-white animate-pulse' :
                        interview.status === 'completed' ? 'bg-green-500 text-white' : 'bg-lime-300 text-black'
                      }`}>
                        {interview.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Scheduled At</span>
                      <span className="text-sm font-semibold">{new Date(interview.scheduled_at).toLocaleString()}</span>
                    </div>
                    {interview.status === 'completed' && (
                      <>
                        <div className="border-t border-slate-700 pt-2 flex justify-between items-center">
                          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Rating</span>
                          <span className="text-sm font-black text-lime-300">{interview.rating || 'N/A'}/5 Stars</span>
                        </div>
                        <div className="border-t border-slate-700 pt-2">
                          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-1">Feedback</span>
                          <p className="text-xs text-slate-300 italic line-clamp-3">{interview.feedback || 'No feedback details.'}</p>
                        </div>
                        <div className="border-t border-slate-700 pt-2 space-y-2">
                          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">
                            🛡️ Proctoring Violations Log
                          </span>
                          {(() => {
                            const violations = getViolationsArray(interview.proctoring_violations);
                            if (violations.length === 0) {
                              return <p className="text-xs text-emerald-400 italic">No proctoring violations flagged.</p>;
                            }
                            return (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {violations.map((v: any, idx: number) => {
                                  const eventType = v.event || v.eventType;
                                  return (
                                    <div
                                      key={idx}
                                      className="text-[11px] font-bold flex justify-between bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-rose-400"
                                    >
                                      <span>
                                        ⚠️ {
                                          eventType === 'tab_switch' ? 'Switched Tab/Minimised' :
                                          eventType === 'window_blur' ? 'Lost Window Focus' :
                                          eventType === 'face_absent' ? 'No Face Detected' :
                                          eventType === 'multiple_faces' ? 'Multiple Faces Detected' :
                                          eventType
                                        }
                                      </span>
                                      <span className="text-slate-400 font-semibold">
                                        {new Date(v.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>

                  {interview.status !== 'completed' && (
                    <div className="space-y-2">
                      <button
                        onClick={handleStartInterview}
                        disabled={starting}
                        className="w-full px-4 py-2.5 bg-lime-300 text-black font-black rounded-lg hover:bg-lime-400 transition-colors"
                      >
                        {starting ? 'Launching...' : interview.status === 'live' ? 'Re-Join Live Room' : 'Start Live Session'}
                      </button>
                      
                      {interview.status === 'live' && (
                        <p className="text-[10px] text-rose-400 font-medium text-center animate-pulse">
                          Session is currently live! Click join to enter.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {application.status === 'interview' ? (
                    <>
                      <p className="text-xs text-slate-400">Schedule a live coding and voice interview session for this candidate.</p>
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-bold block">Interview Date & Time</label>
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full bg-[#222] border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-lime-300"
                        />
                      </div>
                      <button
                        onClick={handleScheduleInterview}
                        disabled={scheduling}
                        className="w-full px-4 py-2 bg-lime-300 text-black font-bold rounded-lg hover:bg-lime-400 disabled:opacity-50 transition-colors"
                      >
                        {scheduling ? 'Scheduling...' : 'Schedule Live Session'}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Move the candidate to the **Interview** stage to schedule a live session.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* AI Analysis Panel */}
            <AiAnalysisPanel applicationId={applicationId} />

            {/* Employer Override Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 text-left">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                </span>
                <h3 className="font-bold text-slate-900 text-md">Employer Override</h3>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Manually override the AI Match Score or force/override the candidate's shortlist status.
              </p>

              {/* Display current override details if active */}
              {application && (application as any).override_score !== null && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium">
                  <p className="font-bold mb-1">⚠️ Override Active</p>
                  <p>Match Score forced to: <span className="font-black text-amber-950">{(application as any).override_score}%</span></p>
                  {(application as any).override_reason && (
                    <p className="mt-1 italic text-amber-900">Reason: "{(application as any).override_reason}"</p>
                  )}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Override Match Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 95"
                    value={overrideScore === null ? '' : overrideScore}
                    onChange={(e) => setOverrideScore(e.target.value === '' ? null : parseInt(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Override Pipeline Stage</label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value)}
                    className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
                  >
                    <option value="">-- Change Pipeline Stage --</option>
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Override Reason / Notes</label>
                  <textarea
                    placeholder="Provide rationale for manual override..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[60px] resize-none text-slate-900"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleApplyOverride}
                    disabled={isSavingOverride}
                    className="flex-1 px-4 py-2.5 bg-amber-450 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                    style={{ backgroundColor: '#fbbf24' }}
                  >
                    {isSavingOverride ? 'Saving...' : 'Apply Override'}
                  </button>
                  {application && (application as any).override_score !== null && (
                    <button
                      onClick={handleResetOverride}
                      disabled={isSavingOverride}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* View Resume */}
            <div className="bg-black rounded-2xl p-6 text-white text-center">
              <h3 className="font-bold text-lg mb-4">View Resume</h3>
              <button
                onClick={() => void handleViewResume()}
                disabled={!hasResume || fetchingResume}
                className="w-full px-4 py-2 bg-lime-300 text-black font-bold rounded-lg hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {fetchingResume ? 'Loading...' : 'View Attached Resume'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
