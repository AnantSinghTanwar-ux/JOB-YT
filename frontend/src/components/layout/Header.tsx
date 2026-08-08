'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants';
import { useNotifications } from '@/hooks/useNotifications';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FaArrowRightFromBracket,
} from 'react-icons/fa6';
import { NotificationDropdown } from '../notifications/NotificationDropdown';

export const Header = () => {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-sm">
            <div className="mx-auto flex h-16 max-w-full items-center justify-between px-6">
                {/* Logo */}
                <Link href="/" className="shrink-0 flex items-center cursor-pointer group">
                    <Image src="/logo.png" alt="Jobyt" width={22} height={22} className="mr-2 object-contain" />
                    <span className="font-display text-xl font-bold text-slate-900 tracking-tight">Jobyt</span>
                </Link>

                {/* Right Actions */}
                {user ? (
                    <div className="flex items-center gap-3">
                        {/* Notification Bell Dropdown */}
                        <NotificationDropdown />

                        <div className="h-8 w-px bg-slate-200" />

                        {/* User Avatar */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-brand-primary text-sm font-bold shadow-md">
                                {(user.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-sm font-semibold text-slate-800 leading-none">
                                    {user.email?.split('@')[0] || 'User'}
                                </p>
                                <p className="text-[11px] text-slate-400 capitalize mt-0.5">{user.role}</p>
                            </div>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="Sign out"
                        >
                            <FaArrowRightFromBracket className="text-sm" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Link
                            href={ROUTES.login}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                        >
                            Sign in
                        </Link>
                        <Link
                            href={ROUTES.register}
                            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-primary hover:text-slate-900 transition-all shadow-sm"
                        >
                            Get started
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
};
