import pool from '../config/database';
import { CodingModel, hashSnapshot } from '../models/coding.model';
import { CodingAssessment } from '../types/coding.types';
import { badRequest, forbidden, notFound } from '../utils/appError';

export const CodingAssessmentService = {
  async create(recruiterId: string, data: Partial<CodingAssessment>) {
    if (!data.title?.trim()) throw badRequest('Title is required');
    return CodingModel.createAssessment({
      recruiter_id: recruiterId,
      title: data.title.trim(),
      description: data.description || undefined,
      passing_score: data.passing_score,
      time_limit_minutes: data.time_limit_minutes ?? undefined,
      max_attempts: data.max_attempts,
      assessment_timing: data.assessment_timing,
      allow_resume: data.allow_resume,
      job_id: data.job_id || undefined,
    });
  },

  async getById(id: string, recruiterId: string) {
    const assessment = await CodingModel.findAssessmentById(id);
    if (!assessment) throw notFound('Assessment');
    if (assessment.recruiter_id !== recruiterId) throw forbidden();
    const problems = await CodingModel.listAssessmentProblems(id);
    return { ...assessment, problems };
  },

  async list(recruiterId: string) {
    return CodingModel.listAssessments(recruiterId);
  },

  async update(id: string, recruiterId: string, data: Partial<CodingAssessment>) {
    const assessment = await CodingModel.findAssessmentById(id);
    if (!assessment) throw notFound('Assessment');
    if (assessment.recruiter_id !== recruiterId) throw forbidden();
    return CodingModel.updateAssessment(id, data);
  },

  async attachProblem(assessmentId: string, problemId: string, recruiterId: string, orderIndex?: number, points = 100) {
    const assessment = await CodingModel.findAssessmentById(assessmentId);
    if (!assessment) throw notFound('Assessment');
    if (assessment.recruiter_id !== recruiterId) throw forbidden();

    const problem = await CodingModel.findProblemById(problemId);
    if (!problem) throw notFound('Problem');

    const existing = await CodingModel.listAssessmentProblems(assessmentId);
    await CodingModel.attachProblemToAssessment(assessmentId, problemId, orderIndex ?? existing.length, points);
  },

  async detachProblem(assessmentId: string, problemId: string, recruiterId: string) {
    const assessment = await CodingModel.findAssessmentById(assessmentId);
    if (!assessment) throw notFound('Assessment');
    if (assessment.recruiter_id !== recruiterId) throw forbidden();
    await CodingModel.detachProblemFromAssessment(assessmentId, problemId);
  },

  async publish(id: string, recruiterId: string) {
    const assessment = await CodingModel.findAssessmentById(id);
    if (!assessment) throw notFound('Assessment');
    if (assessment.recruiter_id !== recruiterId) throw forbidden();

    const problems = await CodingModel.listAssessmentProblems(id);
    if (!problems.length) throw badRequest('Assessment must have at least one problem');

    const versionNumber = assessment.current_version_number + 1;
    let jobSnapshot: Record<string, unknown> | null = null;

    if (assessment.job_id) {
      const { rows } = await pool.query(`SELECT id, title, company_name, description FROM jobs WHERE id = $1`, [assessment.job_id]);
      if (rows[0]) {
        jobSnapshot = {
          job_id: rows[0].id,
          title: rows[0].title,
          company_name: rows[0].company_name,
        };
      }
    }

    const versionProblems: Array<{ problem_version_id: string; order_index: number; points: number; problem_snapshot: Record<string, unknown> }> = [];

    for (let i = 0; i < problems.length; i++) {
      const pv = await CodingModel.getLatestProblemVersion(problems[i].id);
      if (!pv) throw badRequest(`Problem "${problems[i].title}" must be published first`);

      const sampleCases = await CodingModel.listVersionTestCases(pv.id, true);
      const problemSnapshot = {
        ...pv,
        sample_cases: sampleCases.map((tc) => ({
          input: tc.input,
          expected_output: tc.expected_output,
          explanation: tc.explanation,
        })),
      };

      versionProblems.push({
        problem_version_id: pv.id,
        order_index: i,
        points: 100,
        problem_snapshot: problemSnapshot,
      });
    }

    const snapshotHash = hashSnapshot({ assessment, problems: versionProblems });

    const version = await CodingModel.createAssessmentVersion({
      assessment_id: id,
      version_number: versionNumber,
      title: assessment.title,
      description: assessment.description,
      passing_score: assessment.passing_score,
      time_limit_minutes: assessment.time_limit_minutes,
      max_attempts: assessment.max_attempts,
      assessment_timing: assessment.assessment_timing,
      allow_resume: assessment.allow_resume,
      job_id: assessment.job_id,
      job_snapshot: jobSnapshot,
      published_by: recruiterId,
      snapshot_hash: snapshotHash,
    });

    for (const vp of versionProblems) {
      await CodingModel.createAssessmentVersionProblem({
        assessment_version_id: version.id,
        problem_version_id: vp.problem_version_id,
        order_index: vp.order_index,
        points: vp.points,
        problem_snapshot: vp.problem_snapshot,
      });
    }

    await CodingModel.updateAssessment(id, { status: 'published', current_version_number: versionNumber } as Partial<CodingAssessment>);

    if (assessment.job_id) {
      await CodingModel.setJobAssessmentVersion(assessment.job_id, id, version.id);
    }

    return version;
  },

  async listVersions(assessmentId: string, recruiterId: string) {
    const assessment = await CodingModel.findAssessmentById(assessmentId);
    if (!assessment) throw notFound('Assessment');
    if (assessment.recruiter_id !== recruiterId) throw forbidden();
    return CodingModel.listAssessmentVersions(assessmentId);
  },

  async getVersion(versionId: string, recruiterId: string) {
    const version = await CodingModel.findAssessmentVersionById(versionId);
    if (!version) throw notFound('Assessment version');
    const assessment = await CodingModel.findAssessmentById(version.assessment_id);
    if (!assessment || assessment.recruiter_id !== recruiterId) throw forbidden();
    const problems = await CodingModel.listAssessmentVersionProblems(versionId);
    return { ...version, problems };
  },

  async attachToJob(assessmentId: string, jobId: string, recruiterId: string) {
    const assessment = await CodingModel.findAssessmentById(assessmentId);
    if (!assessment) throw notFound('Assessment');
    if (assessment.recruiter_id !== recruiterId) throw forbidden();

    await CodingModel.updateAssessment(assessmentId, { job_id: jobId } as Partial<CodingAssessment>);
    return this.publish(assessmentId, recruiterId);
  },
};
