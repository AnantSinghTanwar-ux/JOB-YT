-- Migration 008: Add manual override columns to applications table
-- These columns store manual override details provided by the employer.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS override_score   INTEGER  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS override_reason  TEXT     DEFAULT NULL;

COMMENT ON COLUMN applications.override_score IS 'Manually overridden match score 0-100 set by the employer. Prioritized over automatic scores if present.';
COMMENT ON COLUMN applications.override_reason IS 'Employer notes or reasoning justifying the manual score or decision override.';
