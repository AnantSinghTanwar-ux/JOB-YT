import { Request, Response, NextFunction } from 'express';
import { CodingProblemService } from '../services/codingProblem.service';
import { CodingAssessmentService } from '../services/codingAssessment.service';
import { ProblemCollectionService } from '../services/problemCollection.service';
import { AssessmentSessionService } from '../services/assessmentSession.service';
import { CodingSubmissionService } from '../services/codingSubmission.service';
import { PracticeService } from '../services/practice.service';
import { CodingModel } from '../models/coding.model';
import { sendSuccess, sendPaginated } from '../utils/response';

export const CodingController = {
  // ─── Problems ─────────────────────────────────────────────
  async listProblems(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await CodingProblemService.list(req.user!.userId, page, limit);
      sendPaginated(res, result.items, result.total, page, limit);
    } catch (err) { next(err); }
  },

  async createProblem(req: Request, res: Response, next: NextFunction) {
    try {
      const problem = await CodingProblemService.create(req.user!.userId, req.body);
      sendSuccess(res, problem, 'Problem created', 201);
    } catch (err) { next(err); }
  },

  async getProblem(req: Request, res: Response, next: NextFunction) {
    try {
      const problem = await CodingProblemService.getById(req.params.id as string, req.user!.userId, req.user!.role);
      sendSuccess(res, problem);
    } catch (err) { next(err); }
  },

  async updateProblem(req: Request, res: Response, next: NextFunction) {
    try {
      const problem = await CodingProblemService.update(req.params.id as string, req.user!.userId, req.body);
      sendSuccess(res, problem, 'Problem updated');
    } catch (err) { next(err); }
  },

  async deleteProblem(req: Request, res: Response, next: NextFunction) {
    try {
      await CodingProblemService.delete(req.params.id as string, req.user!.userId);
      sendSuccess(res, null, 'Problem deleted');
    } catch (err) { next(err); }
  },

  async publishProblem(req: Request, res: Response, next: NextFunction) {
    try {
      const version = await CodingProblemService.publish(req.params.id as string, req.user!.userId);
      sendSuccess(res, version, 'Problem published');
    } catch (err) { next(err); }
  },

  async listProblemVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const versions = await CodingProblemService.listVersions(req.params.id as string, req.user!.userId);
      sendSuccess(res, versions);
    } catch (err) { next(err); }
  },

  async getProblemVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const version = await CodingProblemService.getVersion(
        req.params.id as string,
        req.user!.userId,
        req.user!.role,
        req.user!.role !== 'applicant',
      );
      sendSuccess(res, version);
    } catch (err) { next(err); }
  },

  async addTestCase(req: Request, res: Response, next: NextFunction) {
    try {
      const tc = await CodingProblemService.addTestCase(req.params.id as string, req.user!.userId, req.body);
      sendSuccess(res, tc, 'Test case added', 201);
    } catch (err) { next(err); }
  },

  async updateTestCase(req: Request, res: Response, next: NextFunction) {
    try {
      const tc = await CodingProblemService.updateTestCase(req.params.id as string, req.user!.userId, req.body);
      sendSuccess(res, tc, 'Test case updated');
    } catch (err) { next(err); }
  },

  async deleteTestCase(req: Request, res: Response, next: NextFunction) {
    try {
      await CodingProblemService.deleteTestCase(req.params.id as string, req.user!.userId);
      sendSuccess(res, null, 'Test case deleted');
    } catch (err) { next(err); }
  },

  // ─── Collections ────────────────────────────────────────────
  async listCollections(req: Request, res: Response, next: NextFunction) {
    try {
      const collections = await ProblemCollectionService.list(req.user!.userId);
      sendSuccess(res, collections);
    } catch (err) { next(err); }
  },

  async createCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const col = await ProblemCollectionService.create(req.user!.userId, req.body.name, req.body.description);
      sendSuccess(res, col, 'Collection created', 201);
    } catch (err) { next(err); }
  },

  async getCollectionProblems(req: Request, res: Response, next: NextFunction) {
    try {
      const problems = await ProblemCollectionService.getProblems(req.params.id as string, req.user!.userId);
      sendSuccess(res, problems);
    } catch (err) { next(err); }
  },

  async addToCollection(req: Request, res: Response, next: NextFunction) {
    try {
      await ProblemCollectionService.addProblem(req.params.id as string, req.body.problemId, req.user!.userId);
      sendSuccess(res, null, 'Problem added to collection');
    } catch (err) { next(err); }
  },

  async removeFromCollection(req: Request, res: Response, next: NextFunction) {
    try {
      await ProblemCollectionService.removeProblem(req.params.id as string, req.params.problemId as string, req.user!.userId);
      sendSuccess(res, null, 'Problem removed');
    } catch (err) { next(err); }
  },

  async importCollectionToAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const problems = await ProblemCollectionService.importToAssessment(
        req.params.id as string,
        req.params.assessmentId as string,
        req.user!.userId,
      );
      sendSuccess(res, problems, 'Problems imported');
    } catch (err) { next(err); }
  },

  // ─── Assessments ────────────────────────────────────────────
  async listAssessments(req: Request, res: Response, next: NextFunction) {
    try {
      const assessments = await CodingAssessmentService.list(req.user!.userId);
      sendSuccess(res, assessments);
    } catch (err) { next(err); }
  },

  async createAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const assessment = await CodingAssessmentService.create(req.user!.userId, req.body);
      sendSuccess(res, assessment, 'Assessment created', 201);
    } catch (err) { next(err); }
  },

  async getAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const assessment = await CodingAssessmentService.getById(req.params.id as string, req.user!.userId);
      sendSuccess(res, assessment);
    } catch (err) { next(err); }
  },

  async updateAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const assessment = await CodingAssessmentService.update(req.params.id as string, req.user!.userId, req.body);
      sendSuccess(res, assessment, 'Assessment updated');
    } catch (err) { next(err); }
  },

  async publishAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const version = await CodingAssessmentService.publish(req.params.id as string, req.user!.userId);
      sendSuccess(res, version, 'Assessment published');
    } catch (err) { next(err); }
  },

  async listAssessmentVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const versions = await CodingAssessmentService.listVersions(req.params.id as string, req.user!.userId);
      sendSuccess(res, versions);
    } catch (err) { next(err); }
  },

  async getAssessmentVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const version = await CodingAssessmentService.getVersion(req.params.id as string, req.user!.userId);
      sendSuccess(res, version);
    } catch (err) { next(err); }
  },

  async attachProblemToAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      await CodingAssessmentService.attachProblem(
        req.params.id as string,
        req.body.problemId,
        req.user!.userId,
        req.body.orderIndex,
        req.body.points,
      );
      sendSuccess(res, null, 'Problem attached');
    } catch (err) { next(err); }
  },

  async detachProblemFromAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      await CodingAssessmentService.detachProblem(req.params.id as string, req.params.problemId as string, req.user!.userId);
      sendSuccess(res, null, 'Problem detached');
    } catch (err) { next(err); }
  },

  async attachJob(req: Request, res: Response, next: NextFunction) {
    try {
      const version = await CodingAssessmentService.attachToJob(req.params.id as string, req.params.jobId as string, req.user!.userId);
      sendSuccess(res, version, 'Assessment attached to job');
    } catch (err) { next(err); }
  },

  // ─── Sessions ─────────────────────────────────────────────
  async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await AssessmentSessionService.start(
        req.user!.userId,
        req.body.assessmentVersionId,
        req.body.applicationId,
      );
      sendSuccess(res, session, 'Session started', 201);
    } catch (err) { next(err); }
  },

  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await AssessmentSessionService.getSession(req.params.id as string, req.user!.userId);
      sendSuccess(res, session);
    } catch (err) { next(err); }
  },

  async heartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await AssessmentSessionService.heartbeat(req.params.id as string, req.user!.userId);
      sendSuccess(res, session);
    } catch (err) { next(err); }
  },

  async resumeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await AssessmentSessionService.resume(req.params.id as string, req.user!.userId);
      sendSuccess(res, session);
    } catch (err) { next(err); }
  },

  async getSessionProblems(req: Request, res: Response, next: NextFunction) {
    try {
      const problems = await AssessmentSessionService.getProblems(req.params.id as string, req.user!.userId);
      sendSuccess(res, problems);
    } catch (err) { next(err); }
  },

  async completeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await AssessmentSessionService.complete(req.params.id as string, req.user!.userId);
      sendSuccess(res, session);
    } catch (err) { next(err); }
  },

  // ─── Run / Submit ───────────────────────────────────────────
  async runCode(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CodingSubmissionService.runCode(req.user!.userId, req.body);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async submitCode(req: Request, res: Response, next: NextFunction) {
    try {
      const submission = await CodingSubmissionService.submitCode(req.user!.userId, req.body);
      sendSuccess(res, submission, 'Submission queued', 201);
    } catch (err) { next(err); }
  },

  async getSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const submission = await CodingSubmissionService.getSubmission(
        req.params.id as string,
        req.user!.userId,
        req.user!.role,
      );
      sendSuccess(res, submission);
    } catch (err) { next(err); }
  },

  async listSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await CodingSubmissionService.listSubmissions(req.user!.userId, page, limit);
      sendPaginated(res, result.items, result.total, page, limit);
    } catch (err) { next(err); }
  },

  async getEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const evaluation = await CodingModel.findEvaluationBySubmission(req.params.id as string);
      sendSuccess(res, evaluation
        ? { ...evaluation, disclaimer: 'AI feedback is informational and does not affect pass/fail.' }
        : null);
    } catch (err) { next(err); }
  },

  async listExecutionLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await CodingModel.listExecutionLogs(req.user!.userId);
      sendSuccess(res, logs);
    } catch (err) { next(err); }
  },

  // ─── Practice ───────────────────────────────────────────────
  async listPracticeProblems(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await PracticeService.listProblems(page, limit);
      sendPaginated(res, result.items, result.total, page, limit);
    } catch (err) { next(err); }
  },

  async startPracticeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await PracticeService.startSession(req.user!.userId, req.body.problemVersionId);
      sendSuccess(res, session, 'Practice session started', 201);
    } catch (err) { next(err); }
  },

  async listPracticeSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await PracticeService.listSessions(req.user!.userId);
      sendSuccess(res, sessions);
    } catch (err) { next(err); }
  },

  async getPracticeProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const progress = await PracticeService.getProgress(req.user!.userId);
      sendSuccess(res, progress);
    } catch (err) { next(err); }
  },

  // ─── Recruiter Review ───────────────────────────────────────
  async listVersionSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await AssessmentSessionService.listSessionsForVersion(req.params.id as string, req.user!.userId);
      sendSuccess(res, sessions);
    } catch (err) { next(err); }
  },

  async listVersionSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const submissions = await CodingSubmissionService.listSubmissionsForVersion(req.params.id as string, req.user!.userId);
      sendSuccess(res, submissions);
    } catch (err) { next(err); }
  },

  async reviewSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await CodingSubmissionService.reviewSubmission(req.params.id as string, req.user!.userId);
      sendSuccess(res, review);
    } catch (err) { next(err); }
  },

  async reviewSession(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await AssessmentSessionService.reviewSession(req.params.id as string, req.user!.userId);
      sendSuccess(res, review);
    } catch (err) { next(err); }
  },
};
