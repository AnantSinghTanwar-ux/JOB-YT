/**
 * Embedding Cache Service
 *
 * Provides DB-level caching for embeddings to avoid redundant Gemini API calls.
 * Uses a SHA-256 hash of the input text as the cache key.
 *
 * Cache entries expire after 30 days by default.
 */

import pool from '../config/database';
import crypto from 'crypto';
import { EmbeddingVector, generateEmbedding } from '../utils/embedding';
import { aiConfig } from '../config/ai.config';

const LOG_PREFIX = '[EmbeddingCache]';

/** Whether the embedding_cache table exists (lazy-checked once). */
let cacheTableExists: boolean | null = null;

async function hasCacheTable(): Promise<boolean> {
  if (cacheTableExists !== null) return cacheTableExists;

  try {
    const { rows } = await pool.query(
      `SELECT 1
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'embedding_cache'
        LIMIT 1`,
    );
    cacheTableExists = rows.length > 0;
  } catch {
    cacheTableExists = false;
  }
  return cacheTableExists;
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

export const EmbeddingCacheService = {
  /**
   * Get a cached embedding or generate + cache a new one.
   * Returns null if generation fails or cache is unavailable.
   */
  async getOrGenerate(text: string): Promise<EmbeddingVector | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Isolate by provider and version
    const cacheKey = `${aiConfig.embeddingProvider}:${aiConfig.embeddingVersion}:${hashText(trimmed)}`;

    // 1. Try cache lookup
    if (await hasCacheTable()) {
      try {
        const { rows } = await pool.query(
          `SELECT embedding FROM embedding_cache
           WHERE cache_key = $1 AND (expires_at IS NULL OR expires_at > NOW())
           LIMIT 1`,
          [cacheKey],
        );

        if (rows.length > 0 && Array.isArray(rows[0].embedding)) {
          const emb = rows[0].embedding as EmbeddingVector;
          if (emb.length === aiConfig.embeddingDimensions) {
            console.log(`${LOG_PREFIX} Cache HIT for key ${cacheKey.slice(0, 12)}…`);
            return emb;
          } else {
            console.warn(`${LOG_PREFIX} Dimension mismatch for key ${cacheKey.slice(0, 12)}… Expected ${aiConfig.embeddingDimensions}, got ${emb.length}. Regenerating...`);
          }
        }
      } catch (err) {
        console.warn(`${LOG_PREFIX} Cache lookup failed, generating fresh:`, err);
      }
    }

    // 2. Generate embedding
    const embedding = await generateEmbedding(trimmed);
    if (!embedding) return null;

    // 3. Store in cache (fire-and-forget, non-blocking)
    if (await hasCacheTable()) {
      pool
        .query(
          `INSERT INTO embedding_cache (cache_key, embedding, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '30 days')
           ON CONFLICT (cache_key) DO UPDATE SET embedding = $2, expires_at = NOW() + INTERVAL '30 days'`,
          [cacheKey, JSON.stringify(embedding)],
        )
        .then(() => console.log(`${LOG_PREFIX} Cached embedding for key ${cacheKey.slice(0, 12)}…`))
        .catch((err) => console.warn(`${LOG_PREFIX} Cache write failed:`, err));
    }

    return embedding;
  },

  /**
   * Get the embedding for a candidate's resume, utilizing database-level caching under the key 'resume:${resumeId}:${provider}:${version}'.
   * If missing, downloads/extracts text, generates the embedding, caches it, and returns.
   */
  async getResumeEmbedding(resumeId: string, applicantId: string): Promise<EmbeddingVector | null> {
    if (!resumeId || !applicantId) return null;
    const cacheKey = `resume:${resumeId}:${aiConfig.embeddingProvider}:${aiConfig.embeddingVersion}`;

    // 1. Try cache lookup
    if (await hasCacheTable()) {
      try {
        const { rows } = await pool.query(
          `SELECT embedding FROM embedding_cache
           WHERE cache_key = $1 AND (expires_at IS NULL OR expires_at > NOW())
           LIMIT 1`,
          [cacheKey],
        );

        if (rows.length > 0 && Array.isArray(rows[0].embedding)) {
          const emb = rows[0].embedding as EmbeddingVector;
          if (emb.length === aiConfig.embeddingDimensions) {
            console.log(`${LOG_PREFIX} Cache HIT for resume key ${cacheKey}`);
            return emb;
          } else {
            console.warn(`${LOG_PREFIX} Dimension mismatch for resume key ${cacheKey}. Expected ${aiConfig.embeddingDimensions}, got ${emb.length}. Regenerating...`);
          }
        }
      } catch (err) {
        console.warn(`${LOG_PREFIX} Resume cache lookup failed:`, err);
      }
    }

    // 2. Cache MISS: Reconstruct resume text and generate embedding
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ResumeService } = require('./resume.service');
      const resumeText = await ResumeService.getResumeTextForUserResume(applicantId, resumeId);
      if (!resumeText) return null;

      const embedding = await this.getOrGenerate(resumeText);
      if (!embedding) return null;

      // 3. Store under the resume cache key (non-blocking)
      if (await hasCacheTable()) {
        pool
          .query(
            `INSERT INTO embedding_cache (cache_key, embedding, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '30 days')
             ON CONFLICT (cache_key) DO UPDATE SET embedding = $2, expires_at = NOW() + INTERVAL '30 days'`,
            [cacheKey, JSON.stringify(embedding)],
          )
          .then(() => console.log(`${LOG_PREFIX} Cached embedding for resume key ${cacheKey}`))
          .catch((err) => console.warn(`${LOG_PREFIX} Resume cache write failed:`, err));
      }

      return embedding;
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to retrieve/embed resume ${resumeId}:`, err);
      return null;
    }
  },

  /**
   * Store a job's description embedding directly in the jobs table.
   * This avoids a cache lookup on every ATS scoring request for the same job.
   */
  async storeJobEmbedding(jobId: string, embedding: EmbeddingVector): Promise<void> {
    try {
      await pool.query(
        `UPDATE jobs SET description_embedding = $1 WHERE id = $2`,
        [JSON.stringify(embedding), jobId],
      );
      console.log(`${LOG_PREFIX} Stored embedding for job ${jobId}`);
    } catch (err) {
      // Non-fatal: column may not exist yet if migration hasn't run
      console.warn(`${LOG_PREFIX} Failed to store job embedding (column may not exist):`, err);
    }
  },

  /**
   * Retrieve a job's cached description embedding from the jobs table.
   */
  async getJobEmbedding(jobId: string): Promise<EmbeddingVector | null> {
    try {
      const { rows } = await pool.query(
        `SELECT description_embedding FROM jobs WHERE id = $1 LIMIT 1`,
        [jobId],
      );
      const emb = rows[0]?.description_embedding;
      if (Array.isArray(emb) && emb.length === aiConfig.embeddingDimensions) {
        return emb as EmbeddingVector;
      } else if (Array.isArray(emb)) {
        console.warn(`${LOG_PREFIX} Job embedding dimension mismatch for job ${jobId}. Expected ${aiConfig.embeddingDimensions}, got ${emb.length}.`);
      }
    } catch {
      // Column may not exist — that's OK
    }
    return null;
  },

  /**
   * Try to find a stored embedding for a job by matching its description text.
   * This is a fast-path: checks the jobs table for a pre-stored embedding
   * before falling back to the general cache or HuggingFace.
   *
   * Uses a substring match on the first 200 chars of description to find the job.
   */
  async getJobEmbeddingByText(description: string): Promise<EmbeddingVector | null> {
    const trimmed = description.trim();
    if (!trimmed) return null;

    try {
      // Match by first 200 chars of description to find the corresponding job
      const { rows } = await pool.query(
        `SELECT description_embedding FROM jobs
         WHERE description_embedding IS NOT NULL
           AND LEFT(description, 200) = LEFT($1, 200)
         LIMIT 1`,
        [trimmed],
      );
      const emb = rows[0]?.description_embedding;
      if (Array.isArray(emb) && emb.length === aiConfig.embeddingDimensions) {
        console.log(`${LOG_PREFIX} Job embedding found via text match (fast-path)`);
        return emb as EmbeddingVector;
      }
    } catch {
      // Column may not exist or query failed — fall through
    }
    return null;
  },
};
