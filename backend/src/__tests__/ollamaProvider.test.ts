import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { OllamaProvider } from '../services/ai/providers/ollama.provider';
import { resolveProvider, AIService } from '../services/ai.service';
import { aiConfig } from '../config/ai.config';

jest.mock('axios');

describe('OllamaProvider and Provider Resolution Integration', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalIsConfigured = aiConfig.isConfigured;
  const originalOllamaConfigured = aiConfig.ollamaConfigured;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    (aiConfig as any).isConfigured = originalIsConfigured;
    (aiConfig as any).ollamaConfigured = originalOllamaConfigured;
  });

  describe('OllamaProvider Class', () => {
    it('should successfully generate text from Ollama API response', async () => {
      const mockResponse = { data: { response: 'Hello from Ollama local model!' } };
      (axios.post as any).mockResolvedValueOnce(mockResponse);

      const provider = new OllamaProvider('http://localhost:11434', 'llama3.1:8b', 0.2);
      const result = await provider.generateText({ prompt: 'Tell me a joke' });

      expect(result.text).toBe('Hello from Ollama local model!');
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          model: 'llama3.1:8b',
          prompt: 'Tell me a joke',
          stream: false,
          options: expect.objectContaining({
            temperature: 0.2,
          }),
        }),
        expect.any(Object)
      );
    });

    it('should send format: json when responseMimeType is application/json', async () => {
      const mockResponse = { data: { response: '{"key": "val"}' } };
      (axios.post as any).mockResolvedValueOnce(mockResponse);

      const provider = new OllamaProvider('http://localhost:11434', 'llama3.1:8b');
      const result = await provider.generateText({
        prompt: 'Give JSON',
        responseMimeType: 'application/json',
      });

      expect(result.text).toBe('{"key": "val"}');
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          format: 'json',
        }),
        expect.any(Object)
      );
    });

    it('should throw an error when API returns empty response', async () => {
      (axios.post as any).mockResolvedValueOnce({ data: {} });

      const provider = new OllamaProvider();
      await expect(provider.generateText({ prompt: 'test' })).rejects.toThrow(
        'Empty response from model'
      );
    });

    it('should throw mapped axios errors', async () => {
      const axiosError = {
        response: {
          data: { error: 'Model not loaded' },
        },
      };
      (axios.post as any).mockRejectedValueOnce(axiosError);

      const provider = new OllamaProvider();
      await expect(provider.generateText({ prompt: 'test' })).rejects.toThrow(
        'Model not loaded'
      );
    });
  });

  describe('resolveProvider Logic', () => {
    it('should return requested provider when in production', () => {
      process.env.NODE_ENV = 'production';
      expect(resolveProvider('grok')).toBe('grok');
      expect(resolveProvider('ollama')).toBe('ollama');
    });

    it('should default to claude when in production if no provider requested', () => {
      process.env.NODE_ENV = 'production';
      expect(resolveProvider(undefined)).toBe('claude');
    });

    it('should return requested provider when in test mode', () => {
      process.env.NODE_ENV = 'test';
      expect(resolveProvider('claude')).toBe('claude');
    });

    it('should default to groq when in test mode if no provider requested', () => {
      process.env.NODE_ENV = 'test';
      expect(resolveProvider(undefined)).toBe('groq');
    });

    it('should apply fallback order when in development', () => {
      process.env.NODE_ENV = 'development';

      // 1. Groq is configured
      (aiConfig as any).isConfigured = true;
      (aiConfig as any).ollamaConfigured = true;
      expect(resolveProvider(undefined)).toBe('groq');
      expect(resolveProvider('claude')).toBe('groq'); // forces development substitution

      // 2. Groq is not configured, Ollama is configured
      (aiConfig as any).isConfigured = false;
      (aiConfig as any).ollamaConfigured = true;
      expect(resolveProvider(undefined)).toBe('ollama');
      expect(resolveProvider('claude')).toBe('ollama'); // forces development substitution

      // 3. Neither Groq nor Ollama is configured
      (aiConfig as any).isConfigured = false;
      (aiConfig as any).ollamaConfigured = false;
      expect(resolveProvider(undefined)).toBe('claude');
      expect(resolveProvider('groq')).toBe('claude'); // forces development substitution
    });
  });
});
