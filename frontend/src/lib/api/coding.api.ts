import { api } from '@/lib/api';
import {
  AssessmentSession,
  AssessmentVersion,
  CodingAssessment,
  CodingProblem,
  CodingSubmission,
  CodeEvaluation,
  PracticeSession,
  ProblemCollection,
  ProblemVersion,
  RunResult,
  SubmissionReview,
} from '@/types/coding';

export const CodingApi = {
  // Problems
  listProblems: (page = 1) => api.getPaginated<CodingProblem>(`/coding/problems?page=${page}`),
  createProblem: (data: Partial<CodingProblem>) => api.post<CodingProblem>('/coding/problems', data),
  getProblem: (id: string) => api.get<CodingProblem>(`/coding/problems/${id}`),
  updateProblem: (id: string, data: Partial<CodingProblem>) => api.put<CodingProblem>(`/coding/problems/${id}`, data),
  publishProblem: (id: string) => api.post(`/coding/problems/${id}/publish`, {}),
  addTestCase: (problemId: string, data: Record<string, unknown>) =>
    api.post(`/coding/problems/${problemId}/test-cases`, data),

  // Problem versions
  getProblemVersion: (id: string) => api.get<ProblemVersion>(`/coding/problem-versions/${id}`),

  // Collections
  listCollections: () => api.get<ProblemCollection[]>('/coding/collections'),
  createCollection: (name: string, description?: string) =>
    api.post<ProblemCollection>('/coding/collections', { name, description }),
  getCollectionProblems: (id: string) => api.get<CodingProblem[]>(`/coding/collections/${id}/problems`),
  addToCollection: (collectionId: string, problemId: string) =>
    api.post(`/coding/collections/${collectionId}/problems`, { problemId }),

  // Assessments
  listAssessments: () => api.get<CodingAssessment[]>('/coding/assessments'),
  createAssessment: (data: Partial<CodingAssessment>) => api.post<CodingAssessment>('/coding/assessments', data),
  getAssessment: (id: string) => api.get<CodingAssessment>(`/coding/assessments/${id}`),
  updateAssessment: (id: string, data: Partial<CodingAssessment>) =>
    api.put<CodingAssessment>(`/coding/assessments/${id}`, data),
  publishAssessment: (id: string) => api.post(`/coding/assessments/${id}/publish`, {}),
  listAssessmentVersions: (assessmentId: string) =>
    api.get<AssessmentVersion[]>(`/coding/assessments/${assessmentId}/versions`),
  attachProblem: (assessmentId: string, problemId: string) =>
    api.post(`/coding/assessments/${assessmentId}/problems`, { problemId }),
  attachJob: (assessmentId: string, jobId: string) =>
    api.post(`/coding/assessments/${assessmentId}/attach-job/${jobId}`, {}),

  // Sessions
  startSession: (assessmentVersionId: string, applicationId?: string) =>
    api.post<AssessmentSession>('/coding/sessions/start', { assessmentVersionId, applicationId }),
  getSession: (id: string) => api.get<AssessmentSession>(`/coding/sessions/${id}`),
  heartbeat: (id: string) => api.post<AssessmentSession>(`/coding/sessions/${id}/heartbeat`, {}),
  resume: (id: string) => api.post<AssessmentSession>(`/coding/sessions/${id}/resume`, {}),
  completeSession: (id: string) => api.post(`/coding/sessions/${id}/complete`, {}),
  getSessionProblems: (id: string) => api.get<ProblemVersion[]>(`/coding/sessions/${id}/problems`),

  // Execution
  runCode: (data: Record<string, unknown>) =>
    api.post<{ results: RunResult[]; compileOutput: string | null }>('/coding/run', data),
  submitCode: (data: Record<string, unknown>) => api.post<CodingSubmission>('/coding/submit', data),
  getSubmission: (id: string) => api.get<CodingSubmission>(`/coding/submissions/${id}`),
  listSubmissions: (page = 1) => api.getPaginated<CodingSubmission>(`/coding/submissions?page=${page}`),
  getEvaluation: (id: string) => api.get<CodeEvaluation>(`/coding/submissions/${id}/evaluation`),
  listExecutionLogs: () => api.get('/coding/execution-logs'),

  // Practice
  listPracticeProblems: (page = 1) => api.getPaginated<ProblemVersion>(`/coding/practice/problems?page=${page}`),
  startPracticeSession: (problemVersionId: string) =>
    api.post<PracticeSession>('/coding/practice/sessions', { problemVersionId }),
  listPracticeSessions: () => api.get<PracticeSession[]>('/coding/practice/sessions'),
  getPracticeProgress: () => api.get<{ solved: number; totalAttempts: number; byDifficulty: Record<string, number> }>('/coding/practice/progress'),

  // Recruiter review
  listVersionSubmissions: (versionId: string) =>
    api.get<CodingSubmission[]>(`/coding/assessment-versions/${versionId}/submissions`),
  reviewSubmission: (id: string) => api.get<SubmissionReview>(`/coding/submissions/${id}/review`),
};
