'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaLinkedinIn } from 'react-icons/fa';

type FooterLink = {
    label: string;
    href: string;
};

type SocialLink = {
    icon: ReactNode;
    href: string;
    label: string;
};

const candidateLinks: FooterLink[] = [
    { label: 'Explore Internships', href: '/internships' },
    { label: 'Career Paths', href: '/roadmaps' },
    { label: 'Resume Builder', href: '/resumes' },
];

const employerLinks: FooterLink[] = [
    { label: 'Post a Job', href: '/employer-login' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Hire Talent', href: '/employer-login' },
    { label: 'API Documentation', href: '/docs' },
];

const socials: SocialLink[] = [
    { icon: <FaLinkedinIn />, href: 'https://www.linkedin.com/company/jobyt-in/', label: 'LinkedIn' },
    { icon: <FaInstagram />, href: 'https://www.instagram.com/jobyt.in/', label: 'Instagram' },
];

export function Footer() {
    return (
        <footer className="bg-black py-10 sm:py-11 md:py-14 lg:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-8 lg:px-6">
                <div className="mb-8 sm:mb-9 md:mb-12">
                    <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-none">
                        Jobyt
                    </h2>
                </div>

                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-7 sm:gap-y-9 md:gap-x-8 md:gap-y-9 lg:grid-cols-4 lg:gap-12 items-start">
                    <div>
                        <div className="text-lg sm:text-xl font-semibold text-white">
                            Powered by{' '}
                            <a
                                href="https://spazorlabs.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lime-400"
                            >
                                SpazorLabs
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold text-white">
                            For Candidates
                        </h4>

                        <ul className="space-y-2.5 sm:space-y-3 text-[13px] sm:text-sm text-slate-300">
                            {candidateLinks.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="hover:text-white transition">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-5 sm:mt-6 flex gap-3 sm:gap-4 text-white text-base sm:text-lg">
                            {socials.map((social) => (
                                <a
                                    key={social.href}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    className="hover:text-lime-400 transition"
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold text-white">
                            For Employers
                        </h4>

                        <ul className="space-y-2.5 sm:space-y-3 text-[13px] sm:text-sm text-slate-300">
                            {employerLinks.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="hover:text-white transition">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="order-last flex justify-center sm:justify-start md:justify-center lg:justify-end items-start mt-1 sm:mt-2 md:mt-4 lg:-mt-40">
                        <Image
                            src="/assets/FooterLogo.svg"
                            alt="Footer Logo"
                            width={300}
                            height={420}
                            className="h-auto w-20 sm:w-24 lg:w-48"
                            priority
                        />
                    </div>
                </div>
            </div>
        </footer>
    );
}