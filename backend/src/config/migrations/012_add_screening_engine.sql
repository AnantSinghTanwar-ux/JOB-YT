-- Migration 012_add_screening_engine.sql
-- Adds fields and tables for the AI Resume Parsing and Screening Engine

-- 1. Add new fields to applications table
ALTER TABLE applications
ADD COLUMN rank INTEGER,
ADD COLUMN percentile FLOAT,
ADD COLUMN ai_recommended BOOLEAN DEFAULT FALSE,
ADD COLUMN screening_score FLOAT,
ADD COLUMN scoring_breakdown JSONB;

-- 2. Add new fields to jobs table
ALTER TABLE jobs
ADD COLUMN structured_jd JSONB;

-- 3. Create employer_settings table
CREATE TABLE employer_settings (
  recruiter_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  scoring_weights JSONB DEFAULT '{"experience": 0.22, "skills": 0.17, "education": 0.12, "semantic": 0.20, "keywords": 0.14}',
  recommended_percentage INTEGER DEFAULT 10,
  digest_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create screening_audits table
CREATE TABLE screening_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  resume_id UUID,
  job_id UUID NOT NULL,
  parsed_resume JSONB,
  parsed_jd JSONB,
  embeddings_metadata JSONB,
  scoring_breakdown JSONB,
  screening_score FLOAT,
  explanation JSONB,
  prompt_version VARCHAR(50),
  model_version VARCHAR(50),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_screening_audits_app ON screening_audits(application_id);
CREATE INDEX idx_screening_audits_job ON screening_audits(job_id);
