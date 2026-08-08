import { CodingModel } from '../models/coding.model';
import { badRequest, forbidden, notFound } from '../utils/appError';

export const ProblemCollectionService = {
  async create(userId: string, name: string, description?: string) {
    if (!name?.trim()) throw badRequest('Collection name is required');
    return CodingModel.createCollection({ created_by: userId, name: name.trim(), description });
  },

  async list(userId: string) {
    return CodingModel.listCollections(userId);
  },

  async getProblems(collectionId: string, userId: string) {
    const collections = await CodingModel.listCollections(userId);
    const col = collections.find((c) => c.id === collectionId);
    if (!col) throw notFound('Collection');
    if (col.created_by !== userId) throw forbidden();
    return CodingModel.listCollectionProblems(collectionId);
  },

  async addProblem(collectionId: string, problemId: string, userId: string) {
    const collections = await CodingModel.listCollections(userId);
    const col = collections.find((c) => c.id === collectionId);
    if (!col) throw notFound('Collection');
    if (col.created_by !== userId) throw forbidden();

    const problems = await CodingModel.listCollectionProblems(collectionId);
    await CodingModel.addToCollection(collectionId, problemId, problems.length);
  },

  async removeProblem(collectionId: string, problemId: string, userId: string) {
    const collections = await CodingModel.listCollections(userId);
    const col = collections.find((c) => c.id === collectionId);
    if (!col) throw notFound('Collection');
    if (col.created_by !== userId) throw forbidden();
    await CodingModel.removeFromCollection(collectionId, problemId);
  },

  async importToAssessment(collectionId: string, assessmentId: string, userId: string) {
    const collections = await CodingModel.listCollections(userId);
    const col = collections.find((c) => c.id === collectionId);
    if (!col) throw notFound('Collection');
    if (col.created_by !== userId) throw forbidden();

    const assessment = await CodingModel.findAssessmentById(assessmentId);
    if (!assessment) throw notFound('Assessment');
    if (assessment.recruiter_id !== userId) throw forbidden();

    const problems = await CodingModel.listCollectionProblems(collectionId);
    const existing = await CodingModel.listAssessmentProblems(assessmentId);

    for (let i = 0; i < problems.length; i++) {
      await CodingModel.attachProblemToAssessment(assessmentId, problems[i].id, existing.length + i);
    }

    return CodingModel.listAssessmentProblems(assessmentId);
  },
};
