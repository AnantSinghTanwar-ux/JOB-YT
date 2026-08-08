import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth';
import { employerGuard } from '../middleware/employerGuard';
import { CodingController } from '../controllers/coding.controller';

const router = Router();

const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many run requests' },
});

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many submit requests' },
});

router.use(authenticate);

// ─── Problems (Recruiter) ───────────────────────────────────
router.get('/problems', authorize('recruiter', 'admin'), CodingController.listProblems);
router.post('/problems', authorize('recruiter', 'admin'), CodingController.createProblem);
router.get('/problems/:id', authorize('recruiter', 'admin', 'applicant'), CodingController.getProblem);
router.put('/problems/:id', authorize('recruiter', 'admin'), CodingController.updateProblem);
router.delete('/problems/:id', authorize('recruiter', 'admin'), CodingController.deleteProblem);
router.post('/problems/:id/publish', authorize('recruiter', 'admin'), CodingController.publishProblem);
router.get('/problems/:id/versions', authorize('recruiter', 'admin'), CodingController.listProblemVersions);
router.post('/problems/:id/test-cases', authorize('recruiter', 'admin'), CodingController.addTestCase);

// ─── Problem Versions ───────────────────────────────────────
router.get('/problem-versions/:id', authorize('recruiter', 'admin', 'applicant'), CodingController.getProblemVersion);

// ─── Test Cases ─────────────────────────────────────────────
router.put('/test-cases/:id', authorize('recruiter', 'admin'), CodingController.updateTestCase);
router.delete('/test-cases/:id', authorize('recruiter', 'admin'), CodingController.deleteTestCase);

// ─── Collections (Recruiter) ────────────────────────────────
router.get('/collections', authorize('recruiter', 'admin'), CodingController.listCollections);
router.post('/collections', authorize('recruiter', 'admin'), CodingController.createCollection);
router.get('/collections/:id/problems', authorize('recruiter', 'admin'), CodingController.getCollectionProblems);
router.post('/collections/:id/problems', authorize('recruiter', 'admin'), CodingController.addToCollection);
router.delete('/collections/:id/problems/:problemId', authorize('recruiter', 'admin'), CodingController.removeFromCollection);
router.post('/collections/:id/import-to-assessment/:assessmentId', authorize('recruiter', 'admin'), CodingController.importCollectionToAssessment);

// ─── Assessments (Recruiter) ────────────────────────────────
router.get('/assessments', authorize('recruiter', 'admin'), employerGuard, CodingController.listAssessments);
router.post('/assessments', authorize('recruiter', 'admin'), employerGuard, CodingController.createAssessment);
router.get('/assessments/:id', authorize('recruiter', 'admin'), employerGuard, CodingController.getAssessment);
router.put('/assessments/:id', authorize('recruiter', 'admin'), employerGuard, CodingController.updateAssessment);
router.post('/assessments/:id/publish', authorize('recruiter', 'admin'), employerGuard, CodingController.publishAssessment);
router.get('/assessments/:id/versions', authorize('recruiter', 'admin'), employerGuard, CodingController.listAssessmentVersions);
router.post('/assessments/:id/problems', authorize('recruiter', 'admin'), employerGuard, CodingController.attachProblemToAssessment);
router.delete('/assessments/:id/problems/:problemId', authorize('recruiter', 'admin'), employerGuard, CodingController.detachProblemFromAssessment);
router.post('/assessments/:id/attach-job/:jobId', authorize('recruiter', 'admin'), employerGuard, CodingController.attachJob);

// ─── Assessment Versions ──────────────────────────────────────
router.get('/assessment-versions/:id', authorize('recruiter', 'admin'), employerGuard, CodingController.getAssessmentVersion);
router.get('/assessment-versions/:id/sessions', authorize('recruiter', 'admin'), employerGuard, CodingController.listVersionSessions);
router.get('/assessment-versions/:id/submissions', authorize('recruiter', 'admin'), employerGuard, CodingController.listVersionSubmissions);

// ─── Sessions (Applicant) ───────────────────────────────────
router.post('/sessions/start', authorize('applicant'), CodingController.startSession);
router.get('/sessions/:id', authorize('applicant'), CodingController.getSession);
router.post('/sessions/:id/heartbeat', authorize('applicant'), CodingController.heartbeat);
router.post('/sessions/:id/resume', authorize('applicant'), CodingController.resumeSession);
router.get('/sessions/:id/problems', authorize('applicant'), CodingController.getSessionProblems);
router.post('/sessions/:id/complete', authorize('applicant'), CodingController.completeSession);
router.get('/sessions/:id/review', authorize('recruiter', 'admin'), employerGuard, CodingController.reviewSession);

// ─── Execution (Applicant) ──────────────────────────────────
router.post('/run', authorize('applicant'), runLimiter, CodingController.runCode);
router.post('/submit', authorize('applicant'), submitLimiter, CodingController.submitCode);
router.get('/submissions', authorize('applicant'), CodingController.listSubmissions);
router.get('/submissions/:id', authorize('applicant', 'recruiter', 'admin'), CodingController.getSubmission);
router.get('/submissions/:id/evaluation', authorize('applicant', 'recruiter', 'admin'), CodingController.getEvaluation);
router.get('/submissions/:id/review', authorize('recruiter', 'admin'), employerGuard, CodingController.reviewSubmission);
router.get('/execution-logs', authorize('applicant'), CodingController.listExecutionLogs);

// ─── Practice (Applicant) ───────────────────────────────────
router.get('/practice/problems', authorize('applicant'), CodingController.listPracticeProblems);
router.post('/practice/sessions', authorize('applicant'), CodingController.startPracticeSession);
router.get('/practice/sessions', authorize('applicant'), CodingController.listPracticeSessions);
router.get('/practice/progress', authorize('applicant'), CodingController.getPracticeProgress);

export default router;
