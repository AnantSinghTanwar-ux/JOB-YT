-- Migration 007: Create AI interview MVP tables
-- Supports text async mock interview sessions, generated questions,
-- student responses, reports, and long-term readiness tracking.

CREATE TABLE IF NOT EXISTS ai_interview_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type    VARCHAR(30) NOT NULL DEFAULT 'text_async',
  mode            VARCHAR(30) NOT NULL DEFAULT 'mock',
  role_title      VARCHAR(255) NOT NULL,
  job_description TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'created',
  overall_score   INTEGER,
  rubric_scores   JSONB,
  completed_at    TIMESTAMPTZ,
  report_url      VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ai_interview_sessions_session_type
    CHECK (session_type IN ('text_async')),
  CONSTRAINT chk_ai_interview_sessions_mode
    CHECK (mode IN ('mock')),
  CONSTRAINT chk_ai_interview_sessions_status
    CHECK (status IN (
      'created',
      'questions_generated',
      'in_progress',
      'completed',
      'evaluated',
      'report_generated'
    )),
  CONSTRAINT chk_ai_interview_sessions_overall_score
    CHECK (overall_score IS NULL OR overall_score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES ai_interview_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category      VARCHAR(30) NOT NULL,
  order_index   INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_interview_questions_category
    CHECK (category IN ('behavioral', 'situational', 'technical')),
  CONSTRAINT chk_interview_questions_order_index
    CHECK (order_index > 0),
  CONSTRAINT uq_interview_questions_session_order
    UNIQUE (session_id, order_index)
);

CREATE TABLE IF NOT EXISTS interview_responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id   UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL REFERENCES ai_interview_sessions(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  ai_score      INTEGER,
  rubric_scores JSONB,
  ai_feedback   JSONB,
  evaluated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_interview_responses_ai_score
    CHECK (ai_score IS NULL OR ai_score BETWEEN 0 AND 100),
  CONSTRAINT uq_interview_responses_session_question_student
    UNIQUE (session_id, question_id, student_id)
);

CREATE TABLE IF NOT EXISTS interview_reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL UNIQUE REFERENCES ai_interview_sessions(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id            UUID REFERENCES jobs(id) ON DELETE SET NULL,
  overall_score     INTEGER NOT NULL,
  rubric_scores     JSONB NOT NULL,
  summary_text      TEXT NOT NULL,
  strengths         JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses        JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations   JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_url        VARCHAR(500),
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_interview_reports_overall_score
    CHECK (overall_score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS student_readiness_scores (
  student_id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_score             INTEGER NOT NULL DEFAULT 0,
  trend                     VARCHAR(30) NOT NULL DEFAULT 'stable',
  last_interview_session_id UUID REFERENCES ai_interview_sessions(id) ON DELETE SET NULL,
  last_updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_student_readiness_scores_current_score
    CHECK (current_score BETWEEN 0 AND 100),
  CONSTRAINT chk_student_readiness_scores_trend
    CHECK (trend IN ('improving', 'declining', 'stable'))
);

CREATE TABLE IF NOT EXISTS readiness_score_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES ai_interview_sessions(id) ON DELETE CASCADE,
  previous_score  INTEGER,
  interview_score INTEGER NOT NULL,
  new_score       INTEGER NOT NULL,
  trend           VARCHAR(30) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_readiness_score_history_previous_score
    CHECK (previous_score IS NULL OR previous_score BETWEEN 0 AND 100),
  CONSTRAINT chk_readiness_score_history_interview_score
    CHECK (interview_score BETWEEN 0 AND 100),
  CONSTRAINT chk_readiness_score_history_new_score
    CHECK (new_score BETWEEN 0 AND 100),
  CONSTRAINT chk_readiness_score_history_trend
    CHECK (trend IN ('improving', 'declining', 'stable')),
  CONSTRAINT uq_readiness_score_history_student_session
    UNIQUE (student_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_interview_sessions_student_created_at
  ON ai_interview_sessions (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interview_sessions_student_status
  ON ai_interview_sessions (student_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_interview_sessions_status
  ON ai_interview_sessions (status);
CREATE INDEX IF NOT EXISTS idx_ai_interview_sessions_job_id
  ON ai_interview_sessions (job_id);

CREATE INDEX IF NOT EXISTS idx_interview_questions_session_order
  ON interview_questions (session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_interview_questions_category
  ON interview_questions (category);

CREATE INDEX IF NOT EXISTS idx_interview_responses_session
  ON interview_responses (session_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_student_created_at
  ON interview_responses (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_responses_question
  ON interview_responses (question_id);

CREATE INDEX IF NOT EXISTS idx_interview_reports_student_generated_at
  ON interview_reports (student_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_reports_job_id
  ON interview_reports (job_id);

CREATE INDEX IF NOT EXISTS idx_student_readiness_scores_updated_at
  ON student_readiness_scores (last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_readiness_score_history_student_created_at
  ON readiness_score_history (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readiness_score_history_session
  ON readiness_score_history (session_id);
