-- Migration 005: Add embedding columns for semantic search
-- Safe to run multiple times (all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- 1. Add description_embedding column to jobs table
--    Stored as JSONB (float array) for compatibility with existing cache infrastructure.
--    NULL by default — rows are populated lazily when the job is accessed for ATS scoring.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description_embedding JSONB;

-- 2. Create embedding_cache table for general-purpose text embedding reuse
--    cache_key: SHA-256 hex digest of the normalised input text (64 chars)
--    embedding: float array serialised as JSON
--    expires_at: NULL means non-expiring; populated rows default to 30-day TTL
CREATE TABLE IF NOT EXISTS embedding_cache (
  cache_key  VARCHAR(64) PRIMARY KEY,
  embedding  JSONB        NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Index to support efficient TTL cleanup (DELETE WHERE expires_at < NOW())
CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires
  ON embedding_cache (expires_at)
  WHERE expires_at IS NOT NULL;
