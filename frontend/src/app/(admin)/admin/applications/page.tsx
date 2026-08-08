'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { createConversation } from '@/lib/messages';

interface AdminApplication {
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

export default function AdminApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRequestRef = useRef(0);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [openingConversationFor, setOpeningConversationFor] = useState<string | null>(null);
  const [updatingStatusFor, setUpdatingStatusFor] = useState<string | null>(null);
  const selectedJobId = searchParams.get('jobId') || '';

  const fetchApplications = useCallback(async () => {
    const requestId = ++activeRequestRef.current;
    setLoading(true);
    try {
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
          api.getPaginated<AdminApplication>(`/admin/applications?${rejectedParams.toString()}&limit=50`),
          api.getPaginated<AdminApplication>(`/admin/applications?${hiredParams.toString()}&limit=50`),
          api.getPaginated<AdminApplication>(`/admin/applications?${offerParams.toString()}&limit=50`),
        ]);
        const combined = [
          ...(rejectedRes.data ?? []),
          ...(hiredRes.data ?? []),
          ...(offerRes.data ?? []),
        ];
        
        let filtered = combined;
        // Search client-side if a query exists
        if (searchQuery.trim()) {
          const searchLower = searchQuery.trim().toLowerCase();
          filtered = combined.filter((app) => {
            const name = (app.name || '').toLowerCase();
            const email = (app.email || '').toLowerCase();
            const title = (app.job_title || '').toLowerCase();
            return name.includes(searchLower) || email.includes(searchLower) || title.includes(searchLower);
          });
        }
        
        if (requestId === activeRequestRef.current) {
          setApplications(filtered);
        }
      } else {
        if (selectedStatus) params.append('status', selectedStatus);
        if (searchQuery) {
          // Send as generic search, checking name, title, and email server-side
          params.append('search', searchQuery);
        }
        if (selectedJobId) {
          params.append('jobId', selectedJobId);
        }
        
        const res = await api.getPaginated<AdminApplication>(
          `/admin/applications?${params.toString()}&limit=50`
        );
        if (requestId === activeRequestRef.current) {
          setApplications(res.data ?? []);
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
  }, [selectedStatus, searchQuery, selectedJobId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleMessageApplicant = useCallback(async (app: AdminApplication) => {
    if (!app.applicant_id) {
      toast.error('Applicant is not available for messaging');
      return;
    }

    setOpeningConversationFor(app.id);
    try {
      const conversationId = await createConversation(app.applicant_id, app.job_id);
      router.push(`${ROUTES.adminMessages}?conversationId=${conversationId}`);
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
      // Points exactly to new admin route PATCH /admin/applications/:id/status
      await api.patch(`/admin/applications/${applicationId}/status`, { status });

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
    <div>
      <div className="max-w-6xl mx-auto pb-6 pt-6 px-4">
        <section className="mb-8">
          <h1 className="text-[44px] leading-[1.05] font-black tracking-tight text-slate-900">Platform Applications</h1>
          <p className="mt-2 text-xl leading-tight text-slate-600">Review and manage candidate applications globally across all jobs.</p>
        </section>

        <div className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: '#ffffff' }}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative max-w-xs">
          <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search Applicant Name"
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-slate-100 text-slate-900 placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto lg:ml-auto">
          <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1.5 border border-slate-200">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleStatusChange(filter.value)}
                className={`px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
                  selectedStatus === filter.value
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
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
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-slate-50">
          <p className="text-sm text-slate-500">No applications found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Candidate Photo */}
                <div className="flex-shrink-0">
                  {app.photo_url ? (
                    <img
                      src={resolveAssetUrl(app.photo_url) || ''}
                      alt={app.name || 'Candidate'}
                      className="w-16 h-16 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg font-bold text-white">
                      {app.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                  )}
                </div>

                {/* Left Content */}
                <div className="flex-1">
                  {/* Name and Status */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-black text-slate-900">{app.name || 'Candidate'}</h3>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        statusBadgeClass[app.status.toLowerCase()] ||
                        'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {statusLabelMap[app.status.toLowerCase()] ||
                        app.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Job Title */}
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    {app.job_title}
                  </p>

                  {/* Contact & Education Row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-2">
                    {app.email && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">✉</span>
                        <a href={`mailto:${app.email}`} className="hover:text-slate-900">
                          {app.email}
                        </a>
                      </div>
                    )}
                    {app.phone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">📞</span>
                        <a href={`tel:${app.phone}`} className="hover:text-slate-900">
                          {app.phone}
                        </a>
                      </div>
                    )}
                    {getEducationDisplay(app.education) && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">🎓</span>
                        <span>{getEducationDisplay(app.education)}</span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {app.skills && app.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {app.skills.slice(0, 4).map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Applied Time */}
                  <p className="text-xs text-slate-500">Applied {formatRelative(app.created_at)}</p>
                </div>

                {/* Right Actions */}
                <div className="flex-shrink-0 flex flex-col gap-2 ml-auto">
                  <Link href={ROUTES.adminApplicationDetail(app.id)}>
                    <button className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors">
                      View Details
                    </button>
                  </Link>
                  {(app.status.toLowerCase() === 'applied' || app.status.toLowerCase() === 'in_review') && (
                    <>
                      <button
                        onClick={() => void handleUpdateApplicationStatus(app.id, 'interview')}
                        disabled={updatingStatusFor === `${app.id}:interview`}
                        className="px-4 py-2 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {updatingStatusFor === `${app.id}:interview` ? 'Updating...' : 'Interview'}
                      </button>
                      <button
                        onClick={() => void handleUpdateApplicationStatus(app.id, 'rejected')}
                        disabled={updatingStatusFor === `${app.id}:rejected`}
                        className="px-4 py-2 border border-slate-300 text-rose-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {updatingStatusFor === `${app.id}:rejected` ? 'Updating...' : 'Reject'}
                      </button>
                    </>
                  )}
                  {app.status.toLowerCase() === 'interview' && (
                    <>
                      <button
                        onClick={() => void handleUpdateApplicationStatus(app.id, 'hired')}
                        disabled={updatingStatusFor === `${app.id}:hired`}
                        className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {updatingStatusFor === `${app.id}:hired` ? 'Updating...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => void handleUpdateApplicationStatus(app.id, 'rejected')}
                        disabled={updatingStatusFor === `${app.id}:rejected`}
                        className="px-4 py-2 border border-slate-300 text-rose-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {updatingStatusFor === `${app.id}:rejected` ? 'Updating...' : 'Reject'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => void handleMessageApplicant(app)}
                    disabled={openingConversationFor === app.id}
                    className="px-4 py-2 border border-blue-300 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {openingConversationFor === app.id ? 'Opening...' : 'Message'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
