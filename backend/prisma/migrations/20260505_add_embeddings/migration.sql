-- Migration: Add embedding columns for semantic ATS matching
-- Stores embeddings as JSONB arrays (avoids pgvector extension requirement)
-- These columns are nullable — existing rows remain unaffected.

-- Job description embeddings (generated on job create/update)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS description_embedding JSONB DEFAULT NULL;

-- Resume embeddings cache (generated on ATS scoring, keyed by resume hash)
CREATE TABLE IF NOT EXISTS embedding_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   VARCHAR(128) UNIQUE NOT NULL,  -- SHA-256 hash of the input text
  embedding   JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_key ON embedding_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires ON embedding_cache (expires_at);

-- Cleanup: remove expired cache entries (run periodically or via cron)
-- DELETE FROM embedding_cache WHERE expires_at < NOW();
