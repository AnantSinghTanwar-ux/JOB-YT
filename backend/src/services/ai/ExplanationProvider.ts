import { OllamaProvider } from './OllamaProvider';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export interface AIExplanationResult {
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

export class ExplanationProvider {
  /**
   * Generates a candidate evaluation explanation based on the parsing and score data.
   */
  public static async generateExplanation(
    jobDescription: string,
    jobSkills: string[],
    candidateText: string,
    candidateSkills: string[],
    hybridScore: number
  ): Promise<AIExplanationResult> {
    try {
      const prompt = `
      You are an expert technical recruiter analyzing a candidate's fit for a role.
      You must provide explainable, auditable reasoning for why this candidate scored ${hybridScore}/100.
      
      Job Description Snippet:
      ${jobDescription.substring(0, 1500)}
      
      Required Job Skills:
      ${jobSkills.join(', ')}
      
      Candidate Profile/Resume Snippet:
      ${candidateText.substring(0, 1500)}
      
      Candidate Skills:
      ${candidateSkills.join(', ')}
      
      Return ONLY a valid JSON object matching this TypeScript interface exactly:
      interface AIExplanationResult {
        strengths: string[];
        weaknesses: string[];
        summary: string;
      }
      `;

      const response = await OllamaProvider.generate(prompt, 'json');
      
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed: AIExplanationResult = JSON.parse(cleanResponse);
      return parsed;
    } catch (error: any) {
      logger.error(`ExplanationProvider error: ${error.message}`);
      // Fallback response for fault tolerance
      return {
        strengths: ["Analysis temporarily unavailable"],
        weaknesses: ["Analysis temporarily unavailable"],
        summary: "The local AI explanation engine encountered an error while processing this candidate."
      };
    }
  }
}
