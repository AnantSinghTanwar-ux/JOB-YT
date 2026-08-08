import crypto from 'node:crypto';
import pool from '../config/database';
import {
  AssessmentSession,
  AssessmentVersion,
  AssessmentVersionProblem,
  CodingAssessment,
  CodingProblem,
  CodingSubmission,
  CodingTestCase,
  CodeEvaluation,
  ExecutionLog,
  PracticeSession,
  ProblemCollection,
  ProblemVersion,
  ProblemVersionTestCase,
  SubmissionTestResult,
} from '../types/coding.types';

function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val as T;
  try {
    return JSON.parse(String(val)) as T;
  } catch {
    return fallback;
  }
}

function mapProblem(row: Record<string, unknown>): CodingProblem {
  return {
    id: String(row.id),
    created_by: String(row.created_by),
    title: String(row.title),
    slug: String(row.slug),
    status: row.status as CodingProblem['status'],
    current_version_number: Number(row.current_version_number),
    difficulty: row.difficulty as CodingProblem['difficulty'],
    supported_languages: (row.supported_languages as string[]) || [],
    description: String(row.description || ''),
    constraints: row.constraints ? String(row.constraints) : null,
    hints: parseJson<string[]>(row.hints, []),
    starter_code: parseJson<Record<string, string>>(row.starter_code, {}),
    time_limit_sec: Number(row.time_limit_sec),
    memory_limit_kb: Number(row.memory_limit_kb),
    tags: (row.tags as string[]) || [],
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
    deleted_at: row.deleted_at ? new Date(String(row.deleted_at)) : null,
  };
}

function mapTestCase(row: Record<string, unknown>): CodingTestCase {
  return {
    id: String(row.id),
    problem_id: String(row.problem_id),
    input: String(row.input ?? ''),
    expected_output: String(row.expected_output ?? ''),
    is_hidden: Boolean(row.is_hidden),
    is_sample: Boolean(row.is_sample),
    weight: Number(row.weight),
    order_index: Number(row.order_index),
    explanation: row.explanation ? String(row.explanation) : null,
  };
}

function mapProblemVersion(row: Record<string, unknown>): ProblemVersion {
  return {
    id: String(row.id),
    problem_id: String(row.problem_id),
    version_number: Number(row.version_number),
    title: String(row.title),
    description: String(row.description),
    constraints: row.constraints ? String(row.constraints) : null,
    hints: parseJson<string[]>(row.hints, []),
    difficulty: row.difficulty as ProblemVersion['difficulty'],
    supported_languages: (row.supported_languages as string[]) || [],
    starter_code: parseJson<Record<string, string>>(row.starter_code, {}),
    time_limit_sec: Number(row.time_limit_sec),
    memory_limit_kb: Number(row.memory_limit_kb),
    published_at: new Date(String(row.published_at)),
    published_by: String(row.published_by),
    snapshot_hash: String(row.snapshot_hash),
  };
}

function mapPvTestCase(row: Record<string, unknown>): ProblemVersionTestCase {
  return {
    id: String(row.id),
    problem_version_id: String(row.problem_version_id),
    input: String(row.input ?? ''),
    expected_output: String(row.expected_output ?? ''),
    is_hidden: Boolean(row.is_hidden),
    is_sample: Boolean(row.is_sample),
    weight: Number(row.weight),
    order_index: Number(row.order_index),
    explanation: row.explanation ? String(row.explanation) : null,
  };
}

function mapSubmission(row: Record<string, unknown>): CodingSubmission {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    assessment_session_id: row.assessment_session_id ? String(row.assessment_session_id) : null,
    practice_session_id: row.practice_session_id ? String(row.practice_session_id) : null,
    problem_version_id: String(row.problem_version_id),
    assessment_version_id: row.assessment_version_id ? String(row.assessment_version_id) : null,
    application_id: row.application_id ? String(row.application_id) : null,
    attempt_number: Number(row.attempt_number),
    language: String(row.language),
    source_code: String(row.source_code),
    status: row.status as CodingSubmission['status'],
    test_pass_count: Number(row.test_pass_count),
    test_total_count: Number(row.test_total_count),
    score: row.score !== null ? Number(row.score) : null,
    passed: row.passed !== null ? Boolean(row.passed) : null,
    execution_time_ms: row.execution_time_ms !== null ? Number(row.execution_time_ms) : null,
    memory_kb: row.memory_kb !== null ? Number(row.memory_kb) : null,
    assessment_snapshot: parseJson(row.assessment_snapshot, null),
    problem_snapshot: parseJson(row.problem_snapshot, null),
    job_snapshot: parseJson(row.job_snapshot, null),
    judge0_tokens: (row.judge0_tokens as string[]) || [],
    created_at: new Date(String(row.created_at)),
  };
}

