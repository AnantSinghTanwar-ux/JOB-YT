-- Migration: Add AI reasoning fields to applications table
-- Stores pre-generated AI insights per application.
-- All columns are nullable — existing rows are unaffected.
-- Generated once on first recruiter view, then cached.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_strengths               JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_weaknesses              JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_summary                 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_reasoning_generated_at  TIMESTAMPTZ DEFAULT NULL;

-- Index to quickly identify applications that still need AI analysis
CREATE INDEX IF NOT EXISTS idx_applications_ai_generated_at
  ON applications (ai_reasoning_generated_at)
  WHERE ai_reasoning_generated_at IS NULL;
