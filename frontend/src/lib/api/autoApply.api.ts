import { api } from '@/lib/api';

export interface AutoApplyPreferences {
  user_id: string;
  status: 'disabled' | 'enabled' | 'paused';
  approval_mode: 'auto' | 'manual';
  match_threshold: number;
  target_roles: string[];
  target_locations: string[];
  target_job_types: string[];
  excluded_companies: string[];
  excluded_keywords: string[];
  base_resume_id: string | null;
  include_cover_letter: boolean;
  digest_enabled: boolean;
  consented_at: string | null;
  preview_ack_at: string | null;
}

export interface MatchReason {
  overall: number;
  human_summary: string;
  skills: { score: number; matched?: string[]; missing?: string[] };
  experience: { score: number; summary?: string };
  location: { score: number; matched?: boolean; detail?: string };
}

export interface QueueItem {
  id: string;
  job_id: string;
  status: string;
  match_score: number | null;
  match_reason: MatchReason;
  job_title?: string;
  company_name?: string;
  failure_reason?: string | null;
  created_at: string;
}

export interface PreviewResult {
  summary: {
    total_scanned: number;
    eligible: number;
    excluded: number;
    above_threshold: number;
  };
  eligible_jobs: Array<{
    job_id: string;
    title: string;
    company: string;
    match_score: number;
    match_reason: MatchReason;
  }>;
  excluded_jobs: Array<{
    job_id: string;
    title: string;
    company: string;
    exclusion_reason: string;
  }>;
}

export const AutoApplyApi = {
  getPreferences: () => api.get<AutoApplyPreferences>('/auto-apply/preferences'),
  updatePreferences: (body: Partial<AutoApplyPreferences>) => api.put<AutoApplyPreferences>('/auto-apply/preferences', body),
  updateStatus: (status: string, consented?: boolean) =>
    api.patch<AutoApplyPreferences>('/auto-apply/preferences/status', { status, consented }),
  preview: (draft?: Partial<AutoApplyPreferences>) => api.post<PreviewResult>('/auto-apply/preview', draft || {}),
  acknowledgePreview: () => api.post<AutoApplyPreferences>('/auto-apply/preview/acknowledge', {}),
  getLimits: () => api.get<{ tier: string; maxDaily: number; usedToday: number; remaining: number; creditBalance: number }>('/auto-apply/limits'),
  listQueue: (params?: { status?: string; page?: number }) =>
    api.get<QueueItem[]>('/auto-apply/queue', { params }),
  getQueueStats: () => api.get<Record<string, number>>('/auto-apply/queue/stats'),
  approve: (id: string) => api.post<QueueItem>(`/auto-apply/queue/${id}/approve`, {}),
  reject: (id: string) => api.post<QueueItem>(`/auto-apply/queue/${id}/reject`, {}),
  retry: (id: string) => api.post<QueueItem>(`/auto-apply/queue/${id}/retry`, {}),
  getEvents: (jobId?: string) => api.get(`/auto-apply/events${jobId ? `/job/${jobId}` : ''}`),
};
