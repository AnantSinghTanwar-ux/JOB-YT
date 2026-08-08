'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Testimonial {
    text: string;
    avatar: string;
    name: string;
    role: string;
}

const testimonials: Testimonial[] = [
    {
        text: '"I found my first software development internship through this platform. The application process was simple and I got interview calls within a week."',
        avatar: 'https://i.pravatar.cc/150?img=5',
        name: 'Alisha Ferrao',
        role: 'SDE Intern',
    },
    {
        text: '"This platform helped me discover internships I didn\'t even know existed. It gave me real experience before graduation."',
        avatar: 'https://i.pravatar.cc/150?img=12',
        name: 'Rahul Kumar',
        role: 'Marketing Intern',
    },
    {
        text: '"Super easy to use and full of great opportunities. It helped me land a remote internship with a startup."',
        avatar: 'https://i.pravatar.cc/150?img=41',
        name: 'Raghav Gupta',
        role: 'Data Analyst Intern',
    },
    {
        text: '"The opportunities here are amazing. I built my portfolio through internships I found here and it really boosted my confidence."',
        avatar: 'https://i.pravatar.cc/150?img=14',
        name: 'Kevin Joshua',
        role: 'UI/UX Design Intern',
    },
    {
        text: '"Finally a platform that cuts out the noise. The exact matching algorithm meant I only talked to companies looking for my specific React skills."',
        avatar: 'https://i.pravatar.cc/150?img=32',
        name: 'Neha Roy',
        role: 'Frontend Dev',
    },
];

export function Testimonials() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState<number | null>(null);
    
    // We track precise width percentage for the continuous line
    const [progressWidth, setProgressWidth] = useState(20);

    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;
        
        const scrollPosition = scrollRef.current.scrollLeft;
        const width = scrollRef.current.clientWidth;
        const scrollWidth = scrollRef.current.scrollWidth;
        const itemWidth = scrollRef.current.children[0]?.clientWidth || 0;
        const gap = 24; // gap-6
        const itemTotalWidth = itemWidth + gap;
        
        if (itemTotalWidth === 0) return;
        
        // Find how many cards are completely or partially visible in the viewport width
        // and add the scroll offset to determine total cards revealed.
        const maxScrollLeft = scrollWidth - width;
        let visibleRatio = 1;
        
        if (maxScrollLeft > 0) {
            // How much of the hidden area has been scrolled?
            const scrollPercentage = Math.max(0, Math.min(1, scrollPosition / maxScrollLeft));
            const visibleCardsStatic = width / itemTotalWidth;
            // The unrevealed cards represent the remaining distance
            const unrevealedCards = testimonials.length - visibleCardsStatic;
            
            // Current viewed cards = statically visible + (scrollPercentage * unrevealed)
            const currentViewedCards = visibleCardsStatic + (scrollPercentage * unrevealedCards);
            visibleRatio = currentViewedCards / testimonials.length;
        }
        
        setProgressWidth(Math.max(20, Math.min(100, visibleRatio * 100)));
    }, []);

    // Initial calculation on mount
    useEffect(() => {
        const rafId = window.requestAnimationFrame(handleScroll);
        // Recalculate on window resize
        window.addEventListener('resize', handleScroll);
        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', handleScroll);
        };
    }, [handleScroll]);

    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 mb-12">
                <div className="text-center max-w-2xl mx-auto reveal">
                    <h2 className="font-display text-4xl md:text-5xl font-extrabold text-[#1a1a1a] tracking-tight">
                        Loved by Talent across India
                    </h2>
                </div>
            </div>

            <div className="relative w-full py-6">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 pb-20 pt-16 scroll-pl-4 sm:scroll-pl-6 md:scroll-pl-12 px-4 sm:px-6 md:px-12 items-center"
                    style={{ 
                        WebkitOverflowScrolling: 'touch', 
                        scrollbarWidth: 'none', 
                        msOverflowStyle: 'none'
                    }}
                >
                    {testimonials.map((t, i) => {
                        const isHovered = isHovering === i;
                        // Smooth radial/linear gradient with slight tilt
                        const hoverClasses = isHovered
                            ? 'bg-gradient-to-br from-[#DFFE73] to-[#F5F4ED] from-[20%] to-[100%] -translate-y-4 -rotate-3 scale-[1.02] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] z-10'
                            : 'bg-[#F5F4ED] shadow-sm z-0';
                            
                        return (
                            <div
                                key={`testimonial-${i}`}
                                // EXACT desktop match: xl:w-[calc(25%-18px)] fits exactly 4 cards with gap-6 (24px).
                                className={`relative shrink-0 w-[280px] sm:w-[320px] md:w-[360px] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] snap-start rounded-[24px] p-8 md:p-10 transition-all duration-[400ms] ease-out cursor-pointer border border-transparent flex flex-col justify-between h-[340px] md:h-[380px] origin-bottom-left ${hoverClasses}`}
                                onMouseEnter={() => setIsHovering(i)}
                                onMouseLeave={() => setIsHovering(null)}
                            >
                                <p className="text-[#333] font-medium text-base md:text-lg leading-relaxed relative z-10 text-left">
                                    {t.text}
                                </p>
                                
                                <div className="flex items-center gap-4 mt-auto pt-8 relative z-10">
                                    <Image
                                        src={t.avatar}
                                        alt={t.name}
                                        width={56}
                                        height={56}
                                        className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-[rgba(255,255,255,0.5)] shadow-sm object-cover bg-white"
                                        unoptimized
                                    />
                                    <div className="text-left">
                                        <h4 className="font-bold text-[#1a1a1a] text-sm md:text-base tracking-tight">{t.name}</h4>
                                        <p className="text-xs md:text-sm text-slate-500 font-medium">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Continuous Progress Bar */}
                <div className="mt-4 md:mt-6 flex justify-center items-center">
                    <div className="w-48 md:w-64 h-1.5 md:h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-brand-primary rounded-full transition-all duration-150 ease-out"
                            style={{ width: `${progressWidth}%` }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
