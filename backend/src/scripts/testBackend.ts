import 'dotenv/config';
import axios from 'axios';
import prisma from '../config/prisma';
import { CodingModel, hashSnapshot } from '../models/coding.model';
import { CodingSubmissionService } from '../services/codingSubmission.service';
import { startWorkers, stopWorkers } from '../workers/index';

const JUDGE0_URL = process.env.JUDGE0_API_URL ?? 'http://localhost:2358';

async function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  runId = 'pre-fix'
) {
  // #region agent log
  fetch('http://127.0.0.1:7617/ingest/7d84a2c4-6f53-4726-91f8-99d06e61f2c0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '50c635' },
    body: JSON.stringify({
      sessionId: '50c635',
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

async function preflightChecks(): Promise<void> {
  await debugLog('A', 'testBackend.ts:preflight', 'Using CodingModel instead of Prisma coding delegates', {
    approach: 'CodingModel',
  });

  let judge0Ok = false;
  let judge0Error: string | undefined;
  try {
    const res = await axios.get(`${JUDGE0_URL}/about`, { timeout: 5000 });
    judge0Ok = res.status === 200;
  } catch (err: unknown) {
    judge0Error = err instanceof Error ? err.message : String(err);
  }
  await debugLog('C', 'testBackend.ts:preflight', 'Judge0 health check', {
    judge0Url: JUDGE0_URL,
    judge0Ok,
    judge0Error,
  });

  if (!judge0Ok) {
    throw new Error(
      `Judge0 is not reachable at ${JUDGE0_URL}${judge0Error ? `: ${judge0Error}` : ''}. ` +
        'Start Judge0 (e.g. docker compose up judge0 judge0-db -d) before running this script.'
    );
  }
}

async function main() {
  await debugLog('B', 'testBackend.ts:main', 'Script started', { entry: 'src/scripts/testBackend.ts' });

  await preflightChecks();

  console.log('Starting background workers...');
  const workers = startWorkers();
  if (workers && workers.codingEvaluationWorker) {
    workers.codingEvaluationWorker.on('error', (err: any) => console.error('Worker error:', err));
    workers.codingEvaluationWorker.on('failed', (_job: any, err: any) => console.error('Job failed:', err));
  }
  await debugLog('D', 'testBackend.ts:workers', 'Workers started', {
    workerReady: Boolean(workers?.codingEvaluationWorker),
  });

  console.log('Setting up DB records...');
  const ts = Date.now();
  const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

  const user = await prisma.users.create({
    data: {
      email: `test_auditor_${ts}@jobyt.com`,
      role: 'applicant',
      auth_provider: 'local',
      is_verified: true,
      referral_code: `A_${shortId}`,
    },
  });

  const recruiter = await prisma.users.create({
    data: {
      email: `recruiter_auditor_${ts}@jobyt.com`,
      role: 'recruiter',
      auth_provider: 'local',
      is_verified: true,
      referral_code: `R_${shortId}`,
    },
  });

  const problem = await CodingModel.createProblem({
    created_by: recruiter.id,
    title: 'Test Problem',
    slug: `test-problem-audit-${ts}`,
    difficulty: 'easy',
    description: 'Print Hello World',
    supported_languages: ['python', 'javascript'],
    time_limit_sec: 5,
    memory_limit_kb: 128000,
  });

  await CodingModel.createTestCase({
    problem_id: problem.id,
    input: '',
    expected_output: 'Hello World\n',
    is_hidden: true,
    is_sample: false,
    weight: 10,
    order_index: 0,
    explanation: null,
  });

  await CodingModel.createTestCase({
    problem_id: problem.id,
    input: '',
    expected_output: 'Hello World\n',
    is_hidden: false,
    is_sample: true,
    weight: 0,
    order_index: 1,
    explanation: null,
  });

  const testCases = await CodingModel.listTestCases(problem.id);
  const pv = await CodingModel.createProblemVersion({
    problem_id: problem.id,
    version_number: 1,
    title: problem.title,
    description: problem.description,
    constraints: problem.constraints,
    hints: problem.hints,
    difficulty: problem.difficulty,
    supported_languages: problem.supported_languages,
    starter_code: problem.starter_code,
    time_limit_sec: problem.time_limit_sec,
    memory_limit_kb: problem.memory_limit_kb,
    published_by: recruiter.id,
    snapshot_hash: hashSnapshot({ ...problem, test_cases: testCases }),
  });
  await CodingModel.copyTestCasesToVersion(pv.id, testCases);
  await CodingModel.updateProblem(problem.id, { status: 'published', current_version_number: 1 });

  const assessment = await CodingModel.createAssessment({
    recruiter_id: recruiter.id,
    title: 'Audit Assessment',
    passing_score: 100,
    assessment_timing: 'post_apply',
  });
  await CodingModel.updateAssessment(assessment.id, { status: 'published', current_version_number: 1 });

  const sampleCases = await CodingModel.listVersionTestCases(pv.id, true);
  const problemSnapshot = {
    ...pv,
    sample_cases: sampleCases.map((tc) => ({
      input: tc.input,
      expected_output: tc.expected_output,
      explanation: tc.explanation,
    })),
  };

  const av = await CodingModel.createAssessmentVersion({
    assessment_id: assessment.id,
    version_number: 1,
    title: assessment.title,
    description: assessment.description,
    passing_score: assessment.passing_score,
    time_limit_minutes: assessment.time_limit_minutes,
    max_attempts: assessment.max_attempts,
    assessment_timing: assessment.assessment_timing,
    allow_resume: assessment.allow_resume,
    job_id: assessment.job_id,
    job_snapshot: null,
    published_by: recruiter.id,
    snapshot_hash: hashSnapshot({ assessment, problems: [problemSnapshot] }),
  });

  await CodingModel.createAssessmentVersionProblem({
    assessment_version_id: av.id,
    problem_version_id: pv.id,
    order_index: 0,
    points: 100,
    problem_snapshot: problemSnapshot,
  });

  const session = await CodingModel.createAssessmentSession({
    assessment_version_id: av.id,
    user_id: user.id,
    attempt_number: 1,
  });

  await debugLog('E', 'testBackend.ts:db-setup', 'DB fixtures created', {
    userId: user.id,
    problemVersionId: pv.id,
    sessionId: session.id,
  });

  console.log('Testing 9. Run code through Jobyt backend...');
  const runRes = await CodingSubmissionService.runCode(user.id, {
    problemVersionId: pv.id,
    language: 'python',
    sourceCode: "print('Hello World')",
  });
  console.log('Run Code Result:', runRes);

  console.log('Testing 10. Submit code through Jobyt backend...');
  const subRes = await CodingSubmissionService.submitCode(user.id, {
    problemVersionId: pv.id,
    language: 'python',
    sourceCode: "print('Hello World')",
    assessmentSessionId: session.id,
  });
  console.log('Submit Code Result:', subRes);

  console.log('Waiting for background eval queue...');
  let updatedSub;
  for (let i = 0; i < 20; i++) {
    updatedSub = await CodingModel.findSubmissionById(subRes.id);
    if (updatedSub?.status === 'completed' || updatedSub?.status === 'failed') break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  const testResults = updatedSub ? await CodingModel.listTestResults(updatedSub.id) : [];
  const aiEval = updatedSub ? await CodingModel.findEvaluationBySubmission(updatedSub.id) : null;
  const execLogs = await CodingModel.listExecutionLogs(user.id, 100);

  console.log('Verifying 11, 12, 13...');
  console.log('Submission Status:', updatedSub?.status);
  console.log('Score:', updatedSub?.score);
  console.log('Test Results Count:', testResults.length);
  console.log('AI Eval Count:', aiEval ? 1 : 0);
  console.log('Execution Logs Count:', execLogs.length);

  await debugLog('C', 'testBackend.ts:complete', 'Integration test finished', {
    submissionStatus: updatedSub?.status,
    score: updatedSub?.score,
    testResultsCount: testResults.length,
    execLogs: execLogs.length,
  });

  if (updatedSub?.status !== 'completed') {
    throw new Error(`Expected submission status "completed", got "${updatedSub?.status ?? 'unknown'}"`);
  }

  console.log('Done.');
}

main()
  .catch(async (e) => {
    await debugLog('C', 'testBackend.ts:error', 'Script failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopWorkers().catch(() => {});
    await prisma.$disconnect().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });
