import { CodingModel } from '../models/coding.model';
import { notFound } from '../utils/appError';

export const PracticeService = {
  async listProblems(page = 1, limit = 20) {
    const result = await CodingModel.listPracticeProblems(page, limit);
    const items = await Promise.all(
      result.items.map(async (pv) => {
        const sampleCases = await CodingModel.listVersionTestCases(pv.id, true);
        return {
          ...pv,
          sample_cases: sampleCases.map((tc) => ({
            input: tc.input,
            expected_output: tc.expected_output,
            explanation: tc.explanation,
          })),
        };
      }),
    );
    return { items, total: result.total };
  },

  async startSession(userId: string, problemVersionId: string) {
    const version = await CodingModel.findProblemVersionById(problemVersionId);
    if (!version) throw notFound('Problem version');
    return CodingModel.createPracticeSession(userId, problemVersionId);
  },

  async listSessions(userId: string) {
    return CodingModel.listPracticeSessions(userId);
  },

  async getProgress(userId: string) {
    return CodingModel.getPracticeProgress(userId);
  },
};
