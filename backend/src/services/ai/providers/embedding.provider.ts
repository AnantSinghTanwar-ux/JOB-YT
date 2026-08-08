import { aiConfig } from '../../../config/ai.config';
import { EmbeddingProvider } from '../interfaces/embeddingProvider.interface';
import { HuggingFaceEmbeddingProvider } from './huggingfaceEmbedding.provider';

const LOG_PREFIX = '[EmbeddingProviderResolver]';

export const EmbeddingProviderResolver = {
  /**
   * Resolve and return the active concrete EmbeddingProvider.
   * Returns null if embedding is not configured.
   */
  resolve(): EmbeddingProvider | null {
    if (!aiConfig.embeddingsConfigured) {
      console.warn(`${LOG_PREFIX} Embeddings are not fully configured.`);
      return null;
    }

    const providerType = aiConfig.embeddingProvider.toLowerCase().trim();

    try {
      if (providerType === 'huggingface') {
        // HuggingFace accepts optional key for unauthenticated mode
        return new HuggingFaceEmbeddingProvider(
          aiConfig.huggingfaceApiKey,
          aiConfig.embeddingModel || 'sentence-transformers/all-MiniLM-L6-v2'
        );
      }

      throw new Error(`Unsupported embedding provider: "${aiConfig.embeddingProvider}"`);
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Failed to instantiate active embedding provider (${providerType}):`, err.message);
      return null;
    }
  }
};
