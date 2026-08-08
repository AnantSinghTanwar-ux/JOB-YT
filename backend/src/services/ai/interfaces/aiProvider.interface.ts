/**
 * AI Provider Interface
 *
 * Provider-agnostic contract for text generation.
 * Implemented by concrete providers (e.g., GroqProvider).
 *
 * The AIService facade uses this interface internally, keeping all
 * callers (aiReasoning.service.ts, gemini.ts, etc.) completely unaware
 * of the underlying AI SDK.
 */

export interface GenerateTextInput {
  /** The user/system prompt to send to the model. */
  prompt: string;
  /** Sampling temperature (0.0–2.0). Lower = more deterministic. */
  temperature?: number;
  /**
   * Hint for the desired response format.
   * 'application/json' — request structured JSON output.
   * 'text/plain'       — plain text (default).
   */
  responseMimeType?: string;
}

export interface GenerateTextResult {
  /** The raw text returned by the model. */
  text: string;
}

export class AIProviderError extends Error {
  public readonly provider: string;
  public readonly status?: number;
  public readonly code?: string;

  constructor(message: string, provider: string, status?: number, code?: string) {
    super(message);
    this.name = 'AIProviderError';
    this.provider = provider;
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, AIProviderError.prototype);
  }
}

export interface AIProvider {
  /**
   * Generate text using this provider.
   * Must throw on unrecoverable errors so the caller's retry/circuit-breaker logic applies.
   */
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}
