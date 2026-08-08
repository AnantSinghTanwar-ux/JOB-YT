/**
 * Groq Provider
 *
 * Implements the AIProvider interface using the official Groq SDK.
 * Used by AIService for all text and JSON generation tasks.
 *
 * Key behaviours:
 *  - Uses `response_format: { type: 'json_object' }` when responseMimeType is 'application/json'.
 *  - Throws on failure so AIService's withRetry + circuit-breaker logic applies.
 *  - Never catches errors here — error handling lives in AIService.
 */

import Groq from 'groq-sdk';
import { AIProvider, GenerateTextInput, GenerateTextResult } from '../interfaces/aiProvider.interface';

const LOG_PREFIX = '[GroqProvider]';

export class GroqProvider implements AIProvider {
  private client: Groq | null = null;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly defaultTemperature: number;

  constructor(apiKey: string, model: string, defaultTemperature = 0.1) {
    this.apiKey = apiKey;
    this.model = model;
    this.defaultTemperature = defaultTemperature;
  }

  private getClient(): Groq {
    if (!this.client) {
      this.client = new Groq({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const groq = this.getClient();
    const temperature = input.temperature ?? this.defaultTemperature;
    const wantsJson = input.responseMimeType === 'application/json';

    console.log(
      `${LOG_PREFIX} Calling model=${this.model} temp=${temperature} json=${wantsJson}`,
    );

    const completion = await groq.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: input.prompt }],
      temperature,
      ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
    });

    const text = completion.choices[0]?.message?.content ?? '';

    if (!text) {
      throw new Error(`${LOG_PREFIX} Empty response from model ${this.model}`);
    }

    return { text };
  }
}
