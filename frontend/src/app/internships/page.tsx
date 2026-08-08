'use client';

import { useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/landing';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { SkeletonGrid } from '@/components/ui/JobCard';
import { Spinner, Button } from '@/components/ui';
import { useJobs } from '@/hooks/useJobs';
import { ROUTES } from '@/constants';

export default function InternshipsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>}>
            <InternshipsContent />
        </Suspense>
    );
}

function InternshipsContent() {
    const searchParams = useSearchParams();
    const { jobs, total, isLoading, isLoadingMore, hasMore, searchJobs, loadMore, error } = useJobs();

    const observer = useRef<IntersectionObserver | null>(null);
    const lastJobElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoading || isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, isLoadingMore, hasMore, loadMore]);

    useEffect(() => {
        const keyword = searchParams.get('keyword') || undefined;
        // Force type to internship for this page, ignoring the URL type if any
        searchJobs({ keyword, type: 'internship', page: 1, limit: 20 });
    }, [searchParams, searchJobs]);

    const handleApplyFilters = useCallback((filters: any) => {
        // Ensure type stays 'internship' unless the filter component passes something else, 
        // but for the internships page, we want it to stay 'internship'
        searchJobs({ ...filters, type: 'internship', page: 1, limit: 20 });
    }, [searchJobs]);

    return (
        <div className="min-h-screen flex flex-col bg-[#fcfcfc]">
            <Navbar />

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-28 pb-20">
                {/* Header Section */}
                <div className="mb-10 lg:mb-12">
                    <h1 className="font-display text-3xl md:text-4xl lg:text-[42px] font-extrabold text-[#1a1a1a] tracking-tight mb-2">
                        Explore Internships
                    </h1>
                    <p className="text-slate-600 font-medium text-sm md:text-base">
                        Find and apply to the best opportunities
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

                    <aside className="w-full lg:w-[320px] shrink-0">
                        <JobFilters
                            onApply={handleApplyFilters}
                            initialKeyword={searchParams.get('keyword') || ''}
                            // Don't pass initialType so it doesn't show in the UI if not needed, or pass 'internship'
                        />
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 w-full min-w-0">
                        {isLoading ? (
                            <SkeletonGrid count={9} gridClass="grid-cols-1 md:grid-cols-2" />
                        ) : error ? (
                            <div className="w-full flex flex-col items-center justify-center py-32 text-center rounded-[24px] border-2 border-dashed border-red-200 bg-red-50/50">
                                <span className="text-4xl mb-4">⚠️</span>
                                <h3 className="text-lg font-bold text-red-800 mb-1">Something went wrong</h3>
                                <p className="text-red-600 text-sm mb-4">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="text-sm font-semibold text-red-700 hover:text-red-900 underline"
                                >
                                    Try again
                                </button>
                            </div>
                        ) : jobs.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {jobs.map((job, index) => {
                                        const isLast = index === jobs.length - 1;
                                        return (
                                            <div key={job.id} ref={isLast ? lastJobElementRef : null} className="flex">
                                                <JobCard 
                                                    job={job}
                                                    actions={
                                                        <Link href={ROUTES.jobDetail(job.id)} className="w-full">
                                                            <Button size="sm" className="w-full">Apply Now</Button>
                                                        </Link>
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                {isLoadingMore && (
                                    <div className="mt-6 flex justify-center py-4">
                                        <Spinner size="md" />
                                    </div>
                                )}
                                {!isLoadingMore && !hasMore && (
                                    <div className="mt-8 text-center text-sm text-slate-500 py-4 border-t border-slate-100">
                                        You have reached the end of the list. Showing {jobs.length} of {total} internships.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="w-full flex flex-col items-center justify-center py-32 text-center rounded-[24px] border-2 border-dashed border-slate-200">
                                <span className="text-4xl mb-4">🔍</span>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">No internships found</h3>
                                <p className="text-slate-500 text-sm">Try tweaking your filters or search terms.</p>
                                <button
                                    onClick={() => handleApplyFilters({})}
                                    className="mt-6 text-sm font-semibold text-lime-600 hover:text-lime-700 underline"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
