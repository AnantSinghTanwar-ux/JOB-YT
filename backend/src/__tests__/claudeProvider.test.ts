import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { AIService } from '../services/ai.service';
import { aiConfig } from '../config/ai.config';

describe('ClaudeProvider and AIService Integration', () => {
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
    mockFetch = jest.fn();
    global.fetch = mockFetch as any;

    // Force configurations for testing
    (aiConfig as any).isConfigured = true;
    (aiConfig as any).anthropicApiKey = 'mock-anthropic-key';
    (aiConfig as any).anthropicModel = 'claude-3-5-sonnet-mock';
    (aiConfig as any).maxRetries = 1;
    (aiConfig as any).circuitBreakerThreshold = 2;
  });

  it('should successfully return text on a valid API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Mocked Claude response' }]
      })
    } as any);

    const result = await AIService.generateText('hello claude', { provider: 'claude' });
    expect(result).toBe('Mocked Claude response');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'mock-anthropic-key',
          'anthropic-version': '2023-06-01'
        })
      })
    );
  });

  it('should successfully generate JSON if prompt asks for JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: '{"status": "ok"}' }]
      })
    } as any);

    const result = await AIService.generateJSON<{ status: string }>('give me JSON', { provider: 'claude' });
    expect(result).toEqual({ status: 'ok' });
  });

  it('should return null and handle malformed JSON gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'malformed { json' }]
      })
    } as any);

    const result = await AIService.generateJSON('give me JSON', { provider: 'claude' });
    expect(result).toBeNull();
  });

  it('should propagate API errors and return null from generateText', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Invalid request payload')
    } as any);

    const result = await AIService.generateText('hello claude', { provider: 'claude' });
    expect(result).toBeNull();
  });

  it('should treat 401 as auth error and trip circuit breaker', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('401 Unauthorized')
    } as any);

    const result = await AIService.generateText('hello claude', { provider: 'claude' });
    expect(result).toBeNull();

    // The first call was an auth error (a permanent error), so it trips circuit breaker immediately
    // Subsequent calls should immediately skip provider call and return null
    const secondResult = await AIService.generateText('hello claude', { provider: 'claude' });
    expect(secondResult).toBeNull();

    // Fetch should only have been called ONCE due to circuit breaker opening
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
