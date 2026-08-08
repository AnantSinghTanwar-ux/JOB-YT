-- Migration 005: Add AI Insights fields to applications table
-- Run: npx ts-node src/scripts/runMigration.ts 005_add_ai_insights_to_applications.sql

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS fit_insights TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS improvement_suggestions TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insights_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS insights_generated_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insights_approved_at TIMESTAMPTZ DEFAULT NULL;

-- Index for the 7-day auto-approve cron query
CREATE INDEX IF NOT EXISTS idx_applications_insights_pending
  ON applications (insights_generated_at)
  WHERE insights_approved = FALSE AND insights_generated_at IS NOT NULL;
