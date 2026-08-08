-- Migration 008: add api_activity_logs table for API usage tracking

CREATE TABLE IF NOT EXISTS api_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id UUID,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INT NOT NULL,
  latency_ms INT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_api_key ON api_activity_logs (api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_created ON api_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_endpoint ON api_activity_logs (endpoint, created_at DESC);
