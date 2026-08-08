'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { FaBell, FaMagnifyingGlass, FaXmark, FaUser, FaArrowRightFromBracket, FaBars, FaStar } from 'react-icons/fa6';
import { useNotifications } from '@/hooks/useNotifications';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';

interface DashboardHeaderProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    searchActive: boolean;
    onSearchToggle: (active: boolean) => void;
    onSearchSubmit?: (query: string) => void;
}

export function DashboardHeader({
    searchQuery,
    onSearchChange,
    searchActive,
    onSearchToggle,
    onSearchSubmit,
}: DashboardHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const logoutWithApi = useAuthStore((s) => s.logoutWithApi);
    const [bellActive, setBellActive] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);

    const handleMobileLogout = async () => {
        setMobileMenuOpen(false);
        setBellActive(false);
        await logoutWithApi();
        router.replace(ROUTES.login);
    };

    const { notifications, unread, isLoading, fetchNotifications, markRead, markAllRead } = useNotifications();

    // Auto-close search and notifications when navigating to a new page
    useEffect(() => {
        onSearchToggle(false);
        onSearchChange('');
        setBellActive(false);
        setMobileMenuOpen(false);
    }, [pathname, onSearchToggle, onSearchChange]);

    useEffect(() => {
        void fetchNotifications(1);
    }, [fetchNotifications]);

    useEffect(() => {
        lastScrollY.current = window.scrollY;

        const onScroll = () => {
            const currentY = window.scrollY;
            const delta = currentY - lastScrollY.current;

            if (currentY <= 8) {
                setIsHeaderVisible(true);
            } else if (delta > 6) {
                setIsHeaderVisible(false);
            } else if (delta < -6) {
                setIsHeaderVisible(true);
            }

            lastScrollY.current = currentY;
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 w-full bg-[#f7f7f7]/95 backdrop-blur-sm border-b border-black/5 transition-all duration-300 ${
                isHeaderVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
            }`}
        >
            {/* ── Row 1: Logo + search + notifications ── */}
            <div className="mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-10 h-16 md:h-20">
                {/* Logo */}
                <Link href={ROUTES.home} className="flex items-center gap-2 shrink-0">
                    <Image src="/logo.png" alt="Jobyt" width={28} height={28} className="object-contain" style={{ width: 'auto', height: 'auto' }} priority />
                    <span className="font-display text-xl font-bold text-slate-900 tracking-tight">Jobyt</span>
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-3">

                    {/* ── Desktop/Tablet: Black outer pill with 3 states ── */}
                    <div className="hidden sm:flex">
                        {searchActive ? (
                            /* STATE: Search active — black pill wrapping lime search + black bell */
                            <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 p-1.5 gap-0 min-w-[300px]">
                                {/* Lime search area */}
                                <div className="flex items-center flex-1 bg-[#c3ff3d] rounded-full h-full px-4 gap-2.5">
                                    <FaMagnifyingGlass className="text-black/70 text-sm shrink-0" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim() && onSearchSubmit) onSearchSubmit(searchQuery.trim()); }}
                                        placeholder="Search"
                                        autoFocus
                                        className="flex-1 bg-transparent text-black placeholder-black/40 text-sm font-semibold outline-none min-w-0"
                                    />
                                    <button
                                        onClick={() => { onSearchToggle(false); onSearchChange(''); }}
                                        className="text-black/50 hover:text-black transition-colors"
                                    >
                                        <FaXmark className="text-sm" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 ml-1 pl-1 relative">
                                    <button
                                        onClick={() => {
                                            const nextActive = !bellActive;
                                            setBellActive(nextActive);
                                            if (nextActive) onSearchToggle(false);
                                        }}
                                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors relative ${
                                            bellActive ? 'bg-[#c3ff3d] text-black' : 'text-white/80 hover:text-white'
                                        }`}
                                    >
                                        <FaBell className="text-lg" />
                                        {unread > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#c3ff3d] px-1 text-[10px] font-bold text-[#0b1120]">
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        )}
                                    </button>
                                    {bellActive && <NotificationPopover notifications={notifications} unread={unread} isLoading={isLoading} markRead={markRead} markAllRead={markAllRead} />}
                                </div>
                            </div>
                        ) : (
                            /* STATE: Default / Notification — solid black pill */
                            <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 px-2 gap-1 relative">
                                <button
                                    onClick={() => {
                                        onSearchToggle(true);
                                        setBellActive(false);
                                    }}
                                    className="w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                                >
                                    <FaMagnifyingGlass className="text-base" />
                                </button>
                                <button
                                    onClick={() => setBellActive(!bellActive)}
                                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors relative ${
                                        bellActive
                                            ? 'bg-[#c3ff3d] text-black'
                                            : 'text-white/80 hover:text-white'
                                    }`}
                                >
                                    <FaBell className="text-lg" />
                                    {unread > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#c3ff3d] px-1 text-[10px] font-bold text-[#0b1120]">
                                            {unread > 99 ? '99+' : unread}
                                        </span>
                                    )}
                                </button>
                                {bellActive && <NotificationPopover notifications={notifications} unread={unread} isLoading={isLoading} markRead={markRead} markAllRead={markAllRead} />}
                            </div>
                        )}
                    </div>

                    {/* Mobile: Profile Dropdown (Replaces Bell) */}
                    <div className="sm:hidden relative">
                        <button
                            onClick={() => {
                                setMobileMenuOpen((prev) => !prev);
                                setBellActive(false);
                            }}
                            className="w-11 h-11 bg-[#1a1a1a] rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                            aria-label="Open menu"
                        >
                            {mobileMenuOpen ? <FaXmark className="text-base" /> : <FaBars className="text-sm" />}
                        </button>

                        {/* Mobile Menu */}
                        {mobileMenuOpen && (
                            <div className="absolute right-0 top-14 mt-2 w-[min(88vw,340px)] bg-white rounded-2xl shadow-xl border border-slate-100 p-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center rounded-full h-12 p-1 bg-[#1a1a1a] gap-1 mb-3">
                                    <div className="flex items-center flex-1 px-3 gap-2">
                                        <FaMagnifyingGlass className="text-white/60 text-sm shrink-0" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                onSearchChange(e.target.value);
                                                onSearchToggle(Boolean(e.target.value));
                                            }}
                                            onFocus={() => setBellActive(false)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && searchQuery.trim() && onSearchSubmit) {
                                                    onSearchSubmit(searchQuery.trim());
                                                    setMobileMenuOpen(false);
                                                }
                                            }}
                                            placeholder="Search"
                                            className="flex-1 bg-transparent text-white placeholder-white/40 text-sm font-medium outline-none min-w-0"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setBellActive(!bellActive)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${
                                            bellActive ? 'bg-[#c3ff3d] text-black' : 'text-white/80 hover:text-white'
                                        }`}
                                        aria-label="Toggle notifications"
                                    >
                                        <FaBell className="text-base" />
                                        {unread > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-[#c3ff3d] px-1 text-[9px] font-bold text-[#0b1120]">
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <Link
                                        href="/credits"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700"
                                    >
                                        <FaStar className="text-slate-400" />
                                        Credits
                                    </Link>

                                    <Link
                                        href="/profile"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700"
                                    >
                                        <FaUser className="text-slate-400" />
                                        Profile
                                    </Link>

                                    <button
                                        onClick={() => {
                                            void handleMobileLogout();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <FaArrowRightFromBracket className="text-red-400" />
                                        Logout
                                    </button>
                                </div>

                                {bellActive && <NotificationPopover notifications={notifications} unread={unread} isLoading={isLoading} markRead={markRead} markAllRead={markAllRead} />}
                            </div>
                        )}
                    </div>

                </div>
            </div>

        </header>
    );
}

