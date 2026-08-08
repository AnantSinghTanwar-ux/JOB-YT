import { CodingModel, hashSnapshot } from '../models/coding.model';
import { CodingProblem, CodingTestCase } from '../types/coding.types';
import { badRequest, forbidden, notFound } from '../utils/appError';

export const CodingProblemService = {
  async create(recruiterId: string, data: Partial<CodingProblem>) {
    if (!data.title?.trim()) throw badRequest('Title is required');
    const slug = (data.slug || data.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return CodingModel.createProblem({
      created_by: recruiterId,
      title: data.title.trim(),
      slug,
      difficulty: data.difficulty,
      supported_languages: data.supported_languages,
      description: data.description,
      constraints: data.constraints || undefined,
      hints: data.hints,
      starter_code: data.starter_code,
      time_limit_sec: data.time_limit_sec,
      memory_limit_kb: data.memory_limit_kb,
      tags: data.tags,
    });
  },

  async getById(id: string, userId: string, role: string) {
    const problem = await CodingModel.findProblemById(id);
    if (!problem) throw notFound('Problem');
    if (role !== 'admin' && problem.created_by !== userId) throw forbidden();
    const testCases = await CodingModel.listTestCases(id);
    return { ...problem, test_cases: testCases };
  },

  async list(recruiterId: string, page = 1, limit = 20) {
    return CodingModel.listProblems(recruiterId, page, limit);
  },

  async update(id: string, userId: string, data: Partial<CodingProblem>) {
    const problem = await CodingModel.findProblemById(id);
    if (!problem) throw notFound('Problem');
    if (problem.created_by !== userId) throw forbidden();
    const updated = await CodingModel.updateProblem(id, data);
    return updated;
  },

  async publish(id: string, userId: string) {
    const problem = await CodingModel.findProblemById(id);
    if (!problem) throw notFound('Problem');
    if (problem.created_by !== userId) throw forbidden();

    const testCases = await CodingModel.listTestCases(id);
    const sampleCases = testCases.filter((tc) => tc.is_sample);
    const hiddenCases = testCases.filter((tc) => tc.is_hidden);

    if (!sampleCases.length) throw badRequest('At least one sample test case is required');
    if (!hiddenCases.length) throw badRequest('At least one hidden test case is required');

    for (const lang of problem.supported_languages) {
      if (!problem.starter_code[lang]) {
        throw badRequest(`Starter code required for ${lang}`);
      }
    }

    const versionNumber = problem.current_version_number + 1;
    const snapshotData = { ...problem, test_cases: testCases };
    const snapshotHash = hashSnapshot(snapshotData);

    const version = await CodingModel.createProblemVersion({
      problem_id: id,
      version_number: versionNumber,
      title: problem.title,
      description: problem.description,
      constraints: problem.constraints,
      hints: problem.hints,
      difficulty: problem.difficulty,
      supported_languages: problem.supported_languages,
      starter_code: problem.starter_code,
      time_limit_sec: problem.time_limit_sec,
      memory_limit_kb: problem.memory_limit_kb,
      published_by: userId,
      snapshot_hash: snapshotHash,
    });

    await CodingModel.copyTestCasesToVersion(version.id, testCases);
    await CodingModel.updateProblem(id, { status: 'published', current_version_number: versionNumber } as Partial<CodingProblem>);

    return version;
  },

  async listVersions(problemId: string, userId: string) {
    const problem = await CodingModel.findProblemById(problemId);
    if (!problem) throw notFound('Problem');
    if (problem.created_by !== userId) throw forbidden();
    return CodingModel.listProblemVersions(problemId);
  },

  async getVersion(versionId: string, userId: string, role: string, includeHidden = false) {
    const version = await CodingModel.findProblemVersionById(versionId);
    if (!version) throw notFound('Problem version');

    if (role === 'applicant') {
      const testCases = await CodingModel.listVersionTestCases(versionId, true);
      return { ...version, test_cases: testCases };
    }

    const problem = await CodingModel.findProblemById(version.problem_id);
    if (!problem) throw notFound('Problem');
    if (role !== 'admin' && problem.created_by !== userId) throw forbidden();

    const testCases = includeHidden
      ? await CodingModel.listVersionTestCases(versionId, false)
      : await CodingModel.listVersionTestCases(versionId, true);

    return { ...version, test_cases: testCases };
  },

  async addTestCase(problemId: string, userId: string, data: Partial<CodingTestCase>) {
    const problem = await CodingModel.findProblemById(problemId);
    if (!problem) throw notFound('Problem');
    if (problem.created_by !== userId) throw forbidden();

    const existing = await CodingModel.listTestCases(problemId);
    return CodingModel.createTestCase({
      problem_id: problemId,
      input: data.input ?? '',
      expected_output: data.expected_output ?? '',
      is_hidden: data.is_hidden ?? false,
      is_sample: data.is_sample ?? false,
      weight: data.weight ?? 1,
      order_index: data.order_index ?? existing.length,
      explanation: data.explanation ?? null,
    });
  },

  async updateTestCase(testCaseId: string, userId: string, data: Partial<CodingTestCase>) {
    const { rows } = await (await import('../config/database')).default.query(
      `SELECT ct.*, cp.created_by FROM coding_test_cases ct
       INNER JOIN coding_problems cp ON cp.id = ct.problem_id WHERE ct.id = $1`,
      [testCaseId],
    );
    if (!rows[0]) throw notFound('Test case');
    if (rows[0].created_by !== userId) throw forbidden();
    return CodingModel.updateTestCase(testCaseId, data);
  },

  async deleteTestCase(testCaseId: string, userId: string) {
    const { rows } = await (await import('../config/database')).default.query(
      `SELECT ct.*, cp.created_by FROM coding_test_cases ct
       INNER JOIN coding_problems cp ON cp.id = ct.problem_id WHERE ct.id = $1`,
      [testCaseId],
    );
    if (!rows[0]) throw notFound('Test case');
    if (rows[0].created_by !== userId) throw forbidden();
    await CodingModel.deleteTestCase(testCaseId);
  },

  async delete(id: string, userId: string) {
    const problem = await CodingModel.findProblemById(id);
    if (!problem) throw notFound('Problem');
    if (problem.created_by !== userId) throw forbidden();
    await CodingModel.softDeleteProblem(id);
  },
};
