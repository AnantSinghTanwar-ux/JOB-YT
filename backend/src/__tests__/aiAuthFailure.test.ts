import { AIService } from '../services/ai.service';
import { GroqProvider } from '../services/ai/providers/groq.provider';
import { aiConfig } from '../config/ai.config';

jest.mock('../services/ai/providers/groq.provider');

describe('AI Service Authentication Failure & Circuit Breaker', () => {
  let mockGenerateText: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateText = jest.fn();
    (GroqProvider as jest.Mock).mockImplementation(() => {
      return {
        generateText: mockGenerateText,
      };
    });

    // Reset module-level cached providers by forcing re-instantiation or setting config
    // Ensure config is treated as configured so calls proceed
    (aiConfig as any).isConfigured = true;
    (aiConfig as any).groqApiKey = 'mock-test-key';
    (aiConfig as any).maxRetries = 2;
    (aiConfig as any).circuitBreakerThreshold = 3;

    // Reset the internal groqProvider cache in ai.service by resetting cached instance
    // Since groqProvider is a local module variable, we can force re-evaluation by mutating aiConfig
    // which getGroqProvider uses.
  });

  it('should immediately short-circuit retries and trip circuit breaker on 401 invalid_api_key', async () => {
    // 401 error simulating invalid key from Groq API
    const authError = new Error('401 {"error":{"message":"Invalid API Key","code":"invalid_api_key"}}');
    mockGenerateText.mockRejectedValue(authError);

    // Call generateText
    const result = await AIService.generateText('test prompt');

    // It should return null
    expect(result).toBeNull();

    // It should only try ONCE (short-circuiting retries) instead of 3 times (attempt 0 + 2 retries)
    expect(mockGenerateText).toHaveBeenCalledTimes(1);

    // Subsequent calls should immediately fail due to open circuit breaker
    const secondResult = await AIService.generateText('another prompt');
    expect(secondResult).toBeNull();
    
    // Provider should not be called again
    expect(mockGenerateText).toHaveBeenCalledTimes(1);

    // The health check should also reflect this failure
    const health = await AIService.healthCheck();
    expect(health.text).toBe(false);
  });
});
