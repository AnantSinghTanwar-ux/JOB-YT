-- Add external_url column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_url VARCHAR(2048) NULL;

-- Add partial unique index to prevent duplicate external URLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_url ON jobs(external_url) WHERE external_url IS NOT NULL;
