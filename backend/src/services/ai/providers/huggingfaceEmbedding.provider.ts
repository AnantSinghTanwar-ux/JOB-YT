import axios from 'axios';
import { EmbeddingProvider } from '../interfaces/embeddingProvider.interface';

const LOG_PREFIX = '[HuggingFaceEmbeddingProvider]';

export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  private readonly apiKey: string | null;
  private readonly model: string;

  constructor(apiKey: string | null = null, model = 'sentence-transformers/all-mpnet-base-v2') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`${LOG_PREFIX} Requesting embedding from model=${this.model}`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${this.model}`,
        { inputs: text },
        {
          headers,
          timeout: 15000, // 15s because Hugging Face Inference API cold-starts can take time
        }
      );

      let embedding = response.data;

      // Handle common response formats
      // Format 1: Direct number array [0.1, 0.2, ...]
      // Format 2: Batched number array [[0.1, 0.2, ...]]
      if (Array.isArray(embedding)) {
        if (Array.isArray(embedding[0])) {
          embedding = embedding[0];
        }
        
        const valid = embedding.every((num: any) => typeof num === 'number');
        if (valid && embedding.length > 0) {
          return embedding;
        }
      }

      throw new Error(`${LOG_PREFIX} Invalid response shape from HuggingFace API: ${JSON.stringify(embedding).slice(0, 100)}`);
    } catch (err: any) {
      const message = err.response?.data?.error || err.message;
      const status = err.response?.status ? `(${err.response.status})` : '';
      throw new Error(`${LOG_PREFIX} API Failure ${status}: ${message}`, { cause: err });
    }
  }
}
