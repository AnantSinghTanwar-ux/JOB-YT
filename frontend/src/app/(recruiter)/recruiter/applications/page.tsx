'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { FaMagnifyingGlass, FaComments } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { createConversation } from '@/lib/messages';
import { normalizeCompany } from '@/lib/utils';
import { ATSBreakdown } from '@/types';
import { ATSScoreBadge } from '@/components/ui/ATSScoreBadge';
import { ATSInsightsPanel } from '@/components/ui/ATSInsightsPanel';
import { RecruiterInsightsReviewPanel } from '@/components/ui/RecruiterInsightsReviewPanel';

interface RecruiterApplication {
  id: string;
  applicant_id: string;
  job_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  photo_url?: string | null;
  status: string;
  skills: string[];
  education?: Array<{ institution?: string; degree?: string; year?: number; field?: string }>;
  job_title: string;
  job_location: string | null;
  ats_score?: number | null;
  ats_breakdown?: ATSBreakdown | null;
  fit_insights?: string | null;
  improvement_suggestions?: string | null;
  rejection_reason?: string | null;
  insights_approved?: boolean;
  insights_generated_at?: string | null;
  created_at: string;
}

const statusFilters = [
  { label: 'ALL', value: '' },
  { label: 'PENDING', value: 'applied' },
  { label: 'REVIEWED', value: 'in_review' },
  { label: 'INTERVIEW', value: 'interview' },
  { label: 'STATUS', value: 'rejected,hired,offer' },
];

