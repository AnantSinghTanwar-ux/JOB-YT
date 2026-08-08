-- Migration 013: Add AI interview config columns to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS ai_interview_type       VARCHAR(30)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_interview_rubric     TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_interview_threshold  INTEGER      DEFAULT NULL;

COMMENT ON COLUMN jobs.ai_interview_type IS 'Type of AI interview (technical, behavioral, hybrid) configured for this job.';
COMMENT ON COLUMN jobs.ai_interview_rubric IS 'Specific evaluation criteria or rubric guidelines for the AI evaluator.';
COMMENT ON COLUMN jobs.ai_interview_threshold IS 'Minimum passing match score (0-100) required to auto-shortlist candidates.';
