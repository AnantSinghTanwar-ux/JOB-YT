// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole = 'applicant' | 'recruiter' | 'admin';

export interface AuthUser {
  id: string;
  email: string | null;
  role: UserRole;
  email_verified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ── Profiles ──────────────────────────────────────────────────────────────────
export interface ApplicantProfile {
  user_id: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  resume_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  bio: string | null;
  visibility?: 'public' | 'private' | 'hidden';
}

export interface ApplicantProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tech_stack: string[];
  github_url: string | null;
  demo_url: string | null;
  media_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicantCertification {
  id: string;
  user_id: string;
  name: string;
  issuer: string;
  issue_date: string | null;
  credential_url: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}


export interface WorkExperience {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string;
  is_current: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number;
}

export interface RecruiterProfile {
  user_id: string;
  name: string | null;
  companyName: string | null;
  industry: string | null;
  description: string | null;
  company_size: string | null;
  logo_url: string | null;
  website: string | null;
  location: string | null;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export type JobType = 'full-time' | 'part-time' | 'contract' | 'remote' | 'internship';
export type JobStatus = 'draft' | 'active' | 'closed';
export type ApplicationQuestionType = 'text' | 'textarea' | 'select' | 'rating' | 'link';

export interface ApplicationQuestion {
  id: string;
  label: string;
  type: ApplicationQuestionType;
  required: boolean;
  section?: string;
  placeholder?: string;
  options?: string[];
}

export interface Job {
  id: string;
  recruiter_id: string;
  title: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  type: JobType;
  skills: string[];
  application_questions?: ApplicationQuestion[];
  description: string;
  status: JobStatus;
  job_approval_status?: 'pending_approval' | 'approved' | 'rejected';
  ai_interview_type?: string | null;
  ai_interview_rubric?: string | null;
  ai_interview_threshold?: number | null;
  is_boosted: boolean;
  views_count: number;
  companyName?: string | null;
  company_logo?: string | null;
  company_website?: string | null;
  company_location?: string | null;
  is_external_company?: boolean;
  source?: 'admin_external' | 'recruiter' | 'admin_company';
  created_at: string;
  disallow_auto_apply?: boolean;
  coding_assessment_id?: string | null;
  active_assessment_version_id?: string | null;
  assessment_title?: string | null;
  assessment_timing?: 'during_apply' | 'post_apply';
  /** Selection Probability: 0–100 score derived from SkillMatchingService (candidate-facing only) */
  selectionProbability?: number;
}

// ── Applications ─────────────────────────────────────────────────────────────
export interface ATSBreakdown {
  totalScore: number;
  sectionScores: {
    skillsScore: number;
    experienceScore: number;
    keywordsScore: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  keywordOverlap: string[];
  debug: {
    jobSkillCount: number;
    resumeSkillCount: number;
    experienceTokenOverlap: number;
    keywordTokenOverlap: number;
    weights: { skills: number; experience: number; keywords: number };
  };
}

export type ApplicationStatus =
  | 'applied' | 'in_review' | 'shortlisted' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  resume_id?: string | null;
  application_answers?: Array<{ question_id: string; answer: string }>;
  cover_letter: string | null;
  resume_snapshot_url: string | null;
  submission_source?: 'manual' | 'auto_apply';
  ats_score?: number | null;
  ats_breakdown?: ATSBreakdown | null;
  // AI Insights fields (TRACK-U3/U4/U5)
  fit_insights?: string | null;
  rejection_reason?: string | null;
  improvement_suggestions?: string | null;
  insights_approved?: boolean;
  insights_generated_at?: string | null;
  status: ApplicationStatus;
  status_updated_at: string;
  created_at: string;
  // joined fields
  job_title?: string;
  location?: string;
  companyName?: string | null;
  latest_comment?: string | null;
  /** Selection Probability: 0–100 score derived from SkillMatchingService (candidate-facing only) */
  selectionProbability?: number;
}

export interface PipelineEvent {
  id: string;
  application_id: string;
  previous_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  changed_by: {
    id: string;
    role: string;
    name: string | null;
  } | null;
}

// ── Credits ───────────────────────────────────────────────────────────────────
export type CreditType = 'credit' | 'debit';
export type CreditTransactionStatus = 'success' | 'failed';

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditType;
  amount: number;
  status?: CreditTransactionStatus;
  balance_after: number;
  description: string;
  reference_id: string | null;
  created_at: string;
}

// ── Messages ──────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  recruiter_id: string;
  applicant_id: string;
  job_id: string | null;
  last_message_at: string;
  last_message?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export type NotificationType =
  | 'job_match' | 'application_status' | 'new_message'
  | 'referral_joined' | 'low_credit' | 'payment_success' | 'payment_failed'
  | 'application_submitted' | 'employer_broadcast' | 'interview_invited'
  | 'interview_cancelled' | 'interview_reminder_24h' | 'interview_reminder_2h'
  | 'deadline_alert' | 'auto_apply_digest' | 'daily_recommendation'
  | 'credits_exhausted'
  | 'subscription_expiry_7d' | 'subscription_expiry_3d' | 'subscription_expiry_1d';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

// ── Payments ──────────────────────────────────────────────────────────────────
export interface Plan {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
}

export interface Payment {
  id: string;
  user_id: string;
  plan_id: string | null;
  plan_name?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  created_at: string;
}

// ── API ───────────────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  error?: string;
  errors?: Array<Record<string, unknown>>;
  details?: unknown;
  data?: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  unread?: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Interviews ───────────────────────────────────────────────────────────────
export type InterviewStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface Interview {
  id: string;
  application_id: string;
  interviewer_id: string;
  candidate_id: string;
  status: InterviewStatus;
  code_content: string | null;
  code_language: string | null;
  notes: string | null;
  feedback: string | null;
  rating: number | null;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  company_name?: string;
  job_title?: string;
  candidate_name?: string;
  interviewer_name?: string;
}

// ── API Keys ──────────────────────────────────────────────────────────────────
export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  rate_limit: number;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  api_key: string;
}

// ── API Activity ──────────────────────────────────────────────────────────────
export interface ApiActivityLog {
  id: number;
  api_key_id: string | null;
  user_id: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  key_prefix?: string | null;
  api_key_name?: string | null;
  created_at: string;
}

// ── Webhooks ──────────────────────────────────────────────────────────────────
export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  delivery_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: unknown;
  response_status: number | null;
  response_body: string | null;
  attempt: number;
  delivered_at: string | null;
  created_at: string;
}
