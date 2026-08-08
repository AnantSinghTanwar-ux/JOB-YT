'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import {
    FaHouse,
    FaMagnifyingGlass,
    FaFileLines,
    FaBookmark,
    FaComments,
    FaCreditCard,
    FaGift,
    FaCircleUser,
    FaBriefcase,
    FaChartLine,
    FaUsers,
    FaCoins,
    FaMapLocationDot,
    FaBolt,
    FaClockRotateLeft,
    FaBook,
} from 'react-icons/fa6';
import { IconType } from 'react-icons';

interface NavItem { label: string; href: string; icon: IconType; }

const applicantNav: NavItem[] = [
    { label: 'Dashboard', href: ROUTES.dashboard, icon: FaHouse },
    { label: 'Find Jobs', href: ROUTES.jobs, icon: FaMagnifyingGlass },
    { label: 'Applications', href: ROUTES.applications, icon: FaFileLines },
    { label: 'Auto-Apply', href: ROUTES.autoApply, icon: FaBolt },
    { label: 'Saved Jobs', href: ROUTES.savedJobs, icon: FaBookmark },
    { label: 'Messages', href: ROUTES.messages, icon: FaComments },
    { label: 'Referrals', href: ROUTES.referral, icon: FaGift },
    { label: 'Community', href: ROUTES.community, icon: FaUsers },
    { label: 'Roadmaps', href: ROUTES.roadmaps, icon: FaMapLocationDot },
    { label: 'Resume Builder', href: ROUTES.resumeBuilder, icon: FaFileLines },
    { label: 'Subscriptions', href: '/subscriptions', icon: FaCreditCard },
    { label: 'Profile', href: ROUTES.profile, icon: FaCircleUser },
];

const recruiterNav: NavItem[] = [
    { label: 'Dashboard', href: ROUTES.recruiterDashboard, icon: FaHouse },
    { label: 'My Jobs', href: ROUTES.recruiterJobs, icon: FaBriefcase },
    { label: 'Applicants', href: ROUTES.recruiterApplications, icon: FaUsers },
    { label: 'Messages', href: ROUTES.recruiterMessages, icon: FaComments },
    { label: 'Analytics', href: ROUTES.recruiterAnalytics, icon: FaChartLine },
    { label: 'Roadmaps', href: ROUTES.roadmaps, icon: FaMapLocationDot },
    { label: 'Subscriptions', href: '/subscriptions', icon: FaCreditCard },
    { label: 'API Docs', href: '/docs', icon: FaBook },
];

const adminNav: NavItem[] = [
    { label: 'Dashboard', href: ROUTES.adminDashboard, icon: FaHouse },
    { label: 'Users', href: ROUTES.adminUsers, icon: FaUsers },
    { label: 'Jobs', href: ROUTES.adminJobs, icon: FaBriefcase },
    { label: 'Post Job', href: ROUTES.adminPostJob, icon: FaBriefcase },
    { label: 'Approvals', href: ROUTES.adminJobApprovals, icon: FaChartLine },
    { label: 'Applications', href: ROUTES.adminApplications, icon: FaFileLines },
    { label: 'Messages', href: ROUTES.adminMessages, icon: FaComments },
    { label: 'Roadmaps', href: ROUTES.roadmaps, icon: FaMapLocationDot },
    { label: 'Credits', href: ROUTES.adminCredits, icon: FaCoins },
    { label: 'Activity', href: ROUTES.adminActivity, icon: FaClockRotateLeft },
    { label: 'API Docs', href: '/docs', icon: FaBook },
];

export const Sidebar = () => {
    const { user } = useAuthStore();
    const pathname = usePathname();

    const nav =
        user?.role === 'recruiter' ? recruiterNav :
            user?.role === 'admin' ? adminNav :
                applicantNav;

    const roleLabel =
        user?.role === 'recruiter' ? 'Recruiter' :
            user?.role === 'admin' ? 'Admin' :
                'Applicant';

    const roleBadgeColor =
        user?.role === 'recruiter' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            user?.role === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                'bg-brand-primary/20 text-brand-primary border-brand-primary/30';

    return (
        <aside className="flex h-full w-60 flex-col bg-slate-900 border-r border-slate-800 px-3 py-5 shrink-0">
            {/* Role Badge */}
            <div className="px-3 mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${roleBadgeColor}`}>
                    {roleLabel}
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 flex-1">
                {nav.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative group',
                                isActive
                                    ? 'bg-brand-primary/15 text-brand-primary'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-primary rounded-r-full" />
                            )}
                            <Icon className={cn(
                                'text-base shrink-0 transition-transform duration-200 group-hover:scale-110',
                                isActive ? 'text-brand-primary' : ''
                            )} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Branding */}
            <div className="mt-auto pt-4 border-t border-slate-800 px-3">
                <div className="flex items-center gap-2 opacity-40">
                    <Image src="/logo.png" alt="Jobyt" width={16} height={16} className="object-contain" />
                    <span className="font-display text-xs font-bold text-white tracking-tight">
                        Jobyt
                    </span>
                </div>
            </div>
        </aside>
    );
};
