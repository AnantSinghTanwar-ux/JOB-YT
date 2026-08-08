/**
 * Grok (xAI) Provider
 *
 * Minimal provider implementing AIProvider using the xAI/Grok HTTP API.
 * Designed to be lightweight and throw on unrecoverable errors so AIService
 * retry/circuit-breaker logic can operate.
 */

import { AIProvider, GenerateTextInput, GenerateTextResult } from '../interfaces/aiProvider.interface';

const LOG_PREFIX = '[GrokProvider]';

export class GrokProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly defaultTemperature: number;

  constructor(apiKey: string, model: string, defaultTemperature = 0.1) {
    this.apiKey = apiKey;
    this.model = model;
    this.defaultTemperature = defaultTemperature;
  }

  private buildHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    if (!this.apiKey) throw new Error(`${LOG_PREFIX} Missing XAI API key`);

    const temperature = input.temperature ?? this.defaultTemperature;
    const wantsJson = input.responseMimeType === 'application/json';

    console.log(`${LOG_PREFIX} Calling model=${this.model} temp=${temperature} json=${wantsJson}`);

    // NOTE: xAI/Grok public HTTP APIs evolve; this implementation uses a
    // conservative request shape and extracts common response fields.
    const body: any = {
      model: this.model,
      input: input.prompt,
      temperature,
      max_tokens: 2000,
    };

    if (wantsJson) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.grok.ai/v1/generate', {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`${LOG_PREFIX} xAI request failed ${res.status}: ${txt}`);
    }

    const data: any = await res.json().catch(() => null);

    // Attempt to extract text from several possible shapes
    let text = '';
    if (!data) {
      throw new Error(`${LOG_PREFIX} Empty response from xAI`);
    }

    // Common patterns
    if (typeof data.output_text === 'string') text = data.output_text;
    else if (typeof data.text === 'string') text = data.text;
    else if (Array.isArray(data.choices) && data.choices[0]) {
      text = data.choices[0].text || data.choices[0].message?.content || '';
    } else if (typeof data.candidates === 'object' && Array.isArray(data.candidates)) {
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (!text) {
      // Fallback: stringify whole payload (useful for debugging but treated as error)
      throw new Error(`${LOG_PREFIX} Unable to extract text from xAI response`);
    }

    return { text };
  }
}
