import { SkillGapProvider } from './SkillGapProvider';
import { SkillGapResult } from '../types';
import { OllamaProvider } from '../../ai/OllamaProvider';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class LocalLLMGapAnalysis implements SkillGapProvider {
  async analyzeGaps(existingSkills: string[], targetRoleOrJdText: string): Promise<SkillGapResult[]> {
    const prompt = `
    You are an expert AI career coach.
    Analyze the skill gaps for a candidate who currently has these skills:
    [${existingSkills.join(', ')}]
    
    They are aiming for the target role or job description:
    "${targetRoleOrJdText}"
    
    Identify the missing skills they need to learn to be highly competitive.
    Return ONLY a JSON array of objects with this exact structure:
    [
      {
        "skillName": "string",
        "category": "string (e.g. Framework, Database, Soft Skill)",
        "importance": "Critical" | "Important" | "Optional",
        "confidence": number (0-1),
        "source": "LLM Analysis"
      }
    ]
    Do not return markdown, just the raw JSON array.
    `;

    try {
      const response = await OllamaProvider.generate(prompt, 'json');
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed as SkillGapResult[];
      }
      return [];
    } catch (error: any) {
      logger.error(`Error in LocalLLMGapAnalysis: ${error.message}`);
      return [];
    }
  }
}