export function hashSnapshot(data: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export const CodingModel = {
  // ─── Problems ───────────────────────────────────────────────
  async createProblem(data: {
    created_by: string;
    title: string;
    slug: string;
    difficulty?: string;
    supported_languages?: string[];
    description?: string;
    constraints?: string;
    hints?: string[];
    starter_code?: Record<string, string>;
    time_limit_sec?: number;
    memory_limit_kb?: number;
    tags?: string[];
  }): Promise<CodingProblem> {
    const { rows } = await pool.query(
      `INSERT INTO coding_problems
        (created_by, title, slug, difficulty, supported_languages, description, constraints, hints, starter_code, time_limit_sec, memory_limit_kb, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        data.created_by,
        data.title,
        data.slug,
        data.difficulty || 'medium',
        data.supported_languages || ['python', 'javascript', 'java', 'cpp'],
        data.description || '',
        data.constraints || null,
        JSON.stringify(data.hints || []),
        JSON.stringify(data.starter_code || {}),
        data.time_limit_sec || 5,
        data.memory_limit_kb || 128000,
        data.tags || [],
      ],
    );
    return mapProblem(rows[0]);
  },

  async findProblemById(id: string): Promise<CodingProblem | null> {
    const { rows } = await pool.query(
      `SELECT * FROM coding_problems WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0] ? mapProblem(rows[0]) : null;
  },

  async listProblems(createdBy: string, page = 1, limit = 20): Promise<{ items: CodingProblem[]; total: number }> {
    const offset = (page - 1) * limit;
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM coding_problems WHERE created_by = $1 AND deleted_at IS NULL`,
      [createdBy],
    );
    const { rows } = await pool.query(
      `SELECT * FROM coding_problems WHERE created_by = $1 AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
      [createdBy, limit, offset],
    );
    return { items: rows.map(mapProblem), total: parseInt(countRows[0].count, 10) };
  },

  async updateProblem(id: string, data: Partial<CodingProblem>): Promise<CodingProblem | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowed = [
      'title', 'slug', 'difficulty', 'supported_languages', 'description',
      'constraints', 'hints', 'starter_code', 'time_limit_sec', 'memory_limit_kb', 'tags', 'status',
    ];

    for (const key of allowed) {
      const val = (data as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${key} = $${idx++}`);
        if (key === 'hints' || key === 'starter_code') {
          values.push(JSON.stringify(val));
        } else {
          values.push(val);
        }
      }
    }

    if (!fields.length) return this.findProblemById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE coding_problems SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values,
    );
    return rows[0] ? mapProblem(rows[0]) : null;
  },

  async softDeleteProblem(id: string): Promise<void> {
    await pool.query(`UPDATE coding_problems SET deleted_at = NOW() WHERE id = $1`, [id]);
  },

  // ─── Test Cases (draft) ─────────────────────────────────────
  async listTestCases(problemId: string): Promise<CodingTestCase[]> {
    const { rows } = await pool.query(
      `SELECT * FROM coding_test_cases WHERE problem_id = $1 ORDER BY order_index`,
      [problemId],
    );
    return rows.map(mapTestCase);
  },

  async listSampleTestCases(problemId: string): Promise<CodingTestCase[]> {
    const { rows } = await pool.query(
      `SELECT * FROM coding_test_cases WHERE problem_id = $1 AND is_sample = true ORDER BY order_index`,
      [problemId],
    );
    return rows.map(mapTestCase);
  },

  async createTestCase(data: Omit<CodingTestCase, 'id'>): Promise<CodingTestCase> {
    const { rows } = await pool.query(
      `INSERT INTO coding_test_cases (problem_id, input, expected_output, is_hidden, is_sample, weight, order_index, explanation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [data.problem_id, data.input, data.expected_output, data.is_hidden, data.is_sample, data.weight, data.order_index, data.explanation],
    );
    return mapTestCase(rows[0]);
  },

  async updateTestCase(id: string, data: Partial<CodingTestCase>): Promise<CodingTestCase | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of ['input', 'expected_output', 'is_hidden', 'is_sample', 'weight', 'order_index', 'explanation'] as const) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }
    if (!fields.length) return null;
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE coding_test_cases SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return rows[0] ? mapTestCase(rows[0]) : null;
  },

  async deleteTestCase(id: string): Promise<void> {
    await pool.query(`DELETE FROM coding_test_cases WHERE id = $1`, [id]);
  },

  // ─── Problem Versions ─────────────────────────────────────
  async createProblemVersion(data: {
    problem_id: string;
    version_number: number;
    title: string;
    description: string;
    constraints: string | null;
    hints: string[];
    difficulty: string;
    supported_languages: string[];
    starter_code: Record<string, string>;
    time_limit_sec: number;
    memory_limit_kb: number;
    published_by: string;
    snapshot_hash: string;
  }): Promise<ProblemVersion> {
    const { rows } = await pool.query(
      `INSERT INTO problem_versions
        (problem_id, version_number, title, description, constraints, hints, difficulty, supported_languages, starter_code, time_limit_sec, memory_limit_kb, published_by, snapshot_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        data.problem_id, data.version_number, data.title, data.description, data.constraints,
        JSON.stringify(data.hints), data.difficulty, data.supported_languages,
        JSON.stringify(data.starter_code), data.time_limit_sec, data.memory_limit_kb,
        data.published_by, data.snapshot_hash,
      ],
    );
    return mapProblemVersion(rows[0]);
  },

  async copyTestCasesToVersion(problemVersionId: string, testCases: CodingTestCase[]): Promise<void> {
    for (const tc of testCases) {
      await pool.query(
        `INSERT INTO problem_version_test_cases (problem_version_id, input, expected_output, is_hidden, is_sample, weight, order_index, explanation)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [problemVersionId, tc.input, tc.expected_output, tc.is_hidden, tc.is_sample, tc.weight, tc.order_index, tc.explanation],
      );
    }
  },

  async findProblemVersionById(id: string): Promise<ProblemVersion | null> {
    const { rows } = await pool.query(`SELECT * FROM problem_versions WHERE id = $1`, [id]);
    return rows[0] ? mapProblemVersion(rows[0]) : null;
  },

  async listProblemVersions(problemId: string): Promise<ProblemVersion[]> {
    const { rows } = await pool.query(
      `SELECT * FROM problem_versions WHERE problem_id = $1 ORDER BY version_number DESC`,
      [problemId],
    );
    return rows.map(mapProblemVersion);
  },

  async getLatestProblemVersion(problemId: string): Promise<ProblemVersion | null> {
    const { rows } = await pool.query(
      `SELECT * FROM problem_versions WHERE problem_id = $1 ORDER BY version_number DESC LIMIT 1`,
      [problemId],
    );
    return rows[0] ? mapProblemVersion(rows[0]) : null;
  },

  async listVersionTestCases(versionId: string, sampleOnly = false): Promise<ProblemVersionTestCase[]> {
    const query = sampleOnly
      ? `SELECT * FROM problem_version_test_cases WHERE problem_version_id = $1 AND is_sample = true ORDER BY order_index`
      : `SELECT * FROM problem_version_test_cases WHERE problem_version_id = $1 ORDER BY order_index`;
    const { rows } = await pool.query(query, [versionId]);
    return rows.map(mapPvTestCase);
  },

  async listHiddenVersionTestCases(versionId: string): Promise<ProblemVersionTestCase[]> {
    const { rows } = await pool.query(
      `SELECT * FROM problem_version_test_cases WHERE problem_version_id = $1 AND is_hidden = true ORDER BY order_index`,
      [versionId],
    );
    return rows.map(mapPvTestCase);
  },

  async listPracticeProblems(page = 1, limit = 20): Promise<{ items: ProblemVersion[]; total: number }> {
    const offset = (page - 1) * limit;
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(DISTINCT pv.id) FROM problem_versions pv
       INNER JOIN coding_problems cp ON cp.id = pv.problem_id
       WHERE cp.status = 'published' AND cp.deleted_at IS NULL`,
    );
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (pv.problem_id) pv.*
       FROM problem_versions pv
       INNER JOIN coding_problems cp ON cp.id = pv.problem_id
       WHERE cp.status = 'published' AND cp.deleted_at IS NULL
       ORDER BY pv.problem_id, pv.version_number DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return { items: rows.map(mapProblemVersion), total: parseInt(countRows[0].count, 10) };
  },

  // ─── Collections ──────────────────────────────────────────
  async createCollection(data: { created_by: string; name: string; description?: string }): Promise<ProblemCollection> {
    const { rows } = await pool.query(
      `INSERT INTO problem_collections (created_by, name, description) VALUES ($1,$2,$3) RETURNING *`,
      [data.created_by, data.name, data.description || null],
    );
    return rows[0] as ProblemCollection;
  },

  async listCollections(createdBy: string): Promise<ProblemCollection[]> {
    const { rows } = await pool.query(
      `SELECT pc.*, COUNT(cp.problem_id) AS problem_count
       FROM problem_collections pc
       LEFT JOIN collection_problems cp ON cp.collection_id = pc.id
       WHERE pc.created_by = $1
       GROUP BY pc.id ORDER BY pc.updated_at DESC`,
      [createdBy],
    );
    return rows.map((r) => ({
      id: String(r.id),
      created_by: String(r.created_by),
      name: String(r.name),
      description: r.description ? String(r.description) : null,
      is_shared: Boolean(r.is_shared),
      created_at: new Date(String(r.created_at)),
      updated_at: new Date(String(r.updated_at)),
      problem_count: parseInt(r.problem_count, 10),
    }));
  },

  async addToCollection(collectionId: string, problemId: string, orderIndex: number): Promise<void> {
    await pool.query(
      `INSERT INTO collection_problems (collection_id, problem_id, order_index) VALUES ($1,$2,$3)
       ON CONFLICT (collection_id, problem_id) DO UPDATE SET order_index = $3`,
      [collectionId, problemId, orderIndex],
    );
  },

  async removeFromCollection(collectionId: string, problemId: string): Promise<void> {
    await pool.query(`DELETE FROM collection_problems WHERE collection_id = $1 AND problem_id = $2`, [collectionId, problemId]);
  },

  async listCollectionProblems(collectionId: string): Promise<CodingProblem[]> {
    const { rows } = await pool.query(
      `SELECT cp.* FROM coding_problems cp
       INNER JOIN collection_problems coll ON coll.problem_id = cp.id
       WHERE coll.collection_id = $1 AND cp.deleted_at IS NULL
       ORDER BY coll.order_index`,
      [collectionId],
    );
    return rows.map(mapProblem);
  },

  // ─── Assessments ────────────────────────────────────────────
  async createAssessment(data: {
    recruiter_id: string;
    title: string;
    description?: string;
    passing_score?: number;
    time_limit_minutes?: number;
    max_attempts?: number;
    assessment_timing?: string;
    allow_resume?: boolean;
    job_id?: string;
  }): Promise<CodingAssessment> {
    const { rows } = await pool.query(
      `INSERT INTO coding_assessments (recruiter_id, title, description, passing_score, time_limit_minutes, max_attempts, assessment_timing, allow_resume, job_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        data.recruiter_id, data.title, data.description || null,
        data.passing_score ?? 70, data.time_limit_minutes ?? null,
        data.max_attempts ?? 1, data.assessment_timing ?? 'post_apply',
        data.allow_resume ?? true, data.job_id || null,
      ],
    );
    return rows[0] as CodingAssessment;
  },

  async findAssessmentById(id: string): Promise<CodingAssessment | null> {
    const { rows } = await pool.query(`SELECT * FROM coding_assessments WHERE id = $1`, [id]);
    return rows[0] ? (rows[0] as CodingAssessment) : null;
  },

  async listAssessments(recruiterId: string): Promise<CodingAssessment[]> {
    const { rows } = await pool.query(
      `SELECT * FROM coding_assessments WHERE recruiter_id = $1 ORDER BY updated_at DESC`,
      [recruiterId],
    );
    return rows as CodingAssessment[];
  },

  async updateAssessment(id: string, data: Partial<CodingAssessment>): Promise<CodingAssessment | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of ['title', 'description', 'passing_score', 'time_limit_minutes', 'max_attempts', 'assessment_timing', 'allow_resume', 'job_id', 'status'] as const) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }
    if (!fields.length) return this.findAssessmentById(id);
    fields.push('updated_at = NOW()');
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE coding_assessments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return rows[0] ? (rows[0] as CodingAssessment) : null;
  },

  async attachProblemToAssessment(assessmentId: string, problemId: string, orderIndex: number, points = 100): Promise<void> {
    await pool.query(
      `INSERT INTO assessment_problems (assessment_id, problem_id, order_index, points) VALUES ($1,$2,$3,$4)
       ON CONFLICT (assessment_id, problem_id) DO UPDATE SET order_index = $3, points = $4`,
      [assessmentId, problemId, orderIndex, points],
    );
  },

  async detachProblemFromAssessment(assessmentId: string, problemId: string): Promise<void> {
    await pool.query(`DELETE FROM assessment_problems WHERE assessment_id = $1 AND problem_id = $2`, [assessmentId, problemId]);
  },

  async listAssessmentProblems(assessmentId: string): Promise<CodingProblem[]> {
    const { rows } = await pool.query(
      `SELECT cp.* FROM coding_problems cp
       INNER JOIN assessment_problems ap ON ap.problem_id = cp.id
       WHERE ap.assessment_id = $1 AND cp.deleted_at IS NULL
       ORDER BY ap.order_index`,
      [assessmentId],
    );
    return rows.map(mapProblem);
  },

  // ─── Assessment Versions ────────────────────────────────────
  async createAssessmentVersion(data: {
    assessment_id: string;
    version_number: number;
    title: string;
    description: string | null;
    passing_score: number;
    time_limit_minutes: number | null;
    max_attempts: number;
    assessment_timing: string;
    allow_resume: boolean;
    job_id: string | null;
    job_snapshot: Record<string, unknown> | null;
    published_by: string;
    snapshot_hash: string;
  }): Promise<AssessmentVersion> {
    const { rows } = await pool.query(
      `INSERT INTO assessment_versions
        (assessment_id, version_number, title, description, passing_score, time_limit_minutes, max_attempts, assessment_timing, allow_resume, job_id, job_snapshot, published_by, snapshot_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        data.assessment_id, data.version_number, data.title, data.description,
        data.passing_score, data.time_limit_minutes, data.max_attempts,
        data.assessment_timing, data.allow_resume, data.job_id,
        data.job_snapshot ? JSON.stringify(data.job_snapshot) : null,
        data.published_by, data.snapshot_hash,
      ],
    );
    return rows[0] as AssessmentVersion;
  },

  async createAssessmentVersionProblem(data: {
    assessment_version_id: string;
    problem_version_id: string;
    order_index: number;
    points: number;
    problem_snapshot: Record<string, unknown>;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO assessment_version_problems (assessment_version_id, problem_version_id, order_index, points, problem_snapshot)
       VALUES ($1,$2,$3,$4,$5)`,
      [data.assessment_version_id, data.problem_version_id, data.order_index, data.points, JSON.stringify(data.problem_snapshot)],
    );
  },

  async findAssessmentVersionById(id: string): Promise<AssessmentVersion | null> {
    const { rows } = await pool.query(`SELECT * FROM assessment_versions WHERE id = $1`, [id]);
    return rows[0] ? (rows[0] as AssessmentVersion) : null;
  },

  async listAssessmentVersions(assessmentId: string): Promise<AssessmentVersion[]> {
    const { rows } = await pool.query(
      `SELECT * FROM assessment_versions WHERE assessment_id = $1 ORDER BY version_number DESC`,
      [assessmentId],
    );
    return rows as AssessmentVersion[];
  },

  async listAssessmentVersionProblems(versionId: string): Promise<AssessmentVersionProblem[]> {
    const { rows } = await pool.query(
      `SELECT * FROM assessment_version_problems WHERE assessment_version_id = $1 ORDER BY order_index`,
      [versionId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      assessment_version_id: String(r.assessment_version_id),
      problem_version_id: String(r.problem_version_id),
      order_index: Number(r.order_index),
      points: Number(r.points),
      problem_snapshot: parseJson(r.problem_snapshot, {}),
    }));
  },

  async setJobAssessmentVersion(jobId: string, assessmentId: string, versionId: string): Promise<void> {
    await pool.query(
      `UPDATE jobs SET coding_assessment_id = $1, active_assessment_version_id = $2 WHERE id = $3`,
      [assessmentId, versionId, jobId],
    );
  },

  // ─── Sessions ───────────────────────────────────────────────
  async createAssessmentSession(data: {
    assessment_version_id: string;
    user_id: string;
    application_id?: string;
    expires_at?: Date;
    remaining_time_seconds?: number;
    attempt_number: number;
  }): Promise<AssessmentSession> {
    const { rows } = await pool.query(
      `INSERT INTO assessment_sessions
        (assessment_version_id, user_id, application_id, expires_at, remaining_time_seconds, attempt_number, status, last_heartbeat_at)
       VALUES ($1,$2,$3,$4,$5,$6,'active',NOW()) RETURNING *`,
      [data.assessment_version_id, data.user_id, data.application_id || null, data.expires_at || null, data.remaining_time_seconds ?? null, data.attempt_number],
    );
    return rows[0] as AssessmentSession;
  },

  async findSessionById(id: string): Promise<AssessmentSession | null> {
    const { rows } = await pool.query(`SELECT * FROM assessment_sessions WHERE id = $1`, [id]);
    return rows[0] ? (rows[0] as AssessmentSession) : null;
  },

  async updateSession(id: string, data: Partial<AssessmentSession>): Promise<AssessmentSession | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of ['status', 'remaining_time_seconds', 'last_heartbeat_at', 'current_problem_index', 'completed_at'] as const) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }
    if (!fields.length) return this.findSessionById(id);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE assessment_sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return rows[0] ? (rows[0] as AssessmentSession) : null;
  },

  async countCompletedSessions(userId: string, versionId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM assessment_sessions
       WHERE user_id = $1 AND assessment_version_id = $2 AND status IN ('submitted','completed')`,
      [userId, versionId],
    );
    return parseInt(rows[0].count, 10);
  },

  async findActiveSession(userId: string, versionId: string): Promise<AssessmentSession | null> {
    const { rows } = await pool.query(
      `SELECT * FROM assessment_sessions
       WHERE user_id = $1 AND assessment_version_id = $2 AND status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
      [userId, versionId],
    );
    return rows[0] ? (rows[0] as AssessmentSession) : null;
  },

  /** Mark session completed only after candidate submitted all problems and each has a completed evaluation. */
  async tryFinalizeAssessmentSession(sessionId: string): Promise<AssessmentSession | null> {
    const session = await this.findSessionById(sessionId);
    if (!session || session.status !== 'submitted') return null;

    const versionProblems = await this.listAssessmentVersionProblems(session.assessment_version_id);
    if (versionProblems.length === 0) return null;

    const required = new Set(versionProblems.map((p) => p.problem_version_id));
    const { rows } = await pool.query(
      `SELECT DISTINCT problem_version_id FROM coding_submissions
       WHERE assessment_session_id = $1 AND status = 'completed'`,
      [sessionId],
    );
    const evaluated = new Set(rows.map((r) => String(r.problem_version_id)));
    for (const problemVersionId of required) {
      if (!evaluated.has(problemVersionId)) return null;
    }

    return this.updateSession(sessionId, {
      status: 'completed',
      completed_at: new Date() as AssessmentSession['completed_at'],
    });
  },

  // ─── Practice Sessions ──────────────────────────────────────
  async createPracticeSession(userId: string, problemVersionId: string): Promise<PracticeSession> {
    const { rows } = await pool.query(
      `INSERT INTO practice_sessions (user_id, problem_version_id) VALUES ($1,$2) RETURNING *`,
      [userId, problemVersionId],
    );
    return rows[0] as PracticeSession;
  },

  async findPracticeSessionById(id: string): Promise<PracticeSession | null> {
    const { rows } = await pool.query(`SELECT * FROM practice_sessions WHERE id = $1`, [id]);
    return rows[0] ? (rows[0] as PracticeSession) : null;
  },

  async listPracticeSessions(userId: string): Promise<PracticeSession[]> {
    const { rows } = await pool.query(
      `SELECT * FROM practice_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 50`,
      [userId],
    );
    return rows as PracticeSession[];
  },

  async updatePracticeSession(id: string, data: Partial<PracticeSession>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of ['completed_at', 'best_score', 'attempts_count', 'solved'] as const) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }
    if (!fields.length) return;
    values.push(id);
    await pool.query(`UPDATE practice_sessions SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  },

  // ─── Submissions ────────────────────────────────────────────
  async createSubmission(data: {
    user_id: string;
    problem_version_id: string;
    language: string;
    source_code: string;
    assessment_session_id?: string;
    practice_session_id?: string;
    assessment_version_id?: string;
    application_id?: string;
    attempt_number: number;
    assessment_snapshot?: Record<string, unknown>;
    problem_snapshot?: Record<string, unknown>;
    job_snapshot?: Record<string, unknown>;
  }): Promise<CodingSubmission> {
    const { rows } = await pool.query(
      `INSERT INTO coding_submissions
        (user_id, problem_version_id, language, source_code, assessment_session_id, practice_session_id, assessment_version_id, application_id, attempt_number, assessment_snapshot, problem_snapshot, job_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        data.user_id, data.problem_version_id, data.language, data.source_code,
        data.assessment_session_id || null, data.practice_session_id || null,
        data.assessment_version_id || null, data.application_id || null,
        data.attempt_number,
        data.assessment_snapshot ? JSON.stringify(data.assessment_snapshot) : null,
        data.problem_snapshot ? JSON.stringify(data.problem_snapshot) : null,
        data.job_snapshot ? JSON.stringify(data.job_snapshot) : null,
      ],
    );
    return mapSubmission(rows[0]);
  },

  async findSubmissionById(id: string): Promise<CodingSubmission | null> {
    const { rows } = await pool.query(`SELECT * FROM coding_submissions WHERE id = $1`, [id]);
    return rows[0] ? mapSubmission(rows[0]) : null;
  },

  async updateSubmission(id: string, data: Partial<CodingSubmission>): Promise<CodingSubmission | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of ['status', 'test_pass_count', 'test_total_count', 'score', 'passed', 'execution_time_ms', 'memory_kb', 'judge0_tokens'] as const) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }
    if (!fields.length) return this.findSubmissionById(id);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE coding_submissions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return rows[0] ? mapSubmission(rows[0]) : null;
  },

  async listSubmissions(userId: string, page = 1, limit = 20): Promise<{ items: CodingSubmission[]; total: number }> {
    const offset = (page - 1) * limit;
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM coding_submissions WHERE user_id = $1`,
      [userId],
    );
    const { rows } = await pool.query(
      `SELECT * FROM coding_submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return { items: rows.map(mapSubmission), total: parseInt(countRows[0].count, 10) };
  },

  async listSubmissionsByVersion(versionId: string): Promise<CodingSubmission[]> {
    const { rows } = await pool.query(
      `SELECT * FROM coding_submissions WHERE assessment_version_id = $1 ORDER BY created_at DESC`,
      [versionId],
    );
    return rows.map(mapSubmission);
  },

  async getNextAttemptNumber(userId: string, problemVersionId: string, sessionId?: string): Promise<number> {
    const query = sessionId
      ? `SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next FROM coding_submissions WHERE user_id = $1 AND problem_version_id = $2 AND assessment_session_id = $3`
      : `SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next FROM coding_submissions WHERE user_id = $1 AND problem_version_id = $2 AND practice_session_id IS NOT NULL`;
    const params = sessionId ? [userId, problemVersionId, sessionId] : [userId, problemVersionId];
    const { rows } = await pool.query(query, params);
    return parseInt(rows[0].next, 10);
  },

  async createTestResult(data: Omit<SubmissionTestResult, 'id'>): Promise<void> {
    await pool.query(
      `INSERT INTO submission_test_results (submission_id, test_case_id, passed, actual_output, stderr, time_sec, memory_kb, status_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [data.submission_id, data.test_case_id, data.passed, data.actual_output, data.stderr, data.time_sec, data.memory_kb, data.status_id],
    );
  },

  async listTestResults(submissionId: string): Promise<SubmissionTestResult[]> {
    const { rows } = await pool.query(
      `SELECT str.*, pvtc.is_hidden
       FROM submission_test_results str
       LEFT JOIN problem_version_test_cases pvtc ON pvtc.id = str.test_case_id
       WHERE str.submission_id = $1`,
      [submissionId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      submission_id: String(r.submission_id),
      test_case_id: String(r.test_case_id),
      passed: Boolean(r.passed),
      actual_output: r.actual_output ? String(r.actual_output) : null,
      stderr: r.stderr ? String(r.stderr) : null,
      time_sec: r.time_sec !== null ? Number(r.time_sec) : null,
      memory_kb: r.memory_kb !== null ? Number(r.memory_kb) : null,
      status_id: r.status_id !== null ? Number(r.status_id) : null,
      is_hidden: Boolean(r.is_hidden),
    }));
  },

  // ─── Code Evaluations ───────────────────────────────────────
  async createCodeEvaluation(data: {
    submission_id: string;
    readability_score?: number;
    maintainability_score?: number;
    efficiency_score?: number;
    best_practices_score?: number;
    optimization_score?: number;
    overall_quality_score?: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    raw_response?: Record<string, unknown>;
  }): Promise<CodeEvaluation> {
    const { rows } = await pool.query(
      `INSERT INTO code_evaluations
        (submission_id, readability_score, maintainability_score, efficiency_score, best_practices_score, optimization_score, overall_quality_score, strengths, weaknesses, suggestions, raw_response)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        data.submission_id, data.readability_score ?? null, data.maintainability_score ?? null,
        data.efficiency_score ?? null, data.best_practices_score ?? null, data.optimization_score ?? null,
        data.overall_quality_score ?? null,
        JSON.stringify(data.strengths), JSON.stringify(data.weaknesses), JSON.stringify(data.suggestions),
        data.raw_response ? JSON.stringify(data.raw_response) : null,
      ],
    );
    const r = rows[0];
    return {
      id: String(r.id),
      submission_id: String(r.submission_id),
      readability_score: r.readability_score !== null ? Number(r.readability_score) : null,
      maintainability_score: r.maintainability_score !== null ? Number(r.maintainability_score) : null,
      efficiency_score: r.efficiency_score !== null ? Number(r.efficiency_score) : null,
      best_practices_score: r.best_practices_score !== null ? Number(r.best_practices_score) : null,
      optimization_score: r.optimization_score !== null ? Number(r.optimization_score) : null,
      overall_quality_score: r.overall_quality_score !== null ? Number(r.overall_quality_score) : null,
      strengths: parseJson(r.strengths, []),
      weaknesses: parseJson(r.weaknesses, []),
      suggestions: parseJson(r.suggestions, []),
      created_at: new Date(String(r.created_at)),
    };
  },

  async findEvaluationBySubmission(submissionId: string): Promise<CodeEvaluation | null> {
    const { rows } = await pool.query(`SELECT * FROM code_evaluations WHERE submission_id = $1`, [submissionId]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: String(r.id),
      submission_id: String(r.submission_id),
      readability_score: r.readability_score !== null ? Number(r.readability_score) : null,
      maintainability_score: r.maintainability_score !== null ? Number(r.maintainability_score) : null,
      efficiency_score: r.efficiency_score !== null ? Number(r.efficiency_score) : null,
      best_practices_score: r.best_practices_score !== null ? Number(r.best_practices_score) : null,
      optimization_score: r.optimization_score !== null ? Number(r.optimization_score) : null,
      overall_quality_score: r.overall_quality_score !== null ? Number(r.overall_quality_score) : null,
      strengths: parseJson(r.strengths, []),
      weaknesses: parseJson(r.weaknesses, []),
      suggestions: parseJson(r.suggestions, []),
      created_at: new Date(String(r.created_at)),
    };
  },

  // ─── Execution Logs ─────────────────────────────────────────
  async createExecutionLog(data: Omit<ExecutionLog, 'id' | 'created_at'>): Promise<ExecutionLog> {
    const { rows } = await pool.query(
      `INSERT INTO execution_logs
        (user_id, problem_version_id, assessment_session_id, practice_session_id, language, source_code, stdin, stdout, stderr, compile_output, execution_time_ms, memory_kb, status, judge0_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        data.user_id, data.problem_version_id, data.assessment_session_id, data.practice_session_id,
        data.language, data.source_code, data.stdin, data.stdout, data.stderr, data.compile_output,
        data.execution_time_ms, data.memory_kb, data.status, data.judge0_token,
      ],
    );
    return rows[0] as ExecutionLog;
  },

  async listExecutionLogs(userId: string, limit = 50): Promise<ExecutionLog[]> {
    const { rows } = await pool.query(
      `SELECT * FROM execution_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit],
    );
    return rows as ExecutionLog[];
  },

  async pruneExecutionLogs(userId: string, keepCount: number): Promise<void> {
    await pool.query(
      `DELETE FROM execution_logs WHERE user_id = $1 AND id NOT IN (
         SELECT id FROM execution_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
       )`,
      [userId, keepCount],
    );
  },

  async getPracticeProgress(userId: string): Promise<{ solved: number; totalAttempts: number; byDifficulty: Record<string, number> }> {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE solved = true) AS solved,
              COALESCE(SUM(attempts_count), 0) AS total_attempts
       FROM practice_sessions WHERE user_id = $1`,
      [userId],
    );
    const { rows: diffRows } = await pool.query(
      `SELECT pv.difficulty, COUNT(*) AS cnt
       FROM practice_sessions ps
       INNER JOIN problem_versions pv ON pv.id = ps.problem_version_id
       WHERE ps.user_id = $1 AND ps.solved = true
       GROUP BY pv.difficulty`,
      [userId],
    );
    const byDifficulty: Record<string, number> = {};
    for (const r of diffRows) byDifficulty[String(r.difficulty)] = parseInt(r.cnt, 10);
    return {
      solved: parseInt(rows[0].solved, 10),
      totalAttempts: parseInt(rows[0].total_attempts, 10),
      byDifficulty,
    };
  },

  async listSubmissionsBySession(sessionId: string): Promise<CodingSubmission[]> {
    const { rows } = await pool.query(
      `SELECT id, user_id, problem_version_id, assessment_session_id, practice_session_id,
              assessment_version_id, application_id, attempt_number, language,
              status, test_pass_count, test_total_count, score, passed,
              execution_time_ms, memory_kb, assessment_snapshot, problem_snapshot,
              job_snapshot, judge0_tokens, created_at
       FROM coding_submissions
       WHERE assessment_session_id = $1
       ORDER BY created_at`,
      [sessionId],
    );
    return rows.map(mapSubmission);
  },

  async listSessionsForVersionWithUser(versionId: string): Promise<{
    id: string;
    user_id: string;
    assessment_version_id: string;
    status: string;
    score: number | null;
    attempt_number: number;
    started_at: Date;
    completed_at: Date | null;
    email: string;
    name: string | null;
  }[]> {
    const { rows } = await pool.query(
      `SELECT s.id, s.user_id, s.assessment_version_id, s.status, s.score,
              s.attempt_number, s.started_at, s.completed_at,
              u.email, ap.name
       FROM assessment_sessions s
       INNER JOIN users u ON u.id = s.user_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = s.user_id
       WHERE s.assessment_version_id = $1
       ORDER BY s.started_at DESC`,
      [versionId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      user_id: String(r.user_id),
      assessment_version_id: String(r.assessment_version_id),
      status: String(r.status),
      score: r.score !== null ? Number(r.score) : null,
      attempt_number: Number(r.attempt_number),
      started_at: new Date(r.started_at),
      completed_at: r.completed_at ? new Date(r.completed_at) : null,
      email: String(r.email),
      name: r.name ? String(r.name) : null,
    }));
  },
};
