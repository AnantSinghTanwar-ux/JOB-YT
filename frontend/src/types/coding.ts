export type CodingLanguage = 'python' | 'javascript' | 'java' | 'cpp';

export interface SampleTestCase {
  input: string;
  expected_output: string;
  explanation?: string | null;
}

export interface ProblemVersion {
  id: string;
  problem_id: string;
  version_number: number;
  title: string;
  description: string;
  constraints: string | null;
  hints: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  supported_languages: string[];
  starter_code: Record<string, string>;
  time_limit_sec: number;
  memory_limit_kb: number;
  published_at?: string;
  published_by?: string;
  snapshot_hash?: string;
  sample_cases?: SampleTestCase[];
}

export interface RunResult {
  passed: boolean;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: number | null;
  memory: number | null;
}

export interface CodingSubmission {
  id: string;
  problem_version_id: string;
  language: string;
  source_code: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempt_number: number;
  test_pass_count: number;
  test_total_count: number;
  score: number | null;
  passed: boolean | null;
  passFailSource?: string;
  created_at: string;
  testResults?: Array<{
    passed: boolean;
    is_hidden?: boolean;
    actual_output?: string | null;
    time_sec?: number | null;
  }>;
  evaluation?: CodeEvaluation | null;
}

export interface CodeEvaluation {
  readability_score: number | null;
  maintainability_score: number | null;
  efficiency_score: number | null;
  best_practices_score: number | null;
  optimization_score: number | null;
  overall_quality_score: number | null;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  disclaimer?: string;
}

export interface AssessmentSession {
  id: string;
  assessment_version_id: string;
  status: string;
  remaining_time_seconds: number | null;
  expires_at: string | null;
  attempt_number: number;
  current_problem_index: number;
}

export interface CodingProblem {
  id: string;
  title: string;
  slug: string;
  status: string;
  current_version_number?: number;
  difficulty: string;
  supported_languages: string[];
  description: string;
  constraints: string | null;
  hints: string[];
  starter_code: Record<string, string>;
  test_cases?: Array<{
    id: string;
    input: string;
    expected_output: string;
    is_hidden: boolean;
    is_sample: boolean;
    weight: number;
    order_index: number;
    explanation?: string | null;
  }>;
}

export interface CodingAssessment {
  id: string;
  title: string;
  description: string | null;
  status: string;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number;
  assessment_timing: string;
  allow_resume: boolean;
  problems?: CodingProblem[];
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
  assessment_timing: string;
  allow_resume: boolean;
  published_at: string;
  snapshot_hash: string;
}

export interface SubmissionReview extends CodingSubmission {
  passFailSource?: string;
  testResults?: Array<{
    passed: boolean;
    is_hidden?: boolean;
    actual_output?: string | null;
    stderr?: string | null;
    time_sec?: number | null;
    memory_kb?: number | null;
  }>;
  evaluation?: CodeEvaluation | null;
  problem_snapshot?: Record<string, unknown> | null;
  assessment_snapshot?: Record<string, unknown> | null;
  job_snapshot?: Record<string, unknown> | null;
}

export interface ProblemCollection {
  id: string;
  name: string;
  description: string | null;
  problem_count?: number;
}

export interface PracticeSession {
  id: string;
  problem_version_id: string;
  started_at: string;
  solved: boolean;
  attempts_count: number;
  best_score: number | null;
}