const statusBadgeClass: Record<string, string> = {
  applied: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  shortlisted: 'bg-purple-100 text-purple-800',
  interview: 'bg-orange-100 text-orange-800',
  offer: 'bg-teal-100 text-teal-800',
  selected: 'bg-teal-100 text-teal-800',
  hired: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

const statusLabelMap: Record<string, string> = {
  applied: 'PENDING',
  in_review: 'REVIEWED',
  shortlisted: 'SHORTLISTED',
  interview: 'INTERVIEW',
  offer: 'OFFER',
  selected: 'OFFER',
  hired: 'HIRED',
  rejected: 'REJECTED',
};



const formatRelative = (isoDate: string) => {
  const now = Date.now();
  const time = new Date(isoDate).getTime();
  const diffMs = now - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `${mins}m ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffMs / day);
  return `${days}d ago`;
};

const getEducationDisplay = (education?: any[]) => {
  if (!education || education.length === 0) return null;
  const edu = Array.isArray(education) ? education[0] : education;
  if (typeof edu === 'string') return null;
  if (edu.institution) {
    return edu.institution;
  }
  return null;
};

export default function RecruiterApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRequestRef = useRef(0);
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [openingConversationFor, setOpeningConversationFor] = useState<string | null>(null);
  const [updatingStatusFor, setUpdatingStatusFor] = useState<string | null>(null);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const selectedJobId = searchParams.get('jobId') || '';

  // 300ms debounce on search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  const fetchApplications = useCallback(async () => {
    const requestId = ++activeRequestRef.current;
    setLoading(true);
    try {
      if (selectedJobId) {
        const searchLower = debouncedSearch.trim().toLowerCase();
        const params = new URLSearchParams();
        params.append('limit', '100');
        if (searchLower) params.append('search', searchLower);
        
        const res = await api.getPaginated<RecruiterApplication>(`/applications/jobs/${selectedJobId}?${params.toString()}`);
        let base = (res.data ?? []).map(normalizeCompany);

        // Client-side multi-status filter if needed
        if (selectedStatus === 'rejected,hired,offer') {
          base = base.filter((app) => {
            const s = app.status?.toLowerCase() || '';
            return s === 'rejected' || s === 'hired' || s === 'offer';
          });
        } else if (selectedStatus) {
            base = base.filter(app => app.status?.toLowerCase() === selectedStatus);
        }

        if (requestId === activeRequestRef.current) {
            setApplications(base as any);
        }
        return;
      }

      const params = new URLSearchParams();
      
      // Handle multiple statuses for STATUS tab
      if (selectedStatus === 'rejected,hired,offer') {
        const rejectedParams = new URLSearchParams();
        rejectedParams.append('status', 'rejected');
        if (selectedJobId) rejectedParams.append('jobId', selectedJobId);

        const hiredParams = new URLSearchParams();
        hiredParams.append('status', 'hired');
        if (selectedJobId) hiredParams.append('jobId', selectedJobId);

        const offerParams = new URLSearchParams();
        offerParams.append('status', 'offer');
        if (selectedJobId) offerParams.append('jobId', selectedJobId);

        const [rejectedRes, hiredRes, offerRes] = await Promise.all([
          api.getPaginated<RecruiterApplication>(
            `/applications/recruiter/applicants/filtered?${rejectedParams.toString()}&limit=50`
          ),
          api.getPaginated<RecruiterApplication>(
            `/applications/recruiter/applicants/filtered?${hiredParams.toString()}&limit=50`
          ),
          api.getPaginated<RecruiterApplication>(
            `/applications/recruiter/applicants/filtered?${offerParams.toString()}&limit=50`
          ),
        ]);
        const combined = [
          ...(rejectedRes.data ?? []),
          ...(hiredRes.data ?? []),
          ...(offerRes.data ?? []),
        ].map(normalizeCompany);
        if (requestId === activeRequestRef.current) {
          setApplications(combined as any);
        }
      } else {
        if (selectedStatus) params.append('status', selectedStatus);
        if (debouncedSearch) {
          params.append('search', debouncedSearch);
        }
        if (selectedJobId) {
          params.append('jobId', selectedJobId);
        }
        
        const res = await api.getPaginated<RecruiterApplication>(
          `/applications/recruiter/applicants/filtered?${params.toString()}&limit=50`
        );
        if (requestId === activeRequestRef.current) {
          setApplications((res.data ?? []).map(normalizeCompany) as any);
        }
      }
    } catch (err) {
      if (requestId === activeRequestRef.current) {
        toast.error('Failed to load applications');
        setApplications([]);
      }
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  }, [selectedStatus, debouncedSearch, selectedJobId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleMessageApplicant = useCallback(async (app: RecruiterApplication) => {
    if (!app.applicant_id) {
      toast.error('Applicant is not available for messaging');
      return;
    }

    setOpeningConversationFor(app.id);
    try {
      const conversationId = await createConversation(app.applicant_id, app.job_id);
      router.push(`${ROUTES.recruiterMessages}?conversationId=${conversationId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open chat';
      toast.error(message);
    } finally {
      setOpeningConversationFor(null);
    }
  }, [router]);

  const handleUpdateApplicationStatus = useCallback(async (applicationId: string, status: 'interview' | 'rejected' | 'hired') => {
    setUpdatingStatusFor(`${applicationId}:${status}`);
    try {
      await api.patch(`/applications/${applicationId}/status`, { status });

      setApplications((prev) =>
        prev.map((application) =>
          application.id === applicationId ? { ...application, status } : application,
        ),
      );

      if (status === 'interview') {
        toast.success('Moved to interview stage');
      } else if (status === 'hired') {
        toast.success('Candidate accepted');
      } else {
        toast.success('Application rejected');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update application status';
      toast.error(message);
    } finally {
      setUpdatingStatusFor(null);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-6">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl md:text-[44px] leading-[1.05] font-black tracking-tight text-black">Applications</h1>
          <p className="mt-2 text-xl leading-tight text-black/80">Review and manage candidate applications</p>
        </div>
      </section>

        <div className="rounded-2xl p-4 sm:p-6 space-y-6" style={{ backgroundColor: '#ece9e2' }}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative max-w-sm">
          <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 text-sm" />
          <input
            type="text"
            placeholder="Search by candidate name or job..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-black/5 text-black placeholder-black/40 font-medium focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0 lg:ml-auto scrollbar-none">
          <div className="flex items-center gap-1 bg-black rounded-full p-1.5">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleStatusChange(filter.value)}
                className={`px-4 py-1.5 rounded-full font-bold text-[11px] whitespace-nowrap transition-all ${
                  selectedStatus === filter.value
                    ? 'bg-lime-300 text-black shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 animate-pulse">
                <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-1/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                </div>
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 p-12 sm:p-20 text-center bg-white/50">
          <div className="mx-auto w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4">
            <FaMagnifyingGlass className="text-black/20 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-black mb-2">No applications found</h3>
          <p className="text-sm text-black/60 max-w-xs mx-auto">
            {searchQuery || selectedStatus 
              ? "We couldn't find any applications matching your current filters."
              : "You haven't received any applications yet. Make sure your job listings are active."}
          </p>
          {(searchQuery || selectedStatus) && (
            <button 
              onClick={() => { setSearchQuery(''); setSelectedStatus(''); }}
              className="mt-6 text-sm font-bold text-black underline underline-offset-4 hover:text-lime-600"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="group rounded-2xl border border-black/5 bg-white p-5 sm:p-6 hover:shadow-xl hover:shadow-black/5 transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {/* Candidate Photo */}
                <div className="flex-shrink-0">
                  {app.photo_url ? (
                    <img
                      src={resolveAssetUrl(app.photo_url) || ''}
                      alt={app.name || 'Candidate'}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-50 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl font-bold text-slate-400 border-2 border-slate-50 shadow-sm">
                      {app.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                  )}
                </div>

                {/* Content + Actions */}
                <div className="flex-1 w-full min-w-0">
                  {/* Name and Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-black text-black truncate max-w-[200px]">{app.name || 'Candidate'}</h3>
                        <div className="flex items-center gap-2">
                            <span
                            className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                                statusBadgeClass[app.status.toLowerCase()] ||
                                'bg-slate-100 text-slate-700'
                            }`}
                            >
                            {statusLabelMap[app.status.toLowerCase()] ||
                                app.status.toUpperCase()}
                            </span>
                            
                            {/* ATS Score Badge */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <ATSScoreBadge score={app.ats_score} />
                                {app.ats_score != null && (
                                    <button
                                        onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}
                                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2 py-0.5 rounded transition-colors bg-blue-50 hover:bg-blue-100"
                                    >
                                        {expandedAppId === app.id ? 'Hide Fit' : 'Candidate Fit'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setExpandedAppId(expandedAppId === `${app.id}_insights` ? null : `${app.id}_insights`)}
                                    className="text-[10px] text-[#1a1a1a] hover:text-slate-600 font-bold px-2 py-0.5 rounded transition-colors bg-[#f4f1ea] hover:bg-[#e8e4dc]"
                                >
                                    {expandedAppId === `${app.id}_insights` ? 'Hide AI' : 'Review AI Insights'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest">Applied {formatRelative(app.created_at)}</p>
                  </div>

                  {/* Job Title */}
                  <p className="text-[15px] font-bold text-black/70 mb-4">
                    {app.job_title}
                  </p>

                  {/* Skills */}
                  {app.skills && app.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {app.skills.slice(0, 5).map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-black bg-black/5 text-black/60 px-2.5 py-1 rounded-lg uppercase tracking-tight"
                        >
                          {skill}
                        </span>
                      ))}
                      {app.skills.length > 5 && (
                          <span className="text-[10px] font-black text-black/30 px-1 py-1 uppercase tracking-tight">+{app.skills.length - 5} more</span>
                      )}
                    </div>
                  )}

                  {/* Actions — full width row on mobile */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/5">
                    <Link href={ROUTES.recruiterApplicationDetail(app.id)} className="flex-1 sm:flex-none">
                      <button className="w-full sm:w-auto px-5 py-2.5 bg-black text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95">
                        View Profile
                      </button>
                    </Link>
                    {(app.status.toLowerCase() === 'applied' || app.status.toLowerCase() === 'in_review') && (
                      <>
                        <button
                          onClick={() => void handleUpdateApplicationStatus(app.id, 'interview')}
                          disabled={updatingStatusFor === `${app.id}:interview`}
                          className="px-5 py-2.5 bg-lime-300 text-black text-xs font-black rounded-xl hover:bg-lime-400 transition-all disabled:opacity-60 active:scale-95"
                        >
                          {updatingStatusFor === `${app.id}:interview` ? 'Wait...' : 'Shortlist'}
                        </button>
                        <button
                          onClick={() => void handleUpdateApplicationStatus(app.id, 'rejected')}
                          disabled={updatingStatusFor === `${app.id}:rejected`}
                          className="px-5 py-2.5 bg-slate-100 text-slate-600 text-xs font-black rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all disabled:opacity-60 active:scale-95"
                        >
                          {updatingStatusFor === `${app.id}:rejected` ? 'Wait...' : 'Reject'}
                        </button>
                      </>
                    )}
                    {app.status.toLowerCase() === 'interview' && (
                      <>
                        <button
                          onClick={() => void handleUpdateApplicationStatus(app.id, 'hired')}
                          disabled={updatingStatusFor === `${app.id}:hired`}
                          className="px-5 py-2.5 bg-lime-300 text-black text-xs font-black rounded-xl hover:bg-lime-400 transition-all disabled:opacity-60 active:scale-95"
                        >
                          {updatingStatusFor === `${app.id}:hired` ? 'Wait...' : 'Hire Candidate'}
                        </button>
                        <button
                          onClick={() => void handleUpdateApplicationStatus(app.id, 'rejected')}
                          disabled={updatingStatusFor === `${app.id}:rejected`}
                          className="px-5 py-2.5 bg-slate-100 text-slate-600 text-xs font-black rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all disabled:opacity-60 active:scale-95"
                        >
                          {updatingStatusFor === `${app.id}:rejected` ? 'Wait...' : 'Reject'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => void handleMessageApplicant(app)}
                      disabled={openingConversationFor === app.id}
                      className="ml-auto p-2.5 border border-black/10 text-black rounded-xl hover:bg-black hover:text-white transition-all disabled:opacity-60 active:scale-95"
                      title="Message Candidate"
                    >
                      <FaComments className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded ATS Panel */}
              {expandedAppId === app.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <ATSInsightsPanel 
                        score={app.ats_score} 
                        breakdown={app.ats_breakdown} 
                        perspective="recruiter" 
                    />
                </div>
              )}

              {/* Expanded Recruiter AI Insights Panel */}
              {expandedAppId === `${app.id}_insights` && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <RecruiterInsightsReviewPanel
                    applicationId={app.id}
                    fitInsights={app.fit_insights}
                    improvementSuggestions={app.improvement_suggestions}
                    rejectionReason={app.rejection_reason}
                    insightsApproved={app.insights_approved}
                    insightsGeneratedAt={app.insights_generated_at}
                    onApproved={() => setExpandedAppId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
