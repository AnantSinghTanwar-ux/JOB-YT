import { getCodingEvaluationQueue } from '../config/queue';
import { CodingModel } from '../models/coding.model';
import { Judge0Service } from './judge0.service';
import { RunCodeRequest, SubmitCodeRequest } from '../types/coding.types';
import { badRequest, forbidden, notFound } from '../utils/appError';

const EXECUTION_LOG_RETENTION = parseInt(process.env.EXECUTION_LOG_RETENTION_COUNT || '50', 10);

/** Maximum allowed source code size (64 KB) */
const MAX_SOURCE_CODE_BYTES = 65_536;

export const CodingSubmissionService = {
  async runCode(userId: string, req: RunCodeRequest) {
    // Guard: source code size
    if (Buffer.byteLength(req.sourceCode, 'utf8') > MAX_SOURCE_CODE_BYTES) {
      throw badRequest('Source code exceeds the maximum allowed size of 64 KB');
    }

    let problemVersionId = req.problemVersionId;
    let timeLimit = 5;
    let memoryLimit = 128000;

    if (!problemVersionId && req.problemId) {
      const pv = await CodingModel.getLatestProblemVersion(req.problemId);
      if (!pv) throw notFound('Published problem version');
      problemVersionId = pv.id;
    }

    if (!problemVersionId) throw badRequest('problemVersionId or problemId is required');

    const version = await CodingModel.findProblemVersionById(problemVersionId);
    if (!version) throw notFound('Problem version');

    if (!version.supported_languages.includes(req.language)) {
      throw badRequest(`Language ${req.language} is not supported for this problem`);
    }

    timeLimit = version.time_limit_sec;
    memoryLimit = version.memory_limit_kb;

    const testCases = req.stdin
      ? [{ input: req.stdin, expected_output: '' }]
      : await CodingModel.listVersionTestCases(problemVersionId, true);

    // Execute all sample test cases in parallel
    const executions = await Promise.all(
      testCases.map((tc) =>
        Judge0Service.execute({
          language: req.language,
          sourceCode: req.sourceCode,
          stdin: tc.input,
          expectedOutput: tc.expected_output || undefined,
          cpuTimeLimit: timeLimit,
          memoryLimitKb: memoryLimit,
        }).then((result) => ({ tc, result })),
      ),
    );

    const results = [];

    for (const { tc, result } of executions) {
      const passed = tc.expected_output
        ? Judge0Service.isAccepted(result) && Judge0Service.compareOutput(result.stdout, tc.expected_output)
        : Judge0Service.isAccepted(result);

      results.push({
        passed,
        stdout: result.stdout,
        stderr: result.stderr,
        compileOutput: result.compile_output,
        time: result.time ? parseFloat(result.time) : null,
        memory: result.memory,
        status: result.status,
      });

      await CodingModel.createExecutionLog({
        user_id: userId,
        problem_version_id: problemVersionId,
        assessment_session_id: req.assessmentSessionId || null,
        practice_session_id: req.practiceSessionId || null,
        language: req.language,
        source_code: req.sourceCode,
        stdin: tc.input,
        stdout: result.stdout,
        stderr: result.stderr,
        compile_output: result.compile_output,
        execution_time_ms: result.time ? Math.round(parseFloat(result.time) * 1000) : null,
        memory_kb: result.memory,
        status: passed ? 'success' : result.compile_output ? 'compile_error' : 'runtime_error',
        judge0_token: result.token,
      });
    }

    await CodingModel.pruneExecutionLogs(userId, EXECUTION_LOG_RETENTION);

    return { results, compileOutput: results[0]?.compileOutput ?? null };
  },

  async submitCode(userId: string, req: SubmitCodeRequest) {
    // Guard: source code size
    if (Buffer.byteLength(req.sourceCode, 'utf8') > MAX_SOURCE_CODE_BYTES) {
      throw badRequest('Source code exceeds the maximum allowed size of 64 KB');
    }

    const version = await CodingModel.findProblemVersionById(req.problemVersionId);
    if (!version) throw notFound('Problem version');

    if (!version.supported_languages.includes(req.language)) {
      throw badRequest(`Language ${req.language} is not supported`);
    }

    let assessmentVersionId: string | undefined;
    let assessmentSnapshot: Record<string, unknown> | null = null;
    let jobSnapshot: Record<string, unknown> | null = null;
    let passingScore = 70;

    if (req.assessmentSessionId) {
      const session = await CodingModel.findSessionById(req.assessmentSessionId);
      if (!session) throw notFound('Session');
      if (session.user_id !== userId) throw forbidden();
      if (session.status !== 'active') throw badRequest(`Session is ${session.status}`);

      if (session.expires_at && new Date() > new Date(session.expires_at)) {
        await CodingModel.updateSession(req.assessmentSessionId, { status: 'expired' });
        throw badRequest('Session has expired');
      }

      const av = await CodingModel.findAssessmentVersionById(session.assessment_version_id);
      if (av) {
        assessmentVersionId = av.id;
        passingScore = av.passing_score;
        assessmentSnapshot = {
          title: av.title,
          passing_score: av.passing_score,
          version_number: av.version_number,
        };
        jobSnapshot = av.job_snapshot;
      }
    }

    const sampleCases = await CodingModel.listVersionTestCases(req.problemVersionId, true);
    const problemSnapshot = {
      title: version.title,
      description: version.description,
      constraints: version.constraints,
      sample_cases: sampleCases.map((tc) => ({
        input: tc.input,
        expected_output: tc.expected_output,
        explanation: tc.explanation,
      })),
    };

    const attemptNumber = await CodingModel.getNextAttemptNumber(
      userId,
      req.problemVersionId,
      req.assessmentSessionId,
    );

    const submission = await CodingModel.createSubmission({
      user_id: userId,
      problem_version_id: req.problemVersionId,
      language: req.language,
      source_code: req.sourceCode,
      assessment_session_id: req.assessmentSessionId,
      practice_session_id: req.practiceSessionId,
      assessment_version_id: assessmentVersionId,
      application_id: req.applicationId,
      attempt_number: attemptNumber,
      assessment_snapshot: assessmentSnapshot || undefined,
      problem_snapshot: problemSnapshot,
      job_snapshot: jobSnapshot || undefined,
    });

    const evalQueue = getCodingEvaluationQueue();
    if (evalQueue) {
      try {
        await evalQueue.add(
          'evaluateSubmission',
          { submissionId: submission.id, passingScore },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        );
      } catch (queueErr) {
        console.warn('[CodingSubmission] Failed to enqueue submission evaluation, executing synchronously as fallback:', queueErr);
        // Fire and forget fallback
        CodingSubmissionService.evaluateSubmission(submission.id, passingScore).catch(err => {
          console.error('[CodingSubmission] Synchronous evaluation fallback failed:', err);
        });
      }
    } else {
      console.warn('[CodingSubmission] Redis unavailable — executing submission evaluation synchronously as fallback');
      // Fire and forget fallback
      CodingSubmissionService.evaluateSubmission(submission.id, passingScore).catch(err => {
        console.error('[CodingSubmission] Synchronous evaluation fallback failed:', err);
      });
    }

    if (req.practiceSessionId) {
      const ps = await CodingModel.findPracticeSessionById(req.practiceSessionId);
      if (ps) {
        await CodingModel.updatePracticeSession(req.practiceSessionId, {
          attempts_count: ps.attempts_count + 1,
        });
      }
    }

    return submission;
  },

  async evaluateSubmission(submissionId: string, passingScore: number) {
    const submission = await CodingModel.findSubmissionById(submissionId);
    if (!submission) return;

    await CodingModel.updateSubmission(submissionId, { status: 'running' });

    // Fetch hidden cases and version info concurrently
    const [hiddenCases, version] = await Promise.all([
      CodingModel.listHiddenVersionTestCases(submission.problem_version_id),
      CodingModel.findProblemVersionById(submission.problem_version_id),
    ]);

    // Execute all hidden test cases in parallel (was sequential before — O(n) → O(1) latency)
    const executions = await Promise.all(
      hiddenCases.map((tc) =>
        Judge0Service.execute({
          language: submission.language,
          sourceCode: submission.source_code,
          stdin: tc.input,
          expectedOutput: tc.expected_output,
          cpuTimeLimit: version?.time_limit_sec ?? 5,
          memoryLimitKb: version?.memory_limit_kb ?? 128000,
        }).then((result) => ({ tc, result })),
      ),
    );

    let totalWeight = 0;
    let passedWeight = 0;
    let allPassed = true;
    let totalTimeMs = 0;
    let maxMemoryKb = 0;
    const tokens: string[] = [];

    // Persist results sequentially (preserves ordering, avoids DB race conditions)
    for (const { tc, result } of executions) {
      totalWeight += tc.weight;
      tokens.push(result.token);

      const passed =
        Judge0Service.isAccepted(result) &&
        Judge0Service.compareOutput(result.stdout, tc.expected_output);

      if (passed) passedWeight += tc.weight;
      else allPassed = false;

      if (result.time) totalTimeMs += Math.round(parseFloat(result.time) * 1000);
      if (result.memory) maxMemoryKb = Math.max(maxMemoryKb, result.memory);

      await CodingModel.createTestResult({
        submission_id: submissionId,
        test_case_id: tc.id,
        passed,
        // Store actual stdout; sanitization happens at the read layer (getSubmission)
        actual_output: result.stdout,
        stderr: result.stderr,
        time_sec: result.time ? parseFloat(result.time) : null,
        memory_kb: result.memory,
        status_id: result.status?.id ?? null,
      });
    }

    const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
    const passed = allPassed && score >= passingScore;
    const testResults = await CodingModel.listTestResults(submissionId);
    const passCount = testResults.filter((r) => r.passed).length;

    await CodingModel.updateSubmission(submissionId, {
      status: 'completed',
      test_pass_count: passCount,
      test_total_count: hiddenCases.length,
      score,
      passed,
      execution_time_ms: totalTimeMs,
      memory_kb: maxMemoryKb,
      judge0_tokens: tokens,
    });

    if (submission.practice_session_id && passed) {
      const ps = await CodingModel.findPracticeSessionById(submission.practice_session_id);
      if (ps) {
        await CodingModel.updatePracticeSession(submission.practice_session_id, {
          solved: true,
          best_score: Math.max(ps.best_score ?? 0, score),
          completed_at: new Date(),
        });
      }
    }

    if (submission.assessment_session_id) {
      await CodingModel.tryFinalizeAssessmentSession(submission.assessment_session_id);
    }

    return CodingModel.findSubmissionById(submissionId);
  },

  async getSubmission(submissionId: string, userId: string, role: string) {
    const submission = await CodingModel.findSubmissionById(submissionId);
    if (!submission) throw notFound('Submission');

    if (role === 'applicant' && submission.user_id !== userId) throw forbidden();

    const testResults = await CodingModel.listTestResults(submissionId);

    // Sanitize: applicants see only pass/fail for hidden cases, never the raw output
    const sanitizedResults = testResults.map((r) => ({
      ...r,
      actual_output: r.is_hidden ? (r.passed ? '[passed]' : '[failed]') : r.actual_output,
    }));

    const evaluation = await CodingModel.findEvaluationBySubmission(submissionId);

    return {
      ...submission,
      passFailSource: 'hidden_tests',
      testResults: sanitizedResults,
      evaluation: evaluation
        ? { ...evaluation, disclaimer: 'AI feedback is informational and does not affect pass/fail.' }
        : null,
    };
  },

  async listSubmissions(userId: string, page = 1, limit = 20) {
    return CodingModel.listSubmissions(userId, page, limit);
  },

  async reviewSubmission(submissionId: string, recruiterId: string) {
    const submission = await CodingModel.findSubmissionById(submissionId);
    if (!submission) throw notFound('Submission');

    if (submission.assessment_version_id) {
      const version = await CodingModel.findAssessmentVersionById(submission.assessment_version_id);
      if (version) {
        const assessment = await CodingModel.findAssessmentById(version.assessment_id);
        if (!assessment || assessment.recruiter_id !== recruiterId) throw forbidden();
      }
    }

    const testResults = await CodingModel.listTestResults(submissionId);
    const evaluation = await CodingModel.findEvaluationBySubmission(submissionId);

    return {
      ...submission,
      passFailSource: 'hidden_tests',
      testResults, // recruiters see full raw output
      evaluation,
    };
  },

  async listSubmissionsForVersion(versionId: string, recruiterId: string) {
    const version = await CodingModel.findAssessmentVersionById(versionId);
    if (!version) throw notFound('Assessment version');

    const assessment = await CodingModel.findAssessmentById(version.assessment_id);
    if (!assessment || assessment.recruiter_id !== recruiterId) throw forbidden();

    return CodingModel.listSubmissionsByVersion(versionId);
  },
};
