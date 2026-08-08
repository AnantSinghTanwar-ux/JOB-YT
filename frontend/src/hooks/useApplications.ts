'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Application, ApplicationStatus } from '@/types';

export const useApplications = () => {
  const normalizeCompany = (item: any): Application => ({
    ...item,
    companyName:
      item.companyName ||
      item.company_name ||
      item.company?.name ||
      item.recruiter?.companyName ||
      null,
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyApplications = useCallback(async (requestedPage = 1) => {
    setIsLoading(true);
    try {
      const res = await api.getPaginated<Application>(`/applications/my?page=${requestedPage}&limit=${limit}`);
      const apps = (res.data ?? []).map(normalizeCompany);
      
      // Fetch latest comment for each application
      const appsWithComments = await Promise.all(apps.map(async (app) => {
        try {
          const eventsRes = await api.get<any[]>(`/applications/${app.id}/events`);
          const events = eventsRes.data || [];
          // Get the most recent event that has notes
          const lastEventWithNotes = [...events].reverse().find(e => e.notes && e.notes.trim());
          return { ...app, latest_comment: lastEventWithNotes?.notes || null };
        } catch {
          return { ...app, latest_comment: null };
        }
      }));

      setApplications(appsWithComments);
      setTotal(res.pagination?.total ?? 0);
      setPage(res.pagination?.page ?? requestedPage);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch (error) {
      console.error('[useApplications] Failed to fetch my applications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  const fetchJobApplications = useCallback(async (jobId: string, requestedPage = 1) => {
    setIsLoading(true);
    try {
      const res = await api.getPaginated<Application>(`/applications/jobs/${jobId}?page=${requestedPage}&limit=${limit}`);
      setApplications((res.data ?? []).map(normalizeCompany));
      setTotal(res.pagination?.total ?? 0);
      setPage(res.pagination?.page ?? requestedPage);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch (error) {
      console.error('[useApplications] Failed to fetch job applications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  const updateStatus = useCallback(async (applicationId: string, status: ApplicationStatus) => {
    const res = await api.patch<Application>(`/applications/${applicationId}/status`, { status });
    setApplications((prev) => prev.map((a) => (a.id === applicationId && res.data ? res.data : a)));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchMyApplications(newPage);
    }
  }, [totalPages, fetchMyApplications]);

  return {
    applications, total, page, totalPages, limit, isLoading,
    fetchMyApplications, fetchJobApplications, updateStatus, goToPage,
  };
};