interface NotificationPopoverProps {
    notifications: any[];
    unread: number;
    isLoading: boolean;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
}

const NotificationPopover = ({ notifications, unread, isLoading, markRead, markAllRead }: NotificationPopoverProps) => {
    const [activeTab, setActiveTab] = useState('Today');

    const handleNotificationClick = async (id: string, actionUrl?: string | null, read?: boolean) => {
        if (!read) {
            await markRead(id);
        }
        if (actionUrl) {
            window.location.assign(actionUrl);
        }
    };

    const filteredNotifications = notifications.filter((notif) => {
        const created = new Date(notif.created_at);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        if (activeTab === 'Today') return created >= startOfToday;
        if (activeTab === 'This Week') return created >= startOfWeek && created < startOfToday;
        return created < startOfWeek;
    });
    return (
        <div 
            onClick={(e) => e.stopPropagation()} 
            className="absolute right-0 top-14 sm:top-16 mt-1 w-[399px] h-[276px] bg-white rounded-[14px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 pt-[21px] pr-[17.5px] pb-[14px] pl-[17.5px] z-50 animate-in fade-in slide-in-from-top-2 text-left cursor-auto flex flex-col gap-[16.8px]"
        >
            <div className="flex items-center justify-between shrink-0">
                <h3 className="text-[20px] font-display font-semibold text-slate-900 leading-none">Notifications {unread > 0 ? `(${unread})` : ''}</h3>
                {unread > 0 && (
                    <button
                        onClick={() => void markAllRead()}
                        className="text-xs font-semibold text-lime-700 hover:text-lime-800"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            <div className="flex bg-black rounded-[8px] p-1 shrink-0 h-[36px]">
                {['Today', 'This Week', 'Earlier'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 text-[13px] font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-[#c1f237] text-black' : 'text-[#c1f237] hover:bg-white/10'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="space-y-[10px] overflow-y-auto pr-1 flex-1">
                {isLoading ? (
                    <p className="text-sm text-slate-500 py-4 text-center">Loading notifications...</p>
                ) : filteredNotifications.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No notifications in this period.</p>
                ) : (
                    filteredNotifications.map((notif) => (
                        <button
                            key={notif.id}
                            type="button"
                            onClick={() => void handleNotificationClick(notif.id, notif.action_url, notif.read)}
                            className={`w-full text-left rounded-[10px] p-3.5 flex items-start gap-3 transition-colors ${notif.read ? 'bg-[#f5f5f5] hover:bg-[#ebebeb]' : 'bg-[#f4f9e3] hover:bg-[#edf4d8]'}`}
                        >
                            <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${notif.read ? 'bg-[#d9d9d9]' : 'bg-[#c1f237]'}`} />
                            <div className="flex-1">
                                <p className="text-slate-800 text-[12.5px] leading-[1.4] font-medium">{notif.title}</p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};
