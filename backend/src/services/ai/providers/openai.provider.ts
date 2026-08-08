import { AIProvider, GenerateTextInput, GenerateTextResult, AIProviderError } from '../interfaces/aiProvider.interface';

const LOG_PREFIX = '[OpenAIProvider]';

export class OpenAIProvider implements AIProvider {
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
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    if (!this.apiKey) {
      throw new AIProviderError(`${LOG_PREFIX} Missing OpenAI API key`, 'openai', 401, 'invalid_api_key');
    }

    const temperature = input.temperature ?? this.defaultTemperature;
    const wantsJson = input.responseMimeType === 'application/json';

    console.log(`${LOG_PREFIX} Calling model=${this.model} temp=${temperature} json=${wantsJson}`);

    const body: any = {
      model: this.model,
      messages: [{ role: 'user', content: input.prompt }],
      temperature,
    };

    if (wantsJson) {
      body.response_format = { type: 'json_object' };
    }

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new AIProviderError(
        `${LOG_PREFIX} Network or connection failure: ${err.message}`,
        'openai',
        undefined,
        'connection_failure'
      );
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      let errorCode = 'api_error';
      try {
        const parsedErr = JSON.parse(txt);
        if (parsedErr?.error?.code) {
          errorCode = parsedErr.error.code;
        } else if (parsedErr?.error?.type) {
          errorCode = parsedErr.error.type;
        }
      } catch {}
      throw new AIProviderError(
        `${LOG_PREFIX} OpenAI request failed ${res.status}: ${txt}`,
        'openai',
        res.status,
        errorCode
      );
    }

    const data: any = await res.json().catch(() => null);

    if (!data) {
      throw new AIProviderError(`${LOG_PREFIX} Empty response from OpenAI`, 'openai', 500, 'empty_response');
    }

    const text = data.choices?.[0]?.message?.content ?? '';

    if (!text) {
      throw new AIProviderError(`${LOG_PREFIX} Unable to extract text from OpenAI response`, 'openai', 500, 'invalid_response_shape');
    }

    return { text };
  }
}
