'use client';

import { useRouter } from 'next/navigation';
import { FaCircleCheck } from 'react-icons/fa6';

export function Hire() {
    const router = useRouter();

    const handlePostJob = () => {
        router.push('/employer-login');
    };

    return (
        <section className="relative overflow-hidden bg-white py-16 md:py-20 lg:py-24">
            {/* Background blobs matching the pricing section glow but positioned for the left text area */}
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[80%] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[10%] left-[-5%] w-[40%] h-[60%] bg-lime-300/15 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
                {/* Headers */}
                <div className="text-center mb-10 md:mb-14 lg:mb-16">
                    <p className="text-xs font-bold tracking-[0.15em] text-slate-500 uppercase mb-3">
                        For Employers
                    </p>
                    <h2 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl md:text-[2.6rem] lg:text-5xl tracking-tight">
                        Hire the Top 1% Talent
                    </h2>
                </div>

                {/* Content Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center">
                    
                    {/* Left Column (Text & CTA) */}
                    <div className="flex flex-col items-start max-w-lg text-left">
                        <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed mb-8">
                            Jobyt gives you access to a curated pool of passionate students and professionals across the country. Post a job in minutes.
                        </p>
                        <button 
                            onClick={handlePostJob}
                            className="bg-[#1a1a1a] text-white rounded-full px-8 py-3.5 text-sm sm:text-base font-semibold hover:bg-black transition-colors">
                            Post a Job
                        </button>
                    </div>

                    {/* Right Column (List Items) */}
                    <div className="flex flex-col gap-6 w-full max-w-md md:pl-4 lg:pl-10 text-left">
                        
                        {/* List Item 1 */}
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0 flex items-center justify-center">
                                {/* Inner white fill so the cutout checkmark is pure white instead of transparent */}
                                <div className="absolute inset-0.5 bg-white rounded-full" />
                                <FaCircleCheck className="relative text-[#bbf53b] text-[28px] sm:text-[32px] z-10" />
                            </div>
                            <span className="text-base sm:text-lg text-slate-800 font-semibold tracking-tight">
                                Smart AI Candidate Matching
                            </span>
                        </div>

                        {/* List Item 2 */}
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0 flex items-center justify-center">
                                <div className="absolute inset-0.5 bg-white rounded-full" />
                                <FaCircleCheck className="relative text-[#bbf53b] text-[28px] sm:text-[32px] z-10" />
                            </div>
                            <span className="text-base sm:text-lg text-slate-800 font-semibold tracking-tight">
                                Seamless Interview Scheduling
                            </span>
                        </div>

                        {/* List Item 3 */}
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0 flex items-center justify-center">
                                <div className="absolute inset-0.5 bg-white rounded-full" />
                                <FaCircleCheck className="relative text-[#bbf53b] text-[28px] sm:text-[32px] z-10" />
                            </div>
                            <span className="text-base sm:text-lg text-slate-800 font-semibold tracking-tight">
                                Zero Hidden Charges
                            </span>
                        </div>
                        
                    </div>
                </div>
            </div>
        </section>
    );
}
