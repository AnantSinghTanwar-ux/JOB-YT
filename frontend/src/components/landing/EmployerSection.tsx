'use client';

import Image from 'next/image';

export function EmployerSection() {
    return (
        <section className="bg-white min-h-[70vh] flex items-center relative overflow-hidden py-16">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 w-full">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
                    
                    {/* Left - Composite Image */}
                    <div className="w-full lg:w-[35%] shrink-0 relative flex justify-center lg:justify-start">
                        <style dangerouslySetInnerHTML={{__html: `
                            @media (max-width: 1023px) {
                                .animate-flap-top { animation: flapTop 4s ease-in-out infinite; }
                                .animate-flap-bottom { animation: flapBottom 4s ease-in-out infinite; }
                            }
                            @keyframes flapTop {
                                0%, 100% { transform: rotate(0deg); }
                                50% { transform: rotate(-5deg); }
                            }
                            @keyframes flapBottom {
                                0%, 100% { transform: rotate(0deg); }
                                50% { transform: rotate(5deg); }
                            }
                        `}} />

                        <div className="relative w-[100px] h-[100px] sm:w-[125px] sm:h-[125px] md:w-[140px] md:h-[140px] lg:w-[225px] lg:h-[225px] mx-auto lg:ml-[-3rem] lg:mr-0 -rotate-90 lg:rotate-0 transition-transform duration-700">
                            {/* Base Knot (Green Tie)*/}
                            <div className="absolute inset-0 rotate-90 z-20 flex items-center justify-center -translate-x-[40%]">
                                <div className="relative w-full h-full scale-[1.15]">
                                    <Image 
                                        src="/LogoBottom.svg" 
                                        alt="Jobyt Base" 
                                        fill 
                                        className="object-contain drop-shadow-sm" 
                                        unoptimized
                                    />
                                </div>
                            </div>
                            
                            {/* Top Earn*/}
                            <div className="absolute inset-0 z-10 -translate-x-[35%]">
                                <div className="w-full h-full origin-center transition-transform duration-700 animate-flap-top lg:hover:-rotate-[5deg]">
                                    <div className="absolute inset-0 flex items-center justify-center rotate-[90deg] translate-x-[85%] -translate-y-[28%]">
                                        <div className="relative w-[85%] h-[85%]">
                                            <Image 
                                                src="/LogoLeftEar.svg" 
                                                alt="Top Loop" 
                                                fill 
                                                className="object-contain" 
                                                unoptimized
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bottom Ear */}
                            <div className="absolute inset-0 z-10 -translate-x-[35%]">
                                <div className="w-full h-full origin-center transition-transform duration-700 animate-flap-bottom lg:hover:rotate-[5deg]">
                                    <div className="absolute inset-0 flex items-center justify-center rotate-[85deg] scale-x-[-1] translate-x-[85%] translate-y-[25%]">
                                        <div className="relative w-[85%] h-[85%]">
                                            <Image 
                                                src="/LogoLeftEar.svg" 
                                                alt="Bottom Loop" 
                                                fill 
                                                className="object-contain" 
                                                unoptimized
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right - Text Content */}
                    <div className="w-full lg:w-[60%] flex flex-col justify-center">
                        <h2 className="font-display text-4xl md:text-[44px] font-bold text-[#1a1a1a] leading-[1.2] mb-12 mt-10 text-center lg:text-left tracking-tight">
                            We make a difference for all students
                        </h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-6 lg:gap-8 items-start">
                            {/* Stat 1 */}
                            <div className="text-center flex flex-col items-center">
                                <div className="text-5xl md:text-[56px] font-bold text-[#91D245] mb-4 tracking-tighter">
                                    96%
                                </div>
                                <p className="text-[#333] font-medium text-[13px] md:text-sm leading-relaxed max-w-[180px]">
                                    Of students say they discovered internship opportunities that matched their skills.
                                </p>
                            </div>
                            
                            {/* Stat 2 - Staggered Down */}
                            <div className="text-center flex flex-col items-center mt-0 sm:mt-12 md:mt-16">
                                <div className="text-5xl md:text-[56px] font-bold text-[#91D245] mb-4 tracking-tighter">
                                    94%
                                </div>
                                <p className="text-[#333] font-medium text-[13px] md:text-sm leading-relaxed max-w-[180px]">
                                    Of students feel more confident applying for internships using Jobyt.
                                </p>
                            </div>
                            
                            {/* Stat 3 */}
                            <div className="text-center flex flex-col items-center">
                                <div className="text-5xl md:text-[56px] font-bold text-[#91D245] mb-4 tracking-tighter">
                                    5X
                                </div>
                                <p className="text-[#333] font-medium text-[13px] md:text-sm leading-relaxed max-w-[180px]">
                                    Higher chances of landing an internship.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </section>
    );
}
