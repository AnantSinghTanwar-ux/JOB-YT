-- Migration: Add ATS score columns to applications table
-- These columns store the computed ATS match score and breakdown at application submission time.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ats_score     INTEGER  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ats_breakdown JSONB    DEFAULT NULL;

-- Optional: index for sorting/filtering by score on recruiter side
CREATE INDEX IF NOT EXISTS idx_applications_ats_score ON applications (ats_score);

COMMENT ON COLUMN applications.ats_score IS 'Deterministic ATS score 0–100 computed at application time. NULL for applications submitted before this feature was added.';
COMMENT ON COLUMN applications.ats_breakdown IS 'JSON breakdown: { skillsScore, experienceScore, keywordsScore, matchedSkills, missingSkills }';
