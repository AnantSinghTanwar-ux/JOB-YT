-- Coding Assessment Module (CODE-U1 to U5)

CREATE TYPE coding_problem_status AS ENUM ('draft', 'published');
CREATE TYPE coding_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE coding_assessment_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE assessment_timing AS ENUM ('during_apply', 'post_apply');
CREATE TYPE assessment_session_status AS ENUM ('pending', 'active', 'submitted', 'expired', 'completed');
CREATE TYPE coding_submission_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE coding_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  status coding_problem_status NOT NULL DEFAULT 'draft',
  current_version_number INT NOT NULL DEFAULT 0,
  difficulty coding_difficulty NOT NULL DEFAULT 'medium',
  supported_languages TEXT[] NOT NULL DEFAULT '{python,javascript,java,cpp}',
  description TEXT NOT NULL DEFAULT '',
  constraints TEXT,
  hints JSONB DEFAULT '[]'::jsonb,
  starter_code JSONB NOT NULL DEFAULT '{}'::jsonb,
  time_limit_sec INT NOT NULL DEFAULT 5,
  memory_limit_kb INT NOT NULL DEFAULT 128000,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (created_by, slug)
);

CREATE INDEX idx_coding_problems_created_by_status ON coding_problems(created_by, status);
CREATE INDEX idx_coding_problems_tags ON coding_problems USING GIN(tags);

CREATE TABLE coding_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL DEFAULT '',
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  weight INT NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  explanation TEXT
);

CREATE INDEX idx_coding_test_cases_problem ON coding_test_cases(problem_id, order_index);

CREATE TABLE problem_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT,
  hints JSONB DEFAULT '[]'::jsonb,
  difficulty coding_difficulty NOT NULL,
  supported_languages TEXT[] NOT NULL,
  starter_code JSONB NOT NULL DEFAULT '{}'::jsonb,
  time_limit_sec INT NOT NULL DEFAULT 5,
  memory_limit_kb INT NOT NULL DEFAULT 128000,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_by UUID NOT NULL REFERENCES users(id),
  snapshot_hash VARCHAR(64) NOT NULL,
  UNIQUE (problem_id, version_number)
);

CREATE TABLE problem_version_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_version_id UUID NOT NULL REFERENCES problem_versions(id) ON DELETE CASCADE,
  input TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL DEFAULT '',
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  weight INT NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  explanation TEXT
);

CREATE INDEX idx_pvtc_version ON problem_version_test_cases(problem_version_id, order_index);

CREATE TABLE problem_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_problem_collections_created_by ON problem_collections(created_by);

CREATE TABLE collection_problems (
  collection_id UUID NOT NULL REFERENCES problem_collections(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, problem_id)
);

CREATE TABLE coding_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status coding_assessment_status NOT NULL DEFAULT 'draft',
  current_version_number INT NOT NULL DEFAULT 0,
  passing_score INT NOT NULL DEFAULT 70,
  time_limit_minutes INT,
  max_attempts INT NOT NULL DEFAULT 1,
  assessment_timing assessment_timing NOT NULL DEFAULT 'post_apply',
  allow_resume BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coding_assessments_recruiter ON coding_assessments(recruiter_id);

CREATE TABLE assessment_problems (
  assessment_id UUID NOT NULL REFERENCES coding_assessments(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 100,
  PRIMARY KEY (assessment_id, problem_id)
);

CREATE TABLE assessment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES coding_assessments(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  passing_score INT NOT NULL DEFAULT 70,
  time_limit_minutes INT,
  max_attempts INT NOT NULL DEFAULT 1,
  assessment_timing assessment_timing NOT NULL,
  allow_resume BOOLEAN NOT NULL DEFAULT true,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_snapshot JSONB,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_by UUID NOT NULL REFERENCES users(id),
  snapshot_hash VARCHAR(64) NOT NULL,
  UNIQUE (assessment_id, version_number)
);

CREATE TABLE assessment_version_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  problem_version_id UUID NOT NULL REFERENCES problem_versions(id),
  order_index INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 100,
  problem_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_avp_version ON assessment_version_problems(assessment_version_id, order_index);

CREATE TABLE assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status assessment_session_status NOT NULL DEFAULT 'pending',
  remaining_time_seconds INT,
  attempt_number INT NOT NULL DEFAULT 1,
  last_heartbeat_at TIMESTAMPTZ,
  current_problem_index INT NOT NULL DEFAULT 0,
  metadata JSONB
);

CREATE INDEX idx_assessment_sessions_user_version ON assessment_sessions(user_id, assessment_version_id);
CREATE INDEX idx_assessment_sessions_application ON assessment_sessions(application_id);
CREATE INDEX idx_assessment_sessions_status_expires ON assessment_sessions(status, expires_at);

CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_version_id UUID NOT NULL REFERENCES problem_versions(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  best_score INT,
  attempts_count INT NOT NULL DEFAULT 0,
  solved BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_practice_sessions_user ON practice_sessions(user_id, started_at DESC);
CREATE INDEX idx_practice_sessions_user_problem ON practice_sessions(user_id, problem_version_id);

CREATE TABLE coding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_session_id UUID REFERENCES assessment_sessions(id) ON DELETE SET NULL,
  practice_session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  problem_version_id UUID NOT NULL REFERENCES problem_versions(id),
  assessment_version_id UUID REFERENCES assessment_versions(id),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  language VARCHAR(20) NOT NULL,
  source_code TEXT NOT NULL,
  status coding_submission_status NOT NULL DEFAULT 'pending',
  test_pass_count INT NOT NULL DEFAULT 0,
  test_total_count INT NOT NULL DEFAULT 0,
  score INT,
  passed BOOLEAN,
  execution_time_ms INT,
  memory_kb INT,
  assessment_snapshot JSONB,
  problem_snapshot JSONB,
  job_snapshot JSONB,
  judge0_tokens TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coding_submissions_user_created ON coding_submissions(user_id, created_at DESC);
CREATE INDEX idx_coding_submissions_session ON coding_submissions(assessment_session_id);
CREATE INDEX idx_coding_submissions_problem_user ON coding_submissions(problem_version_id, user_id, attempt_number);

CREATE TABLE submission_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES coding_submissions(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL,
  passed BOOLEAN NOT NULL,
  actual_output TEXT,
  stderr TEXT,
  time_sec DOUBLE PRECISION,
  memory_kb DOUBLE PRECISION,
  status_id INT
);

CREATE INDEX idx_submission_test_results_submission ON submission_test_results(submission_id);

CREATE TABLE code_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES coding_submissions(id) ON DELETE CASCADE,
  readability_score INT,
  maintainability_score INT,
  efficiency_score INT,
  best_practices_score INT,
  optimization_score INT,
  overall_quality_score INT,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_version_id UUID REFERENCES problem_versions(id) ON DELETE SET NULL,
  assessment_session_id UUID REFERENCES assessment_sessions(id) ON DELETE SET NULL,
  practice_session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  language VARCHAR(20) NOT NULL,
  source_code TEXT NOT NULL,
  stdin TEXT,
  stdout TEXT,
  stderr TEXT,
  compile_output TEXT,
  execution_time_ms INT,
  memory_kb INT,
  status VARCHAR(50) NOT NULL DEFAULT 'success',
  judge0_token VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_execution_logs_user_created ON execution_logs(user_id, created_at DESC);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS coding_assessment_id UUID REFERENCES coding_assessments(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS active_assessment_version_id UUID REFERENCES assessment_versions(id) ON DELETE SET NULL;
