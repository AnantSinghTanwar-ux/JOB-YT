import { AIService } from '../services/ai.service';
import { EmbeddingCacheService } from '../services/embeddingCache.service';
import { aiConfig } from '../config/ai.config';
import pool from '../config/database';
import axios from 'axios';

jest.mock('axios');
jest.mock('../config/database', () => {
  const mPool = {
    query: jest.fn(),
  };
  return mPool;
});

describe('AI Infrastructure Integration Tests (Groq + HuggingFace)', () => {
  // Preserve original config
  const originalEmbeddingDimensions = aiConfig.embeddingDimensions;
  const originalEmbeddingProvider = aiConfig.embeddingProvider;
  const originalEmbeddingVersion = aiConfig.embeddingVersion;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    (aiConfig as any).embeddingDimensions = originalEmbeddingDimensions;
    (aiConfig as any).embeddingProvider = originalEmbeddingProvider;
    (aiConfig as any).embeddingVersion = originalEmbeddingVersion;
  });

  describe('HuggingFace Embedding & Unauthenticated Mode', () => {
    it('should successfully request an embedding from HuggingFace and mock the correct output size', async () => {
      const testText = 'Hiring technical manager for open-source AI platform';
      const mockResult = [new Array(384).fill(0.5)];
      
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockResult });

      (aiConfig as any).embeddingProvider = 'huggingface';
      (aiConfig as any).embeddingDimensions = 384;
      (aiConfig as any).embeddingVersion = 'v2';

      const embedding = await AIService.generateEmbedding(testText);
      expect(embedding).toHaveLength(384);
      expect(embedding![0]).toBe(0.5);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('sentence-transformers/all-MiniLM-L6-v2'),
        { inputs: testText },
        expect.any(Object)
      );
    });

    it('should handle HuggingFace Inference API errors and fall back safely without throwing', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('503 Service Unavailable'));

      const embedding = await AIService.generateEmbedding('some test text');
      expect(embedding).toBeNull();
    });
  });

  describe('Dimension Mismatch and Lazy Re-embedding Cache Guard', () => {
    it('should discard cached embeddings of incorrect dimensions and trigger regeneration', async () => {
      (aiConfig as any).embeddingDimensions = 384;
      (aiConfig as any).embeddingProvider = 'huggingface';
      (aiConfig as any).embeddingVersion = 'v2';

      // Mock database checking that the table exists
      (pool.query as jest.Mock).mockImplementation((queryText: string, params?: any[]) => {
        if (queryText.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ '1': 1 }] });
        }
        if (queryText.includes('SELECT embedding FROM embedding_cache')) {
          // Return a stale 768-dimension Gemini vector to simulate a mismatch
          return Promise.resolve({
            rows: [{ embedding: new Array(768).fill(0.9) }],
          });
        }
        if (queryText.includes('INSERT INTO')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Mock new HuggingFace embedding call returning correct 384 dims
      const mockHFResult = [new Array(384).fill(0.7)];
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockHFResult });

      const result = await EmbeddingCacheService.getOrGenerate('fresh resume context');

      // Should detect mismatch, regenerate, and return the new 384-dimensional vector
      expect(result).toHaveLength(384);
      expect(result![0]).toBe(0.7);
      
      // Axios should have been called since cache was discarded
      expect(axios.post).toHaveBeenCalled();
    });

    it('should preserve cache hit if dimensions match perfectly', async () => {
      (aiConfig as any).embeddingDimensions = 384;

      (pool.query as jest.Mock).mockImplementation((queryText: string, params?: any[]) => {
        if (queryText.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ '1': 1 }] });
        }
        if (queryText.includes('SELECT embedding FROM embedding_cache')) {
          // Return matching 384-dimension vector
          return Promise.resolve({
            rows: [{ embedding: new Array(384).fill(0.6) }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await EmbeddingCacheService.getOrGenerate('matching text');

      expect(result).toHaveLength(384);
      expect(result![0]).toBe(0.6);
      
      // Axios should NOT have been called (Cache Hit)
      expect(axios.post).not.toHaveBeenCalled();
    });
  });
});
