'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ROUTES } from '@/constants';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { Modal } from '@/components/ui';
import { api } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { useAuthStore } from '@/store/auth.store';
import { useNotifications } from '@/hooks/useNotifications';
import {
  FaHouse,
  FaBriefcase,
  FaUsers,
  FaComments,
  FaChartLine,
  FaCreditCard,
  FaBell,
  FaMagnifyingGlass,
  FaArrowRightFromBracket,
  FaXmark,
  FaCode,
  FaBullhorn,
} from 'react-icons/fa6';

type RecruiterSearchJob = {
  id: string;
  title: string;
};

type RecruiterSearchApplicant = {
  id: string;
  name: string | null;
  email?: string | null;
  job_title?: string | null;
};

type RecruiterSearchResult =
  | {
      key: string;
      type: 'job';
      label: string;
      meta: string;
      href: string;
    }
  | {
      key: string;
      type: 'applicant';
      label: string;
      meta: string;
      href: string;
    };

interface RecruiterNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const recruiterNav: RecruiterNavItem[] = [
  { label: 'Home', href: ROUTES.recruiterDashboard, icon: FaHouse },
  { label: 'My Jobs', href: ROUTES.recruiterJobs, icon: FaBriefcase },
  { label: 'Applicants', href: ROUTES.recruiterApplications, icon: FaUsers },
  { label: 'Messages', href: ROUTES.recruiterMessages, icon: FaComments },
  { label: 'Analytics', href: ROUTES.recruiterAnalytics, icon: FaChartLine },
  { label: 'Assessments', href: ROUTES.recruiterAssessments, icon: FaCode },
  { label: 'Problems', href: ROUTES.recruiterProblems, icon: FaCode },
  { label: 'Collections', href: ROUTES.recruiterCollections, icon: FaCode },
  { label: 'Broadcasts', href: ROUTES.recruiterBroadcasts, icon: FaBullhorn },
];


