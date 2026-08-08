import { CodingModel } from '../models/coding.model';
import { AssessmentSession } from '../types/coding.types';
import { badRequest, forbidden, notFound } from '../utils/appError';

export const AssessmentSessionService = {
  async start(userId: string, assessmentVersionId: string, applicationId?: string) {
    const version = await CodingModel.findAssessmentVersionById(assessmentVersionId);
    if (!version) throw notFound('Assessment version');

    const completedCount = await CodingModel.countCompletedSessions(userId, assessmentVersionId);
    if (completedCount >= version.max_attempts) {
      throw badRequest('Maximum attempts reached for this assessment');
    }

    const active = await CodingModel.findActiveSession(userId, assessmentVersionId);
    if (active) return active;

    const attemptNumber = completedCount + 1;
    let expiresAt: Date | undefined;
    let remainingSeconds: number | undefined;

    if (version.time_limit_minutes) {
      remainingSeconds = version.time_limit_minutes * 60;
      expiresAt = new Date(Date.now() + remainingSeconds * 1000);
    }

    return CodingModel.createAssessmentSession({
      assessment_version_id: assessmentVersionId,
      user_id: userId,
      application_id: applicationId,
      expires_at: expiresAt,
      remaining_time_seconds: remainingSeconds,
      attempt_number: attemptNumber,
    });
  },

  async getSession(sessionId: string, userId: string) {
    const session = await CodingModel.findSessionById(sessionId);
    if (!session) throw notFound('Session');
    if (session.user_id !== userId) throw forbidden();
    return session;
  },

  async heartbeat(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId);

    if (session.status !== 'active') {
      throw badRequest(`Session is ${session.status}`);
    }

    if (session.expires_at && new Date() > new Date(session.expires_at)) {
      await CodingModel.updateSession(sessionId, { status: 'expired' });
      throw badRequest('Assessment session has expired');
    }

    let remaining = session.remaining_time_seconds;
    if (session.last_heartbeat_at && remaining !== null) {
      const elapsed = Math.floor((Date.now() - new Date(session.last_heartbeat_at).getTime()) / 1000);
      remaining = Math.max(0, remaining - elapsed);
    }

    if (remaining !== null && remaining <= 0) {
      await CodingModel.updateSession(sessionId, { status: 'expired', remaining_time_seconds: 0 });
      throw badRequest('Assessment session has expired');
    }

    return CodingModel.updateSession(sessionId, {
      remaining_time_seconds: remaining ?? undefined,
      last_heartbeat_at: new Date(),
      status: 'active',
    });
  },

  async resume(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId);
    const version = await CodingModel.findAssessmentVersionById(session.assessment_version_id);
    if (!version) throw notFound('Assessment version');
    if (!version.allow_resume) throw badRequest('Resume is not allowed for this assessment');
    if (session.status === 'expired') throw badRequest('Session has expired');

    // Recalculate remaining time against wall clock (same logic as heartbeat)
    let remaining = session.remaining_time_seconds;
    if (session.last_heartbeat_at && remaining !== null) {
      const elapsed = Math.floor((Date.now() - new Date(session.last_heartbeat_at).getTime()) / 1000);
      remaining = Math.max(0, remaining - elapsed);
    }

    if (remaining !== null && remaining <= 0) {
      await CodingModel.updateSession(sessionId, { status: 'expired', remaining_time_seconds: 0 });
      throw badRequest('Assessment session has expired');
    }

    return CodingModel.updateSession(sessionId, {
      status: 'active',
      last_heartbeat_at: new Date(),
      remaining_time_seconds: remaining ?? undefined,
    });
  },

  async getProblems(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId);
    const versionProblems = await CodingModel.listAssessmentVersionProblems(session.assessment_version_id);

    return versionProblems.map((vp) => {
      const snapshot = vp.problem_snapshot as Record<string, unknown>;
      return {
        problem_version_id: vp.problem_version_id,
        order_index: vp.order_index,
        points: vp.points,
        title: snapshot.title,
        description: snapshot.description,
        constraints: snapshot.constraints,
        hints: snapshot.hints,
        difficulty: snapshot.difficulty,
        supported_languages: snapshot.supported_languages,
        starter_code: snapshot.starter_code,
        sample_cases: snapshot.sample_cases,
      };
    });
  },

  async complete(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId);
    // Idempotency guard: if already submitted or completed, return current state
    if (session.status === 'submitted' || session.status === 'completed') {
      return CodingModel.findSessionById(sessionId);
    }
    if (session.status !== 'active') {
      throw badRequest(`Session cannot be completed in status: ${session.status}`);
    }
    await CodingModel.updateSession(sessionId, {
      status: 'submitted',
      completed_at: new Date(),
    });
    return (await CodingModel.tryFinalizeAssessmentSession(sessionId)) ?? CodingModel.findSessionById(sessionId);
  },

  async reviewSession(sessionId: string, recruiterId: string) {
    const session = await CodingModel.findSessionById(sessionId);
    if (!session) throw notFound('Session');

    const version = await CodingModel.findAssessmentVersionById(session.assessment_version_id);
    if (!version) throw notFound('Assessment version');

    const assessment = await CodingModel.findAssessmentById(version.assessment_id);
    if (!assessment || assessment.recruiter_id !== recruiterId) throw forbidden();

    const submissions = await CodingModel.listSubmissionsBySession(sessionId);
    return { session, submissions };
  },

  async listSessionsForVersion(versionId: string, recruiterId: string) {
    const version = await CodingModel.findAssessmentVersionById(versionId);
    if (!version) throw notFound('Assessment version');

    const assessment = await CodingModel.findAssessmentById(version.assessment_id);
    if (!assessment || assessment.recruiter_id !== recruiterId) throw forbidden();

    return CodingModel.listSessionsForVersionWithUser(versionId);
  },
};
