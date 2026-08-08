-- Migration 009: Add proctoring violations tracking to interviews table
-- Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS)

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS proctoring_violations JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN interviews.proctoring_violations IS 'List of proctoring violation logs during the live interview session.';
