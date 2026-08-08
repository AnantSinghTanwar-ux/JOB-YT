import { AIService } from './ai.service';
import { aiConfig } from '../config/ai.config';
import { CodingModel } from '../models/coding.model';
import { CodeEvaluation } from '../types/coding.types';

export const CodeEvaluationService = {
  async evaluate(submissionId: string): Promise<CodeEvaluation | null> {
    const submission = await CodingModel.findSubmissionById(submissionId);
    if (!submission) return null;

    const existing = await CodingModel.findEvaluationBySubmission(submissionId);
    if (existing) return existing;

    if (!aiConfig.isConfigured) {
      return CodingModel.createCodeEvaluation({
        submission_id: submissionId,
        readability_score: 0,
        maintainability_score: 0,
        efficiency_score: 0,
        best_practices_score: 0,
        optimization_score: 0,
        overall_quality_score: 0,
        strengths: [],
        weaknesses: [],
        suggestions: ["AI API keys are not configured on the server. AI feedback is currently unavailable."],
        raw_response: { disabled: true, message: "No AI key configured" },
      });
    }

    const problemSnapshot = submission.problem_snapshot as Record<string, unknown> | null;
    const testResults = await CodingModel.listTestResults(submissionId);
    const passCount = testResults.filter((r) => r.passed).length;

    const prompt = `You are a code quality reviewer. Analyze the following code submission.
IMPORTANT: Do NOT determine pass/fail eligibility. Only provide quality feedback.

Problem: ${problemSnapshot?.title || 'Unknown'}
Description: ${problemSnapshot?.description || ''}
Language: ${submission.language}
Test pass rate: ${passCount}/${testResults.length} hidden tests passed
Score from tests: ${submission.score}%

Source code:
\`\`\`${submission.language}
${submission.source_code.slice(0, 8000)}
\`\`\`

Respond with JSON only:
{
  "readability_score": 0-100,
  "maintainability_score": 0-100,
  "efficiency_score": 0-100,
  "best_practices_score": 0-100,
  "optimization_score": 0-100,
  "overall_quality_score": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}`;

    try {
      const parsed = await AIService.generateJSON<{
        readability_score: number;
        maintainability_score: number;
        efficiency_score: number;
        best_practices_score: number;
        optimization_score: number;
        overall_quality_score: number;
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
      }>(prompt);

      if (!parsed) return null;

      return CodingModel.createCodeEvaluation({
        submission_id: submissionId,
        readability_score: parsed.readability_score,
        maintainability_score: parsed.maintainability_score,
        efficiency_score: parsed.efficiency_score,
        best_practices_score: parsed.best_practices_score,
        optimization_score: parsed.optimization_score,
        overall_quality_score: parsed.overall_quality_score,
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        suggestions: parsed.suggestions || [],
        raw_response: parsed as unknown as Record<string, unknown>,
      });
    } catch (err) {
      console.warn('[CodeEvaluationService] AI evaluation failed:', err);
      return CodingModel.createCodeEvaluation({
        submission_id: submissionId,
        readability_score: null as unknown as number,
        maintainability_score: null as unknown as number,
        efficiency_score: null as unknown as number,
        best_practices_score: null as unknown as number,
        optimization_score: null as unknown as number,
        overall_quality_score: null as unknown as number,
        strengths: [],
        weaknesses: [],
        suggestions: ["AI evaluation failed or timed out. Please try again later."],
        raw_response: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  },
};
