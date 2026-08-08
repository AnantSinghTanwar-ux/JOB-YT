import { HybridScoreResult } from '../services/unifiedMatch.service';

export type AutoApplyStatus = 'disabled' | 'enabled' | 'paused';
export type AutoApplyApprovalMode = 'auto' | 'manual';

export type AutoApplyQueueStatus =
  | 'matched'
  | 'pending_approval'
  | 'tailoring'
  | 'submitting'
  | 'submitted'
  | 'skipped'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type AutoApplyEventType =
  | 'MATCHED'
  | 'APPROVED'
  | 'REJECTED'
  | 'TAILORED'
  | 'SUBMITTED'
  | 'FAILED'
  | 'PAUSED'
  | 'SKIPPED'
  | 'PREVIEWED';

export interface MatchReasonDimension {
  score: number;
  matched?: boolean;
  detail?: string;
  matchedSkills?: string[];
  missing?: string[];
  summary?: string;
}

export interface MatchReason {
  overall: number;
  skills: MatchReasonDimension & { matchedSkills?: string[]; missing?: string[] };
  experience: MatchReasonDimension;
  location: MatchReasonDimension;
  semantic: MatchReasonDimension;
  education: MatchReasonDimension;
  exclusion_reason: string | null;
  human_summary: string;
}

export interface AutoApplyPreferences {
  user_id: string;
  status: AutoApplyStatus;
  approval_mode: AutoApplyApprovalMode;
  match_threshold: number;
  target_roles: string[];
  target_locations: string[];
  target_job_types: string[];
  excluded_companies: string[];
  excluded_keywords: string[];
  base_resume_id: string | null;
  include_cover_letter: boolean;
  digest_enabled: boolean;
  tailoring_mode: 'nudge' | 'keywords' | 'full';
  consented_at: Date | null;
  preview_ack_at: Date | null;
  last_matched_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AutoApplyPreferencesInput {
  approval_mode?: AutoApplyApprovalMode;
  match_threshold?: number;
  target_roles?: string[];
  target_locations?: string[];
  target_job_types?: string[];
  excluded_companies?: string[];
  excluded_keywords?: string[];
  base_resume_id?: string | null;
  include_cover_letter?: boolean;
  digest_enabled?: boolean;
  tailoring_mode?: 'nudge' | 'keywords' | 'full';
}

export interface RankedJob {
  job_id: string;
  title: string;
  company: string;
  location: string | null;
  type: string;
  match_score: number;
  match_reason: MatchReason;
  match_breakdown: HybridScoreResult;
  exclusion_reason?: string;
}

export interface PreviewResult {
  summary: {
    total_scanned: number;
    eligible: number;
    excluded: number;
    above_threshold: number;
  };
  eligible_jobs: RankedJob[];
  excluded_jobs: Array<{
    job_id: string;
    title: string;
    company: string;
    exclusion_reason: string;
  }>;
}

export interface AutoApplyLimits {
  tier: string;
  maxDaily: number;
  usedToday: number;
  remaining: number;
  creditBalance: number;
  creditCostPerApply: number;
}

export interface ResumeVariant {
  id: string;
  user_id: string;
  job_id: string | null;
  base_resume_id: string;
  version_label: string;
  snapshot_url: string;
  change_log: unknown[];
  fabricated_risk: boolean;
  source: 'auto_apply_tailor' | 'manual_upload';
  queue_item_id: string | null;
  created_at: Date;
}
