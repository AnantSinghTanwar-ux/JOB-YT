/**
 * Embedding Provider Interface
 *
 * Contract for generating text embeddings.
 */
export interface EmbeddingProvider {
  /**
   * Generate an embedding vector for a given text.
   * Must throw on errors so caller's retry/circuit-breaker logic applies.
   *
   * @param text The input text to embed
   * @returns A float array representing the embedding vector
   */
  generateEmbedding(text: string): Promise<number[]>;
}
