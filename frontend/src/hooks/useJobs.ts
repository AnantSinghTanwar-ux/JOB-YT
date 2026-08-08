'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Job } from '@/types';
import { sortSpazorlabsFirst } from '@/lib/companyFlags';
import { normalizeCompany } from '@/lib/utils';

interface JobFilters {
  keyword?: string;
  location?: string;
  type?: string;
  salary_min?: number;
  salary_max?: number;
  skills?: string;
  wfh?: boolean;
  partTime?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

export const useJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeFilters, setActiveFilters] = useState<JobFilters>({ limit: 20 });

  const searchJobs = useCallback(async (filters: JobFilters = {}) => {
    const requestedPage = Math.max(1, Number(filters.page) || 1);
    const requestedLimit = Math.max(1, Number(filters.limit) || 20);

    const normalizedFilters: JobFilters = {
      ...filters,
      page: requestedPage,
      limit: requestedLimit,
    };

    if (normalizedFilters.wfh && !normalizedFilters.location) {
      normalizedFilters.location = 'remote';
    }
    if (normalizedFilters.partTime && !normalizedFilters.type) {
      normalizedFilters.type = 'part-time';
    }

    const { wfh, partTime, ...apiFilters } = normalizedFilters;

    if (requestedPage === 1) {
      setIsLoading(true);
      setActiveFilters({ ...normalizedFilters, page: undefined });
    } else {
      setIsLoadingMore(true);
    }

    setError(null);
    try {
      const params = new URLSearchParams(
        Object.entries(apiFilters)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      );
      const res = await api.getPaginated<Job>(`/jobs?${params}`);
      const nextJobs = (res.data ?? []).map(normalizeCompany);
      const nextTotal = res.pagination?.total ?? 0;

      setJobs((prev) => {
        const combinedJobs = requestedPage === 1 ? nextJobs : [...prev, ...nextJobs];
        return sortSpazorlabsFirst(combinedJobs);
      });
      setTotal(nextTotal);
      setPage(requestedPage);
      setHasMore(requestedPage * requestedLimit < nextTotal);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      if (requestedPage === 1) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, []);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    searchJobs({ ...activeFilters, page: nextPage, limit: activeFilters.limit || 20 });
  }, [activeFilters, hasMore, isLoading, isLoadingMore, page, searchJobs]);

  return { jobs, total, isLoading, isLoadingMore, hasMore, error, searchJobs, loadMore };
};
