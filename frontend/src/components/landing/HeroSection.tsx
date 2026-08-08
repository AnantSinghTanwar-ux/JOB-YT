'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CompanyMarquee from './CompanyMarquee';

export function HeroSection() {
    const router = useRouter();
    const [keyword, setKeyword] = useState('');

    const handleSearch = () => {
        if (!keyword.trim()) return;
        router.push(`/internships?keyword=${keyword}`);
    };

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden">

            {/* BACKGROUND */}
            <div className="absolute inset-0 -z-10 bg-linear-to-br from-[#f7f7f7] via-[#f9fbf4] to-[#eef7d8]" />

            {/* ── FLOATING BADGES — xl only ── */}
            <div className="hidden xl:block pointer-events-none select-none">
                <div className="absolute animate-float"
                    style={{ top: '22%', left: '5%', transform: 'rotate(-12deg)' }}>
                    <Badge img="https://i.pravatar.cc/100?img=12" label="Hired Recently" name="Akshay joined Google" />
                </div>
                <div className="absolute animate-float-delayed"
                    style={{ top: '54%', left: '4%', transform: 'rotate(-7deg)' }}>
                    <BadgeSm img="https://i.pravatar.cc/100?img=32" label="Hired" name="Shreya joined Amazon" />
                </div>
                <div className="absolute animate-float-delayed"
                    style={{ top: '20%', right: '5%', transform: 'rotate(10deg)' }}>
                    <Badge img="https://i.pravatar.cc/100?img=5" label="Hired Recently" name="Priya joined Meta" />
                </div>
                <div className="absolute animate-float"
                    style={{ top: '52%', right: '4%', transform: 'rotate(7deg)' }}>
                    <BadgeSm img="https://i.pravatar.cc/100?img=15" label="Hired" name="Rahul joined Flipkart" />
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            <div className="relative z-10 flex flex-col items-center w-full px-5 sm:px-8 lg:px-10">

                {/* TAGLINE */}
                <p className="font-medium text-slate-500 tracking-wide"
                    style={{ fontSize: 'clamp(0.72rem, 1.4vw, 0.95rem)', marginBottom: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
                    India&apos;s most loved platform
                </p>

                {/* HEADING */}
                <h1 className="font-display font-extrabold tracking-tight text-black leading-[1.1] max-w-170 lg:max-w-215"
                    style={{ fontSize: 'clamp(1.9rem, 5.5vw, 4.25rem)' }}>
                    Launch your career with the{' '}
                    <span className="text-lime-500 relative inline-block whitespace-nowrap">
                        perfect role.
                        <svg
                            className="absolute left-0 w-full"
                            style={{ bottom: 'clamp(-8px, -1.2vw, -12px)', height: 'clamp(12px, 1.8vw, 22px)' }}
                            viewBox="0 0 200 20" fill="none" preserveAspectRatio="none">
                            <path d="M5 15C40 5 160 5 195 15" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
                        </svg>
                    </span>
                </h1>

                {/* SUBTEXT */}
                <p className="text-slate-500 max-w-130 lg:max-w-145"
                    style={{
                        fontSize: 'clamp(0.82rem, 1.6vw, 1.05rem)',
                        marginTop: 'clamp(1rem, 3vw, 2rem)',
                        lineHeight: '1.7',
                    }}>
                    Discover internships and fresher jobs that match your passion.
                    Top Indian and global companies are looking for talent exactly like you.
                </p>

                {/* SEARCH BAR */}
                <div className="w-full flex items-center bg-black rounded-full shadow-xl"
                    style={{
                        maxWidth: 'clamp(280px, 75vw, 660px)',
                        marginTop: 'clamp(1rem, 4vw, 2.75rem)',
                        padding: 'clamp(4px, 0.8vw, 7px)',
                        paddingLeft: 'clamp(14px, 2.5vw, 22px)',
                        gap: '4px',
                    }}>
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Job title, keyword or company"
                        className="flex-1 min-w-0 bg-transparent text-white outline-none"
                        style={{ fontSize: 'clamp(0.75rem, 1.4vw, 0.95rem)' }}
                    />
                    <button
                        onClick={handleSearch}
                        className="bg-lime-400 text-black font-semibold rounded-full hover:bg-lime-300 transition-colors shrink-0 whitespace-nowrap"
                        style={{
                            fontSize: 'clamp(0.78rem, 1.3vw, 0.95rem)',
                            padding: 'clamp(9px, 1.4vw, 14px) clamp(18px, 3vw, 28px)',
                        }}>
                        Search
                    </button>
                </div>

                {/* STATS */}
                <p className="text-slate-400"
                    style={{
                        fontSize: 'clamp(0.68rem, 1.1vw, 0.82rem)',
                        marginTop: 'clamp(1rem, 2vw, 1.5rem)',
                    }}>
                    10k+ Openings daily across multiple domains
                </p>

                {/* MARQUEE */}
                <div className="w-full flex flex-col items-center relative -mb-10 lg:-mb-20"
                    style={{ marginTop: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
                    <p className="font-bold text-slate-400 uppercase tracking-widest"
                        style={{
                            fontSize: 'clamp(0.58rem, 0.9vw, 0.7rem)',
                            marginBottom: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                        }}>
                        Trusted by 10,000+ top startups &amp; companies worldwide
                    </p>
                    <CompanyMarquee />
                </div>
            </div>
        </section>
    );
}

function Badge({ img, label, name }: { img: string; label: string; name: string }) {
    return (
        <div className="bg-white/90 backdrop-blur-lg rounded-full shadow-lg flex items-center gap-3"
            style={{ padding: '10px 20px 10px 10px' }}>
            <img src={img} alt="" className="rounded-full shrink-0" style={{ width: 40, height: 40 }} />
            <div className="text-left">
                <p className="font-semibold uppercase text-slate-400 leading-none"
                    style={{ fontSize: 10, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</p>
                <p className="font-bold text-slate-900 leading-none" style={{ fontSize: 13 }}>{name}</p>
            </div>
        </div>
    );
}

function BadgeSm({ img, label, name }: { img: string; label: string; name: string }) {
    return (
        <div className="bg-white/90 backdrop-blur-lg rounded-full shadow-md flex items-center gap-2.5"
            style={{ padding: '8px 16px 8px 8px' }}>
            <img src={img} alt="" className="rounded-full shrink-0" style={{ width: 34, height: 34 }} />
            <div className="text-left">
                <p className="font-semibold uppercase text-slate-400 leading-none"
                    style={{ fontSize: 9, letterSpacing: '0.08em', marginBottom: 3 }}>{label}</p>
                <p className="font-bold text-slate-900 leading-none" style={{ fontSize: 12 }}>{name}</p>
            </div>
        </div>
    );
}