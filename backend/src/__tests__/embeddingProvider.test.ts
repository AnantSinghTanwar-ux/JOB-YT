import { EmbeddingProviderResolver } from '../services/ai/providers/embedding.provider';
import { HuggingFaceEmbeddingProvider } from '../services/ai/providers/huggingfaceEmbedding.provider';
import { aiConfig } from '../config/ai.config';
import axios from 'axios';

jest.mock('axios');

describe('Embedding Providers and Factory Architecture', () => {
  // Preserve original config
  const originalEmbeddingsConfigured = aiConfig.embeddingsConfigured;
  const originalEmbeddingProvider = aiConfig.embeddingProvider;
  const originalHuggingfaceApiKey = aiConfig.huggingfaceApiKey;
  const originalEmbeddingModel = aiConfig.embeddingModel;
  const originalEmbeddingDimensions = aiConfig.embeddingDimensions;

  afterAll(() => {
    // Restore config
    (aiConfig as any).embeddingsConfigured = originalEmbeddingsConfigured;
    (aiConfig as any).embeddingProvider = originalEmbeddingProvider;
    (aiConfig as any).huggingfaceApiKey = originalHuggingfaceApiKey;
    (aiConfig as any).embeddingModel = originalEmbeddingModel;
    (aiConfig as any).embeddingDimensions = originalEmbeddingDimensions;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should instantiate the correct provider using the resolver factory', () => {
    (aiConfig as any).embeddingsConfigured = true;

    // 1. Test HuggingFace Configuration (Authenticated)
    (aiConfig as any).embeddingProvider = 'huggingface';
    (aiConfig as any).huggingfaceApiKey = 'test-hf-key';
    (aiConfig as any).embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';

    const hfProvider = EmbeddingProviderResolver.resolve();
    expect(hfProvider).toBeInstanceOf(HuggingFaceEmbeddingProvider);

    // 2. Test HuggingFace Configuration (Unauthenticated fallback)
    (aiConfig as any).huggingfaceApiKey = null;
    const hfUnauthProvider = EmbeddingProviderResolver.resolve();
    expect(hfUnauthProvider).toBeInstanceOf(HuggingFaceEmbeddingProvider);
  });

  it('should generate embeddings successfully using HuggingFaceEmbeddingProvider', async () => {
    // Simulated nested array shape from HF (384 dimensions)
    const mockResponse = {
      data: [new Array(384).fill(0.2)]
    };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    const provider = new HuggingFaceEmbeddingProvider('test-key', 'sentence-transformers/all-MiniLM-L6-v2');
    const vector = await provider.generateEmbedding('hello');

    expect(vector).toHaveLength(384);
    expect(vector[0]).toBe(0.2);
    expect(axios.post).toHaveBeenCalledWith(
      'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      { inputs: 'hello' },
      expect.any(Object)
    );
  });

  it('should support unauthenticated calls with HuggingFaceEmbeddingProvider', async () => {
    const mockResponse = {
      data: [new Array(384).fill(0.3)]
    };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    // No key provided
    const provider = new HuggingFaceEmbeddingProvider(null, 'sentence-transformers/all-MiniLM-L6-v2');
    const vector = await provider.generateEmbedding('hello');

    expect(vector).toHaveLength(384);
    expect(vector[0]).toBe(0.3);
    
    // Check that Authorization header was omitted
    expect(axios.post).toHaveBeenCalledWith(
      'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      { inputs: 'hello' },
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'Authorization': expect.any(String)
        })
      })
    );
  });
});
