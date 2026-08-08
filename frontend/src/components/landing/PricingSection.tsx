'use client';

import { useRouter } from 'next/navigation';
import { FaCircleCheck } from 'react-icons/fa6';

export function PricingSection() {
    const router = useRouter();

    const handleBuyNow = () => {
        router.push('/login');
    };

    return (
        <section id="pricing" className="relative overflow-hidden bg-[#f8f9fc] py-16 md:py-20 lg:py-24">
            {/* Background blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[50%] bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[50%] bg-lime-300/12 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 mx-auto max-w-350 px-4 sm:px-6 md:px-8 lg:px-12">
                <div className="reveal mx-auto mb-10 max-w-3xl text-center md:mb-14 lg:mb-16">
                    <h2 className="font-display mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl md:text-[2.6rem] lg:mb-6 lg:text-5xl">
                        Credit Plans
                    </h2>
                </div>

                <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">

                    {/* STARTER */}
                    <div className="glass-card rounded-4xl border border-white bg-white/60 p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] sm:p-7 lg:p-10">
                        <div className="mb-6 lg:mb-8">
                            <h3 className="mb-2 text-xl font-bold text-slate-900 sm:text-2xl">Starter</h3>

                            <div className="mb-3 flex items-baseline gap-2 lg:mb-4">
                                <span className="text-3xl font-extrabold text-slate-900 sm:text-4xl">60</span>
                                <span className="font-semibold tracking-wider text-brand-primary">CREDITS</span>
                            </div>

                            <div className="mb-3 flex items-baseline gap-2 lg:mb-4">
                                <span className="text-xl font-bold text-slate-800 sm:text-2xl">Rs. 59.00/-</span>
                            </div>

                            <p className="text-sm font-medium text-slate-500">
                                Ideal for recruiters getting started with quick hiring actions.
                            </p>
                        </div>

                        <ul className="mb-6 space-y-3.5 lg:mb-8 lg:space-y-4">
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-700 sm:text-base">60 credits included</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-700 sm:text-base">Instant credits on successful payment</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-700 sm:text-base">Use across posting and platform actions</span>
                            </li>
                        </ul>

                        <button onClick={handleBuyNow} className="w-full rounded-full bg-black py-3.5 text-sm font-bold text-white sm:text-base lg:py-4">
                            Buy Now
                        </button>
                    </div>

                    {/* GROWTH */}
                    <div className="glass-card relative z-10 rounded-4xl border-2 border-brand-primary bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-300 sm:p-7 lg:scale-105 lg:p-10">

                        {/* Badge */}
                        <div className="bg-brand-primary absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-semibold uppercase text-slate-900 sm:right-6 sm:text-xs">
                            Most Popular
                        </div>

                        <div className="mb-6 lg:mb-8">
                            <h3 className="mb-2 text-xl font-bold text-brand-primary sm:text-2xl">Growth</h3>

                            <div className="mb-3 flex items-baseline gap-2 lg:mb-4">
                                <span className="text-3xl font-extrabold text-slate-900 sm:text-4xl">150</span>
                                <span className="font-semibold tracking-wider text-brand-primary">CREDITS</span>
                            </div>

                            <div className="mb-3 flex items-baseline gap-2 lg:mb-4">
                                <span className="text-xl font-bold text-slate-800 sm:text-2xl">Rs. 119.00/-</span>
                            </div>

                            <p className="text-sm font-medium text-slate-600">
                                Best value for teams hiring consistently every month.
                            </p>
                        </div>

                        <ul className="mb-6 space-y-3.5 lg:mb-8 lg:space-y-4">
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-800 sm:text-base">150 credits included</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-800 sm:text-base">Faster hiring with higher credit balance</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-800 sm:text-base">Supports frequent posting and outreach flows</span>
                            </li>
                        </ul>

                        <button onClick={handleBuyNow} className="bg-brand-primary w-full rounded-full py-3.5 text-sm font-bold text-slate-900 sm:text-base lg:py-4">
                            Buy Now
                        </button>
                    </div>

                    {/* PRO */}
                    <div className="glass-card rounded-4xl border border-white bg-white/60 p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] sm:p-7 lg:p-10">
                        <div className="mb-6 lg:mb-8">
                            <h3 className="mb-2 text-xl font-bold text-slate-900 sm:text-2xl">Pro</h3>

                            <div className="mb-3 flex items-baseline gap-2 lg:mb-4">
                                <span className="text-3xl font-extrabold text-slate-900 sm:text-4xl">250</span>
                                <span className="font-semibold tracking-wider text-brand-primary">CREDITS</span>
                            </div>

                            <div className="mb-3 flex items-baseline gap-2 lg:mb-4">
                                <span className="text-xl font-bold text-slate-800 sm:text-2xl">Rs. 179.00/-</span>
                            </div>

                            <p className="text-sm font-medium text-slate-500">
                                Built for high-volume recruitment and faster pipeline movement.
                            </p>
                        </div>

                        <ul className="mb-6 space-y-3.5 lg:mb-8 lg:space-y-4">
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-700 sm:text-base">250 credits included</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-700 sm:text-base">Designed for aggressive hiring targets</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-700 sm:text-base">Maximum flexibility for premium workflows</span>
                            </li>
                        </ul>

                        <button onClick={handleBuyNow} className="w-full rounded-full bg-black py-3.5 text-sm font-bold text-white sm:text-base lg:py-4">
                            Buy Now
                        </button>
                    </div>

                </div>
            </div>
        </section>
    );
}