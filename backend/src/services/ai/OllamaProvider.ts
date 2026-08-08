import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  format?: 'json';
  stream?: boolean;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export class OllamaProvider {
  private static OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
  private static DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3';

  /**
   * Generates text using Ollama.
   * Make sure Ollama is running locally on port 11434.
   */
  public static async generate(prompt: string, format?: 'json'): Promise<string> {
    try {
      const request: OllamaGenerateRequest = {
        model: this.DEFAULT_MODEL,
        prompt: prompt,
        stream: false
      };

      if (format === 'json') {
        request.format = 'json';
      }

      const response = await axios.post<OllamaGenerateResponse>(this.OLLAMA_URL, request);
      
      return response.data.response;
    } catch (error: any) {
      logger.error(`Ollama generate error: ${error.message}`);
      throw new Error('Local LLM generation failed.');
    }
  }
}
