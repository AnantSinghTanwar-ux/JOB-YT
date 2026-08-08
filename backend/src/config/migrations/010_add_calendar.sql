-- Migration 010: add calendar fields to pipeline_events + google_calendar_tokens table

ALTER TABLE pipeline_events ADD COLUMN IF NOT EXISTS calendar_event_id VARCHAR(255);
ALTER TABLE pipeline_events ADD COLUMN IF NOT EXISTS meet_link VARCHAR(500);
ALTER TABLE pipeline_events ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE pipeline_events ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 60;

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
