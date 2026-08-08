-- Migration 006: Add hybrid scoring columns to applications table
-- Safe to run multiple times (all statements use ADD COLUMN IF NOT EXISTS)
--
-- These columns persist the output of UnifiedMatchService so scores are not
-- recomputed on every recruiter page load. All columns are NULLABLE so
-- existing rows (before scoring) are not affected.

ALTER TABLE applications ADD COLUMN IF NOT EXISTS final_match_score   INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS semantic_score       INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS skills_score         INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS experience_score     INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS keyword_score        INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS education_score      INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS scoring_version      VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS scored_at            TIMESTAMPTZ;

-- Index to allow fast lookup of unscored applications (e.g. for background backfill)
CREATE INDEX IF NOT EXISTS idx_applications_unscored
  ON applications (created_at DESC)
  WHERE final_match_score IS NULL;

-- Index to support ranking applications by score for a given job
CREATE INDEX IF NOT EXISTS idx_applications_job_score
  ON applications (job_id, final_match_score DESC NULLS LAST)
  WHERE final_match_score IS NOT NULL;
