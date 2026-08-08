'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';
import { FaBars, FaXmark, FaBell } from 'react-icons/fa6';

export function Navbar() {
    const { user } = useAuthStore();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [hash, setHash] = useState('');
    const pathname = usePathname();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Track hash changes
    useEffect(() => {
        const syncHash = () => setHash(window.location.hash);
        syncHash();
        window.addEventListener('hashchange', syncHash);
        return () => window.removeEventListener('hashchange', syncHash);
    }, [pathname]);

    const getDashboardRoute = () => {
        if (!user) return ROUTES.dashboard;
        if (user.role === 'recruiter') return ROUTES.recruiterDashboard;
        if (user.role === 'admin') return ROUTES.adminDashboard;
        return ROUTES.dashboard;
    };

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/internships', label: 'Internships' },
        { href: 'https://www.spazorlabs.com/', label: 'About Us' },
        { href: '/#pricing', label: 'Prices' },
    ];

    const isExternal = (href: string) => href.startsWith('http');

    const isActive = (href: string) => {
        // Hash-anchor link (e.g. /#pricing)
        if (href.startsWith('/#')) {
            const targetHash = href.slice(1); // "#pricing"
            return pathname === '/' && hash === targetHash;
        }
        // Home — only active when on / with NO hash
        if (href === '/') return pathname === '/' && !hash;
        // Normal routes
        return pathname.startsWith(href);
    };

    const handleNavClick = (href: string) => {
        // Clicking Home should clear hash
        if (href === '/') {
            setHash('');
            if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', '/');
            }
        }
        // Clicking a hash link should set hash
        if (href.startsWith('/#')) {
            setHash(href.slice(1));
        }
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 font-navbar ${
                scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-2' : 'bg-transparent py-2 md:py-4'
            }`}
        >
            <div className="relative max-w-350 mx-auto px-4 md:px-6 lg:px-8 flex items-center h-12 md:h-15">

                {/* LOGO */}
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/logo.png"
                        alt="Jobyt"
                        width={28}
                        height={28}
                        className="object-contain"
                    />
                    <span className="font-display text-xl font-bold text-slate-900 tracking-tight">Jobyt</span>
                </Link>

                {/* CENTER PILL */}
                <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center bg-black rounded-full px-1.5 h-10.5 font-navbar">
                    {navLinks.map(({ href, label }) => (
                        isExternal(href) ? (
                            <a
                                key={href}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm px-4.5 h-full flex items-center rounded-full transition text-white/65 hover:text-white"
                            >
                                {label}
                            </a>
                        ) : (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => handleNavClick(href)}
                                className={`text-sm px-4.5 h-full flex items-center rounded-full transition ${
                                    isActive(href)
                                        ? 'text-lime-400 font-medium'
                                        : 'text-white/65 hover:text-white'
                                }`}
                            >
                                {label}
                            </Link>
                        )
                    ))}
                </div>

                {/* RIGHT */}
                <div className="hidden lg:flex ml-auto items-center gap-3 font-navbar">
                    {user ? (
                        <>
                            <Link href={ROUTES.notifications} className="relative text-slate-600 p-1">
                                <FaBell size={17} />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-[1.5px] border-white" />
                            </Link>
                            <Link
                                href={getDashboardRoute()}
                                className="flex items-center gap-2 bg-black text-white rounded-full pl-1.5 pr-4.5 py-1.5 text-sm font-medium hover:opacity-85 transition"
                            >
                                <div className="w-7 h-7 rounded-full bg-lime-300 text-lime-900 flex items-center justify-center text-xs font-bold">
                                    {(user.email?.[0] || 'U').toUpperCase()}
                                </div>
                                Dashboard
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href={ROUTES.login}
                                className="px-5 py-2 rounded-full text-black text-sm font-medium hover:underline transition"
                            >
                                Login
                            </Link>
                            <Link
                                href={ROUTES.userSignup}
                                className="px-5 py-2 rounded-full border-[1.5px] border-black text-black text-sm font-medium hover:bg-black hover:text-white transition"
                            >
                                Sign Up
                            </Link>
                            <Link
                                href={ROUTES.employerSignup}
                                className="px-5 py-2 rounded-full border-[1.5px] border-lime-400 text-lime-700 text-sm font-medium hover:bg-lime-300 hover:text-black transition"
                            >
                                Employer Sign Up
                            </Link>
                        </>
                    )}
                </div>

                {/* HAMBURGER */}
                <button
                    className="ml-auto lg:hidden text-slate-800"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <FaXmark size={21} /> : <FaBars size={21} />}
                </button>
            </div>

            {/* MOBILE MENU */}
            {mobileOpen && (
                <div className="lg:hidden bg-white/97 backdrop-blur-xl border-t border-black/6 px-6 pb-5 font-navbar">
                    {navLinks.map(({ href, label }) => (
                        isExternal(href) ? (
                            <a
                                key={href}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block py-3 text-[15px] border-b border-black/6 last:border-none text-slate-800"
                                onClick={() => setMobileOpen(false)}
                            >
                                {label}
                            </a>
                        ) : (
                            <Link
                                key={href}
                                href={href}
                                className={`block py-3 text-[15px] border-b border-black/6 last:border-none ${
                                    isActive(href) ? 'text-lime-600 font-semibold' : 'text-slate-800'
                                }`}
                                onClick={() => { handleNavClick(href); setMobileOpen(false); }}
                            >
                                {label}
                            </Link>
                        )
                    ))}
                    <div className="mt-3 flex flex-col gap-2">
                        {user ? (
                            <Link href={getDashboardRoute()} className="text-center bg-black text-white py-3 rounded-full text-sm font-medium">
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link href={ROUTES.login} className="text-center py-3 rounded-full text-sm font-medium border border-transparent">
                                    Login
                                </Link>
                                <Link href={ROUTES.userSignup} className="text-center border-[1.5px] border-black py-3 rounded-full text-sm font-medium">
                                    Sign Up
                                </Link>
                                <Link href={ROUTES.employerSignup} className="text-center border-[1.5px] border-lime-400 text-lime-700 py-3 rounded-full text-sm font-medium">
                                    Employer Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}