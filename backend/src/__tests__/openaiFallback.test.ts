import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { AIService } from '../services/ai.service';
import { aiConfig } from '../config/ai.config';
import { AIProviderError } from '../services/ai/interfaces/aiProvider.interface';

jest.mock('../services/ai/aiResponseCache.service', () => ({
  AIResponseCache: {
    generateKey: () => 'mock_cache_key',
    getCache: jest.fn(() => Promise.resolve(null)),
    setCache: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../services/ai/aiUsageTracker.service', () => ({
  AIUsageTracker: {
    logUsage: jest.fn(() => Promise.resolve()),
  },
}));

describe('Claude to OpenAI Fallback Integration', () => {
  let mockFetch: any;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    AIService.resetCircuits();
    mockFetch = jest.fn();
    global.fetch = mockFetch as any;

    // Force configurations for testing
    (aiConfig as any).isConfigured = true;
    (aiConfig as any).anthropicApiKey = 'mock-anthropic-key';
    (aiConfig as any).anthropicModel = 'claude-3-5-sonnet-mock';
    (aiConfig as any).openaiApiKey = 'mock-openai-key';
    (aiConfig as any).openaiModel = 'gpt-4o-mock';
    (aiConfig as any).maxRetries = 1;
    (aiConfig as any).circuitBreakerThreshold = 2;
    (aiConfig as any).timeoutMs = 5000;
  });

  it('should return Claude response directly if Claude succeeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Claude success response' }]
      })
    } as any);

    const result = await AIService.generateText('hello', { provider: 'claude' });
    expect(result).toBe('Claude success response');
    
    // Verify fetch was only called once (for Claude)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const firstCallUrl = mockFetch.mock.calls[0][0];
    expect(firstCallUrl).toBe('https://api.anthropic.com/v1/messages');
  });

  it('should fallback to OpenAI on Claude credit balance too low (400 billing error)', async () => {
    // 1st call (Claude): 400 with credit balance too low
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({
        error: {
          type: 'invalid_request_error',
          message: 'Your credit balance is too low to access the Anthropic API.'
        }
      }))
    } as any);

    // 2nd call (OpenAI fallback): 200 success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'OpenAI fallback response' } }]
      })
    } as any);

    const result = await AIService.generateText('hello', { provider: 'claude' });
    expect(result).toBe('OpenAI fallback response');
    
    // Verify both Claude and OpenAI were called
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
    expect(mockFetch.mock.calls[1][0]).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('should fallback to OpenAI on Claude rate limit (429)', async () => {
    // 1st call (Claude): 429
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limit exceeded')
    } as any);

    // 2nd call (OpenAI fallback): 200 success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'OpenAI fallback response on rate limit' } }]
      })
    } as any);

    const result = await AIService.generateText('hello', { provider: 'claude' });
    expect(result).toBe('OpenAI fallback response on rate limit');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should fallback to OpenAI on Claude timeout', async () => {
    // Claude timeout (fetch rejects twice due to maxRetries = 1)
    mockFetch.mockRejectedValueOnce(new Error('AI request timed out after 5000ms'));
    mockFetch.mockRejectedValueOnce(new Error('AI request timed out after 5000ms'));

    // OpenAI fallback success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'OpenAI fallback response on timeout' } }]
      })
    } as any);

    const result = await AIService.generateText('hello', { provider: 'claude' });
    expect(result).toBe('OpenAI fallback response on timeout');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should fallback immediately to OpenAI if Claude circuit breaker is open', async () => {
    // Temporarily remove OpenAI key to prevent OpenAI fallback from executing/tripping
    (aiConfig as any).openaiApiKey = null;

    // Let's trip Claude's circuit breaker by failing with a 401 auth error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('401 Unauthorized')
    } as any);

    // Run first call - trips Claude's circuit breaker immediately on auth error
    await AIService.generateText('hello', { provider: 'claude' });
    
    // Restore OpenAI key
    (aiConfig as any).openaiApiKey = 'mock-openai-key';

    // Clear mocks for cleaner counting
    mockFetch.mockClear();

    // Now mock OpenAI success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'OpenAI fallback response on open circuit' } }]
      })
    } as any);

    // Claude is bypassed because its circuit is open, so we directly call OpenAI
    const result = await AIService.generateText('hello', { provider: 'claude' });
    expect(result).toBe('OpenAI fallback response on open circuit');

    // Only OpenAI should have been called
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('should NOT fallback to OpenAI on Claude malformed prompt (400 validation error)', async () => {
    // Claude fails with validation error (non-retryable)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({
        error: {
          type: 'invalid_request_error',
          message: 'Prompt is missing mandatory fields.'
        }
      }))
    } as any);

    const result = await AIService.generateText('hello', { provider: 'claude' });
    expect(result).toBeNull();

    // Verify OpenAI was NOT called
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
  });

  it('should return null if both Claude and OpenAI fail', async () => {
    // Claude 429
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limit exceeded')
    } as any);

    // OpenAI fallback 429
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('OpenAI Rate limit exceeded')
    } as any);

    const result = await AIService.generateText('hello', { provider: 'claude' });
    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
