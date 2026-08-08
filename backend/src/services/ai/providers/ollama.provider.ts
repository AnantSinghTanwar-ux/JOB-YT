import axios from 'axios';
import { AIProvider, GenerateTextInput, GenerateTextResult } from '../interfaces/aiProvider.interface';

const LOG_PREFIX = '[OllamaProvider]';

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly defaultTemperature: number;

  constructor(baseUrl = 'http://localhost:11434', model = 'llama3.1:8b', defaultTemperature = 0.1) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.defaultTemperature = defaultTemperature;
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const temperature = input.temperature ?? this.defaultTemperature;
    const wantsJson = input.responseMimeType === 'application/json';

    console.log(
      `${LOG_PREFIX} Calling baseUrl=${this.baseUrl} model=${this.model} temp=${temperature} json=${wantsJson}`,
    );

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: input.prompt,
        stream: false,
        options: {
          temperature,
        },
        ...(wantsJson ? { format: 'json' } : {}),
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 seconds fast fail
      });

      const text = response.data?.response ?? '';

      if (!text) {
        throw new Error(`${LOG_PREFIX} Empty response from model ${this.model}`);
      }

      return { text };
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      throw new Error(`${LOG_PREFIX} Request failed: ${msg}`);
    }
  }
}
