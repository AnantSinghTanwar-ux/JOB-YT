import { AIProvider, GenerateTextInput, GenerateTextResult, AIProviderError } from '../interfaces/aiProvider.interface';

const LOG_PREFIX = '[ClaudeProvider]';

export class ClaudeProvider implements AIProvider {
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
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    if (!this.apiKey) {
      throw new AIProviderError(`${LOG_PREFIX} Missing Anthropic API key`, 'claude', 401, 'invalid_api_key');
    }

    const temperature = input.temperature ?? this.defaultTemperature;
    const wantsJson = input.responseMimeType === 'application/json';

    console.log(`${LOG_PREFIX} Calling model=${this.model} temp=${temperature} json=${wantsJson}`);

    // Anthropic Messages API payload
    // Note: Do not pass response_format since the Anthropic Messages API does not support it (throws 400).
    const body: any = {
      model: this.model,
      messages: [{ role: 'user', content: input.prompt }],
      temperature,
      max_tokens: 4000,
    };

    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new AIProviderError(
        `${LOG_PREFIX} Network or connection failure: ${err.message}`,
        'claude',
        undefined,
        'connection_failure'
      );
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      let errorCode = 'api_error';
      try {
        const parsedErr = JSON.parse(txt);
        if (parsedErr?.error?.type) {
          errorCode = parsedErr.error.type;
        } else if (parsedErr?.error?.code) {
          errorCode = parsedErr.error.code;
        }
      } catch {}
      throw new AIProviderError(
        `${LOG_PREFIX} Anthropic request failed ${res.status}: ${txt}`,
        'claude',
        res.status,
        errorCode
      );
    }

    const data: any = await res.json().catch(() => null);

    if (!data) {
      throw new AIProviderError(`${LOG_PREFIX} Empty response from Anthropic`, 'claude', 500, 'empty_response');
    }

    let text = '';
    if (Array.isArray(data.content) && data.content[0] && data.content[0].type === 'text') {
      text = data.content[0].text || '';
    }

    if (!text) {
      throw new AIProviderError(`${LOG_PREFIX} Unable to extract text from Anthropic response`, 'claude', 500, 'invalid_response_shape');
    }

    return { text };
  }
}
