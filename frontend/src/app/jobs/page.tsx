'use client';

import { useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { Spinner, Button } from '@/components/ui';
import { useJobs } from '@/hooks/useJobs';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { ROUTES } from '@/constants';

function JobsContent() {
    const searchParams = useSearchParams();
    const { jobs, total, isLoading, isLoadingMore, hasMore, searchJobs, loadMore } = useJobs();

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
        const type = searchParams.get('type') || undefined;
        searchJobs({ keyword, type, page: 1, limit: 20 });
    }, [searchParams, searchJobs]);

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-[320px] shrink-0">
                <JobFilters
                    onApply={searchJobs}
                    initialKeyword={searchParams.get('keyword') || ''}
                    initialType={searchParams.get('type') || ''}
                />
            </div>

            <div className="flex-1 min-w-0">
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FaMagnifyingGlass className="text-brand-primary" />
                        {total > 0 ? `${total} jobs found` : 'Find Jobs'}
                    </h1>
                </div>

                {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

                {!isLoading && jobs.length === 0 && (
                    <div className="py-12 text-center text-slate-400">No jobs match your search.</div>
                )}

                <div className="flex flex-col gap-3">
                    {jobs.map((job, index) => {
                        const isLast = index === jobs.length - 1;
                        return (
                            <div key={job.id} ref={isLast ? lastJobElementRef : null}>
                                <JobCard
                                    job={job}
                                    actions={
                                        <Link href={ROUTES.jobDetail(job.id)}>
                                            <Button size="sm">Apply Now</Button>
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
                
                {!isLoading && !isLoadingMore && jobs.length > 0 && !hasMore && (
                    <div className="mt-6 text-center text-sm text-slate-500 py-4 border-t border-slate-100">
                        You have reached the end of the list. Showing {jobs.length} of {total} jobs.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function JobsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg" /></div>}>
            <JobsContent />
        </Suspense>
    );
}
