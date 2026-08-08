export type CodingLanguage = 'python' | 'javascript' | 'java' | 'cpp';
export type CodingProblemStatus = 'draft' | 'published';
export type CodingDifficulty = 'easy' | 'medium' | 'hard';
export type CodingAssessmentStatus = 'draft' | 'published' | 'archived';
export type AssessmentTiming = 'during_apply' | 'post_apply';
export type AssessmentSessionStatus = 'pending' | 'active' | 'submitted' | 'expired' | 'completed';
export type CodingSubmissionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CodingTestCase {
  id: string;
  problem_id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  is_sample: boolean;
  weight: number;
  order_index: number;
  explanation: string | null;
}

export interface CodingProblem {
  id: string;
  created_by: string;
  title: string;
  slug: string;
  status: CodingProblemStatus;
  current_version_number: number;
  difficulty: CodingDifficulty;
  supported_languages: string[];
  description: string;
  constraints: string | null;
  hints: string[];
  starter_code: Record<string, string>;
  time_limit_sec: number;
  memory_limit_kb: number;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  test_cases?: CodingTestCase[];
}

export interface ProblemVersion {
  id: string;
  problem_id: string;
  version_number: number;
  title: string;
  description: string;
  constraints: string | null;
  hints: string[];
  difficulty: CodingDifficulty;
  supported_languages: string[];
  starter_code: Record<string, string>;
  time_limit_sec: number;
  memory_limit_kb: number;
  published_at: Date;
  published_by: string;
  snapshot_hash: string;
  test_cases?: ProblemVersionTestCase[];
}

export interface ProblemVersionTestCase {
  id: string;
  problem_version_id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  is_sample: boolean;
  weight: number;
  order_index: number;
  explanation: string | null;
}

export interface ProblemCollection {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  is_shared: boolean;
  created_at: Date;
  updated_at: Date;
  problem_count?: number;
}

export interface CodingAssessment {
  id: string;
  recruiter_id: string;
  job_id: string | null;
  title: string;
  description: string | null;
  status: CodingAssessmentStatus;
  current_version_number: number;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number;
  assessment_timing: AssessmentTiming;
  allow_resume: boolean;
  created_at: Date;
  updated_at: Date;
  problems?: AssessmentProblem[];
}

export interface AssessmentProblem {
  assessment_id: string;
  problem_id: string;
  order_index: number;
  points: number;
  problem?: CodingProblem;
}

export interface AssessmentVersion {
  id: string;
  assessment_id: string;
  version_number: number;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number;
  assessment_timing: AssessmentTiming;
  allow_resume: boolean;
  job_id: string | null;
  job_snapshot: Record<string, unknown> | null;
  published_at: Date;
  published_by: string;
  snapshot_hash: string;
  problems?: AssessmentVersionProblem[];
}

export interface AssessmentVersionProblem {
  id: string;
  assessment_version_id: string;
  problem_version_id: string;
  order_index: number;
  points: number;
  problem_snapshot: Record<string, unknown>;
  problem_version?: ProblemVersion;
}

export interface AssessmentSession {
  id: string;
  assessment_version_id: string;
  user_id: string;
  application_id: string | null;
  started_at: Date;
  expires_at: Date | null;
  completed_at: Date | null;
  status: AssessmentSessionStatus;
  remaining_time_seconds: number | null;
  attempt_number: number;
  last_heartbeat_at: Date | null;
  current_problem_index: number;
  metadata: Record<string, unknown> | null;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  problem_version_id: string;
  started_at: Date;
  completed_at: Date | null;
  best_score: number | null;
  attempts_count: number;
  solved: boolean;
}

export interface CodingSubmission {
  id: string;
  user_id: string;
  assessment_session_id: string | null;
  practice_session_id: string | null;
  problem_version_id: string;
  assessment_version_id: string | null;
  application_id: string | null;
  attempt_number: number;
  language: string;
  source_code: string;
  status: CodingSubmissionStatus;
  test_pass_count: number;
  test_total_count: number;
  score: number | null;
  passed: boolean | null;
  execution_time_ms: number | null;
  memory_kb: number | null;
  assessment_snapshot: Record<string, unknown> | null;
  problem_snapshot: Record<string, unknown> | null;
  job_snapshot: Record<string, unknown> | null;
  judge0_tokens: string[];
  created_at: Date;
}

export interface SubmissionTestResult {
  id: string;
  submission_id: string;
  test_case_id: string;
  passed: boolean;
  actual_output: string | null;
  stderr: string | null;
  time_sec: number | null;
  memory_kb: number | null;
  status_id: number | null;
  is_hidden?: boolean;
}

export interface CodeEvaluation {
  id: string;
  submission_id: string;
  readability_score: number | null;
  maintainability_score: number | null;
  efficiency_score: number | null;
  best_practices_score: number | null;
  optimization_score: number | null;
  overall_quality_score: number | null;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  created_at: Date;
}

export interface ExecutionLog {
  id: string;
  user_id: string;
  problem_version_id: string | null;
  assessment_session_id: string | null;
  practice_session_id: string | null;
  language: string;
  source_code: string;
  stdin: string | null;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  execution_time_ms: number | null;
  memory_kb: number | null;
  status: string;
  judge0_token: string | null;
  created_at: Date;
}

export interface Judge0SubmissionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
  token: string;
}

export interface RunCodeRequest {
  problemVersionId?: string;
  problemId?: string;
  language: CodingLanguage;
  sourceCode: string;
  stdin?: string;
  assessmentSessionId?: string;
  practiceSessionId?: string;
}

export interface SubmitCodeRequest {
  problemVersionId: string;
  language: CodingLanguage;
  sourceCode: string;
  assessmentSessionId?: string;
  practiceSessionId?: string;
  applicationId?: string;
}
