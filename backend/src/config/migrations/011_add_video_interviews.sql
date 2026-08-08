CREATE TYPE video_processing_status AS ENUM (
  'UPLOADING',
  'UPLOADED',
  'TRANSCRIBING',
  'TRANSCRIBED',
  'EVALUATING',
  'COMPLETED',
  'FAILED'
);

CREATE TABLE video_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  video_url VARCHAR(500) NOT NULL,
  status video_processing_status NOT NULL DEFAULT 'UPLOADING',
  transcript TEXT,
  segmented_transcript JSONB,
  timestamps JSONB,
  confidence DOUBLE PRECISION,
  language VARCHAR(50),
  evaluation_scores JSONB,
  employer_notes TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_video_interviews_application ON video_interviews(application_id);
CREATE INDEX idx_video_interviews_candidate ON video_interviews(candidate_id);
CREATE INDEX idx_video_interviews_status ON video_interviews(status);

CREATE TABLE video_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_version VARCHAR(50) NOT NULL,
  consent_timestamp TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  retention_expiry TIMESTAMPTZ(6) NOT NULL,
  video_expiry TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_video_consents_candidate ON video_consents(candidate_id);
