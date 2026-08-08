import { AppError } from '../utils/appError';
import { PromptTemplatesService } from './promptTemplates.service';
import { OllamaProvider } from './ai/OllamaProvider';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export interface AIParsedJob {
  title: string;
  companyName: string;
  description: string;
  location?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  skills: string[];
}

export const AiParserService = {
  /**
   * Passes raw scraped text into Local AI to structure it into the specific Job Schema.
   */
  async parseJobText(rawText: string): Promise<AIParsedJob> {
    const prompt = await PromptTemplatesService.renderTemplate('job_parsing', {
      rawText,
    });

    try {
      // Prepend an instruction for the local model to only output JSON
      const jsonPrompt = `
      You are an expert job parsing system.
      Extract the job information from the text below and return ONLY a valid JSON object matching this TypeScript interface:
      interface AIParsedJob { title: string; companyName: string; description: string; location?: string; salary_min?: number; salary_max?: number; skills: string[]; }
      
      TEXT:
      ${prompt}
      `;

      const response = await OllamaProvider.generate(jsonPrompt, 'json');
      
      // Attempt to clean the output if the model added markdown blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed: AIParsedJob = JSON.parse(cleanResponse);
      return parsed;
    } catch (error: any) {
      logger.error(`AiParserService error: ${error.message}`);
      throw new AppError('AI Parsing failed due to local provider error', 502);
    }
  },
};
