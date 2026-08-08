-- Migration 007: Create interviews table for live technical interviews

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum type if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_status') THEN
    CREATE TYPE interview_status AS ENUM ('scheduled', 'live', 'completed', 'cancelled');
  END IF;
END
$$;

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  interviewer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          interview_status NOT NULL DEFAULT 'scheduled',
  code_content    TEXT,
  code_language   VARCHAR(50) DEFAULT 'javascript',
  notes           TEXT, -- Private interviewer notes
  feedback        TEXT, -- Shared feedback
  rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search optimization and joins
CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at DESC);
