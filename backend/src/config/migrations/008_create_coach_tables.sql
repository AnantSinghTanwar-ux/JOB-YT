-- Create coach_sessions and coach_messages tables for AI Career Coach

CREATE TABLE IF NOT EXISTS coach_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL,
  mode                VARCHAR(30) NOT NULL DEFAULT 'general',
  context_summary     TEXT,
  context_updated_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_coach_sessions_mode CHECK (mode IN ('general', 'resume_review', 'interview_prep', 'career_advice', 'salary_negotiation'))
);

CREATE TABLE IF NOT EXISTS coach_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id       UUID NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
  sender           VARCHAR(10) NOT NULL,
  message_text     TEXT NOT NULL,
  feedback         VARCHAR(10),
  feedback_comment TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_coach_messages_sender CHECK (sender IN ('user', 'ai')),
  CONSTRAINT chk_coach_messages_feedback CHECK (feedback IN ('up', 'down'))
);

CREATE INDEX IF NOT EXISTS idx_coach_sessions_student ON coach_sessions (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_messages_session ON coach_messages (session_id, created_at ASC);