function RecruiterFloatingSidebar() {
  const pathname = usePathname();
  const { user, logoutWithApi } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfileAvatar = async () => {
      try {
        const res = await api.get<any>('/users/me');
        const profile = res.data?.profile;
        const raw = profile?.logo_url || profile?.photo_url || null;
        if (mounted) {
          setAvatarUrl(resolveAssetUrl(raw));
        }
      } catch {
        if (mounted) {
          setAvatarUrl(null);
        }
      }
    };

    void loadProfileAvatar();

    return () => {
      mounted = false;
    };
  }, [pathname, user?.role]);

  useEffect(() => {
    let mounted = true;

    const loadBalance = async () => {
      try {
        const res = await api.get<{ balance: number }>('/credits/balance');
        if (mounted) {
          setCreditBalance(res.data?.balance ?? 0);
        }
      } catch {
        if (mounted) {
          setCreditBalance(0);
        }
      }
    };

    loadBalance();
    const timer = setInterval(loadBalance, 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await logoutWithApi();
    setIsLoggingOut(false);
  };

  const [isHovered, setIsHovered] = useState(false);
  const [isHoveredBottom, setIsHoveredBottom] = useState(false);

  const userInitial = user?.email?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const profileActive = pathname === ROUTES.recruiterProfile || pathname.startsWith(`${ROUTES.recruiterProfile}/`);

  return (
    <>
      <aside 
        className={`hidden lg:flex fixed left-4 xl:left-8 top-[calc(50%-4rem)] -translate-y-1/2 z-40 flex-col gap-3 transition-all duration-300 ease-in-out ${isHovered ? 'w-48 items-stretch' : 'w-16 items-center'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="bg-[#1a1a1a] rounded-[24px] py-2.5 px-2.5 flex flex-col gap-1 shadow-2xl">
          {recruiterNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isHovered ? undefined : item.label}
                className={`h-11 rounded-full flex items-center transition-colors overflow-hidden ${
                  isHovered ? 'px-4 justify-start' : 'w-11 justify-center'
                } ${
                  active ? 'bg-lime-400 text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="text-base shrink-0" />
                <span 
                  className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                    isHovered ? 'ml-3 w-auto opacity-100' : 'w-0 opacity-0 ml-0'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>

      <aside 
        className={`hidden lg:flex fixed left-4 xl:left-8 bottom-8 z-40 flex-col transition-all duration-300 ease-in-out ${isHoveredBottom ? 'w-48 items-stretch' : 'w-16 items-center'}`}
        onMouseEnter={() => setIsHoveredBottom(true)}
        onMouseLeave={() => setIsHoveredBottom(false)}
      >
        <div className="bg-[#1a1a1a] rounded-[24px] py-3 px-2.5 flex flex-col gap-1 shadow-2xl">
          <Link
            href={ROUTES.recruiterCredits}
            title={isHoveredBottom ? undefined : 'Credits'}
            className={`h-11 rounded-full flex items-center transition-colors overflow-hidden ${
              isHoveredBottom ? 'px-4 justify-start' : 'w-11 justify-center'
            } ${pathname === ROUTES.recruiterCredits ? 'bg-lime-400 text-black' : 'text-lime-300 hover:bg-white/10'}`}
          >
            <FaCreditCard className="text-base shrink-0" />
            <div className={`flex flex-col ml-3 transition-all duration-300 ${isHoveredBottom ? 'w-auto opacity-100' : 'w-0 opacity-0 ml-0'}`}>
              <span className="text-[13px] font-semibold tracking-wide whitespace-nowrap text-white">Credits</span>
              <span className="text-[10px] font-bold text-lime-300 leading-none">{creditBalance}</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            title={isHoveredBottom ? undefined : 'Logout'}
            className={`h-11 rounded-full text-white/70 hover:text-white flex items-center transition-colors overflow-hidden ${
              isHoveredBottom ? 'px-4 justify-start hover:bg-white/5' : 'w-11 justify-center hover:bg-white/10'
            }`}
          >
            <FaArrowRightFromBracket className="text-base shrink-0" />
            <span 
              className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                isHoveredBottom ? 'ml-3 w-auto opacity-100' : 'w-0 opacity-0 ml-0'
              }`}
            >
              Sign Out
            </span>
          </button>

          <Link
            href={ROUTES.recruiterProfile}
            title={isHoveredBottom ? undefined : 'Profile'}
            className={`h-11 rounded-full border-2 transition-colors flex items-center overflow-hidden ${
              isHoveredBottom ? 'pl-0.5 pr-4 justify-start border-transparent hover:bg-white/10' : 'w-11 justify-center'
            } ${profileActive ? 'bg-lime-400 text-black border-lime-400' : 'bg-blue-700 text-white border-black hover:bg-blue-600'}`}
          >
            <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-slate-700 text-white text-xs font-semibold">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
            <span 
              className={`text-[13px] font-semibold tracking-wide whitespace-nowrap text-white/90 transition-all duration-300 ${
                isHoveredBottom ? 'ml-3 w-auto opacity-100' : 'w-0 opacity-0 ml-0'
              }`}
            >
              Profile
            </span>
          </Link>
        </div>
      </aside>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a]">
        <div className="flex items-center justify-around px-3 h-[68px]">
          {recruiterNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} title={item.label} className="flex flex-col items-center gap-1 py-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    active ? 'bg-lime-400 text-black' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Icon className="text-[17px]" />
                </div>
                <span className={`text-[9px] font-semibold leading-none ${active ? 'text-lime-400' : 'text-white/40'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div 
            className="bg-black rounded-[24px] flex flex-col justify-center items-center text-center p-8"
            style={{ width: '479px', height: '293px', boxShadow: '0px 0px 50px 0px #00000040' }}
          >
            <h3 className="text-[32px] font-bold text-white mb-4" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Log Out?</h3>
            <p className="text-white text-[14px] leading-tight max-w-[360px] mb-8" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
              Your progress is saved. Come back anytime to track your candidate applications.
            </p>
            <div className="flex items-center justify-center gap-12 w-full px-8">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="w-[120px] py-2.5 rounded-[12px] border-[0.8px] border-white/40 text-white text-[16px] hover:bg-white/10 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="w-[120px] py-2.5 rounded-[12px] bg-[#C3FF3D] text-black text-[16px] font-semibold hover:bg-[#aee62d] transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
              >
                {isLoggingOut ? 'Wait...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecruiterSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [bellActive, setBellActive] = useState(false);

  const closeSearch = () => {
    setSearchActive(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearchResultSelect = (result: RecruiterSearchResult) => {
    router.push(result.href);
    closeSearch();
  };

  const handleLogoClick = () => {
    closeSearch();
    setBellActive(false);
    router.push(ROUTES.recruiterDashboard);
  };

  const handleSearchSubmit = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (searchResults.length > 0) {
      handleSearchResultSelect(searchResults[0]);
      return;
    }

    router.push(`/recruiter/dashboard?keyword=${encodeURIComponent(trimmed)}`);
    closeSearch();
  };

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!searchActive || query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const [jobsRes, applicantsRes] = await Promise.all([
          api.getPaginated<RecruiterSearchJob>('/jobs/my/listings?limit=100'),
          api.getPaginated<RecruiterSearchApplicant>('/applications/recruiter/applicants?limit=100'),
        ]);

        if (cancelled) return;

        const jobs = (jobsRes.data || [])
          .filter((job) => (job.title || '').toLowerCase().includes(query))
          .slice(0, 5)
          .map<RecruiterSearchResult>((job) => ({
            key: `job:${job.id}`,
            type: 'job',
            label: job.title,
            meta: 'Job Posting',
            href: ROUTES.recruiterJobDetail(job.id),
          }));

        const applicants = (applicantsRes.data || [])
          .filter((applicant) => {
            const name = (applicant.name || '').toLowerCase();
            const email = (applicant.email || '').toLowerCase();
            const jobTitle = (applicant.job_title || '').toLowerCase();
            return name.includes(query) || email.includes(query) || jobTitle.includes(query);
          })
          .slice(0, 5)
          .map<RecruiterSearchResult>((applicant) => ({
            key: `applicant:${applicant.id}`,
            type: 'applicant',
            label: applicant.name || applicant.email || 'Applicant',
            meta: applicant.job_title ? `Applicant • ${applicant.job_title}` : 'Applicant',
            href: ROUTES.recruiterApplicationDetail(applicant.id),
          }));

        setSearchResults([...jobs, ...applicants].slice(0, 8));
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchActive, searchQuery]);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      if (currentY <= 8) {
        setIsHeaderVisible(true);
      } else if (delta > 6) {
        setIsHeaderVisible(false);
      } else if (delta < -6) {
        setIsHeaderVisible(true);
      }

      lastY = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <AuthGuard allowedRoles={['recruiter']}>
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-[#f9fbf4] to-[#eef7d8]">
        <header
          className={`fixed inset-x-0 top-0 z-40 px-4 sm:px-6 lg:px-10 py-4 bg-[#f7f7f7]/90 backdrop-blur-sm transition-transform duration-300 ${
            isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={handleLogoClick}
              className="inline-flex items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-[#f7f7f7]"
            >
              <Image src="/logo.png" alt="Jobyt" width={28} height={28} className="object-contain" />
              <span className="font-display text-xl font-bold text-slate-900 tracking-tight">Jobyt</span>
            </button>

            {/* Right Actions — Desktop/Tablet */}
            <div className="hidden sm:flex items-center gap-3">
              {searchActive ? (
                /* STATE: Search active — black pill wrapping lime search + black bell */
                <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 p-1.5 gap-0 min-w-[300px] relative">
                  {/* Lime search area */}
                  <div className="flex items-center flex-1 bg-lime-400 rounded-full h-full px-4 gap-2.5">
                    <FaMagnifyingGlass className="text-black/70 text-sm shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) handleSearchSubmit(searchQuery.trim()); }}
                      placeholder="Search jobs, applicants..."
                      autoFocus
                      className="flex-1 bg-transparent text-black placeholder-black/40 text-sm font-semibold outline-none min-w-0"
                    />
                    <button
                      onClick={closeSearch}
                      className="text-black/50 hover:text-black transition-colors"
                    >
                      <FaXmark className="text-sm" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 ml-1 pl-1 relative">
                    <button
                      onClick={() => setBellActive(!bellActive)}
                      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        bellActive ? 'bg-lime-400 text-black' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      <FaBell className="text-lg" />
                    </button>
                    {bellActive && <RecruiterNotificationPopover />}
                  </div>

                  {(searchLoading || searchResults.length > 0 || searchQuery.trim().length >= 2) && (
                    <div className="absolute left-0 right-0 top-[62px] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-[60]">
                      {searchLoading ? (
                        <p className="px-3 py-2 text-xs text-slate-500">Searching...</p>
                      ) : searchResults.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-500">No matches found.</p>
                      ) : (
                        <div className="space-y-1 max-h-72 overflow-y-auto">
                          {searchResults.map((result) => (
                            <button
                              key={result.key}
                              type="button"
                              onClick={() => handleSearchResultSelect(result)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <p className="text-sm font-semibold text-slate-900">{result.label}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{result.meta}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* STATE: Default / Notification — solid black pill */
                <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 px-2 gap-1 relative">
                  <button
                    onClick={() => setSearchActive(true)}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  >
                    <FaMagnifyingGlass className="text-base" />
                  </button>
                  <button
                    onClick={() => setBellActive(!bellActive)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                      bellActive
                        ? 'bg-lime-400 text-black'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    <FaBell className="text-lg" />
                  </button>
                  {bellActive && <RecruiterNotificationPopover />}
                </div>
              )}
            </div>

            {/* Mobile: Simplified search + notification */}
            <div className="sm:hidden flex items-center gap-2 relative">
              <button
                onClick={() => setSearchActive(true)}
                className="w-10 h-10 rounded-full bg-[#1a1a1a] text-white/80 flex items-center justify-center hover:text-white transition-colors"
                title="Search"
              >
                <FaMagnifyingGlass className="text-sm" />
              </button>
              <button
                onClick={() => setBellActive(!bellActive)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  bellActive ? 'bg-lime-400 text-black' : 'bg-[#1a1a1a] text-white/80 hover:text-white'
                }`}
                title="Notifications"
              >
                <FaBell className="text-sm" />
              </button>
              {bellActive && <RecruiterNotificationPopover />}
            </div>
          </div>

          {/* Mobile Search Modal */}
          {searchActive && (
            <div className="mt-4 sm:hidden">
              <div className="flex items-center bg-[#1a1a1a] rounded-full h-12 px-4 gap-2">
                <FaMagnifyingGlass className="text-white/60 text-sm shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) handleSearchSubmit(searchQuery.trim()); }}
                  placeholder="Search jobs, applicants..."
                  autoFocus
                  className="flex-1 bg-transparent text-white placeholder-white/40 text-sm font-medium outline-none min-w-0"
                />
                <button
                  onClick={closeSearch}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <FaXmark className="text-sm" />
                </button>
              </div>

              {(searchLoading || searchResults.length > 0 || searchQuery.trim().length >= 2) && (
                <div className="mt-2 rounded-2xl bg-white border border-slate-200 shadow-xl p-2">
                  {searchLoading ? (
                    <p className="px-3 py-2 text-xs text-slate-500">Searching...</p>
                  ) : searchResults.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-500">No matches found.</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.key}
                          type="button"
                          onClick={() => handleSearchResultSelect(result)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <p className="text-sm font-semibold text-slate-900">{result.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{result.meta}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        <RecruiterFloatingSidebar />

        <main className="pt-24 lg:pl-24 xl:pl-28 pb-24 lg:pb-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

const RecruiterNotificationPopover = () => {
  const { notifications, unread, isLoading, fetchNotifications, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    void fetchNotifications(1);
  }, [fetchNotifications]);

  const handleNotificationClick = async (id: string, actionUrl?: string | null, read?: boolean) => {
    if (!read) {
      await markRead(id);
    }
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  };
  
  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="absolute right-0 top-14 sm:top-16 mt-1 w-[340px] max-w-[calc(100vw-32px)] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-5 z-50 animate-in fade-in slide-in-from-top-2 text-left cursor-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-display font-medium text-slate-900">Notifications {unread > 0 ? `(${unread})` : ''}</h3>
        {unread > 0 && (
          <button
            onClick={() => void markAllRead()}
            className="text-xs font-semibold text-lime-700 hover:text-lime-800"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {isLoading ? (
          <p className="text-sm text-slate-500 py-4 text-center">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No notifications yet.</p>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              onClick={() => void handleNotificationClick(notif.id, notif.action_url, notif.read)}
              className="w-full text-left bg-[#f8f6f0] rounded-[16px] p-4 flex items-start gap-3 hover:bg-[#f1eee6] transition-colors"
            >
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-[#d9d9d9]' : 'bg-[#c1f237]'}`} />
              <div>
                <p className="text-slate-800 text-[13px] leading-snug font-semibold">{notif.title}</p>
                <p className="text-slate-600 text-[12px] leading-snug mt-1">{notif.body}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
