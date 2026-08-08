/**
 * Embedding Utility
 *
 * Generates text embeddings via the centralized AI service
 * and provides cosine similarity for semantic matching.
 *
 * Migrated from @google/generative-ai to @google/genai SDK.
 * All consumers continue to import from this file — no breaking changes.
 *
 * Design decisions:
 *   - Embeddings are 768-dimensional float arrays.
 *   - Cosine similarity returns a normalised 0–1 score.
 *   - All errors are caught and logged; callers receive `null` on failure
 *     so the system can fall back to keyword scoring gracefully.
 */

import { AIService } from '../services/ai.service';



export type EmbeddingVector = number[];

// ── Embedding generation (delegated to AIService) ────────────────────────────

/**
 * Generate an embedding vector for a given text string.
 *
 * Returns `null` when the API key is missing, input is empty, or the
 * request fails — allowing callers to fall back to keyword scoring.
 *
 * Signature and return type are unchanged from the original implementation.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingVector | null> {
  return AIService.generateEmbedding(text);
}

// ── Cosine similarity ────────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two embedding vectors.
 *
 * Returns a value in [0, 1] where 1 = identical direction.
 * Returns `null` if either vector is missing or they have different lengths.
 */
export function cosineSimilarity(
  a: EmbeddingVector | null | undefined,
  b: EmbeddingVector | null | undefined,
): number | null {
  if (!a || !b || a.length !== b.length || a.length === 0) {
    return null;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (magnitude === 0) return 0;

  // Clamp to [0, 1] — negative similarity is treated as 0 (no match)
  const similarity = dotProduct / magnitude;
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Convert a cosine similarity score (0–1) to a human-readable percentage (0–100).
 */
export function similarityToScore(similarity: number | null): number {
  if (similarity === null) return 0;
  
  // Clamp similarity to [0, 1]
  const s = Math.max(0, Math.min(1, similarity));

  // Gemini embedding cosine similarity for related texts usually clusters between 0.55 and 0.85.
  // Unrelated texts typically fall below 0.50.
  // We map these ranges to standard 0-100 score bands:
  //   s >= 0.85  -> 90-100 (Excellent)
  //   s >= 0.70  -> 70-89  (Good/Strong)
  //   s >= 0.55  -> 40-69  (Average/Moderate)
  //   s >= 0.40  -> 15-39  (Poor/Weak)
  //   s < 0.40   -> 0-14
  if (s >= 0.85) {
    // Map [0.85, 1.0] -> [90, 100]
    const fraction = Math.round(((s - 0.85) / 0.15) * 10000) / 10000;
    return Math.round(90 + fraction * 10);
  }
  if (s >= 0.70) {
    // Map [0.70, 0.85] -> [70, 89]
    const fraction = Math.round(((s - 0.70) / 0.15) * 10000) / 10000;
    return Math.round(70 + fraction * 19);
  }
  if (s >= 0.55) {
    // Map [0.55, 0.70] -> [40, 69]
    const fraction = Math.round(((s - 0.55) / 0.15) * 10000) / 10000;
    return Math.round(40 + fraction * 29);
  }
  if (s >= 0.40) {
    // Map [0.40, 0.55] -> [15, 39]
    const fraction = Math.round(((s - 0.40) / 0.15) * 10000) / 10000;
    return Math.round(15 + fraction * 24);
  }
  // Map [0.0, 0.40] -> [0, 14]
  return Math.round((s / 0.40) * 14);
}
