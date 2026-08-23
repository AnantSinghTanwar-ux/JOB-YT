import 'dotenv/config';
import pool from '../config/database';
import { CodingModel } from '../models/coding.model';
import { hashSnapshot } from '../models/coding.model';

const STARTER_CODE = {
  python: 'def solve():\n    # Write your code here\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
  javascript: 'function solve() {\n  // Write your code here\n}\n\nsolve();\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your code here\n    }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
};

async function seed() {
  const { rows: recruiters } = await pool.query(
    `SELECT id FROM users WHERE role = 'recruiter' LIMIT 1`,
  );
  const recruiterId = recruiters[0]?.id;
  if (!recruiterId) {
    console.log('No recruiter found — skipping coding seed');
    await pool.end();
    return;
  }

  const problems = require('./data/problems.json');

  for (const p of problems) {
    const existing = await pool.query(
      `SELECT id FROM coding_problems WHERE slug = $1 AND created_by = $2`,
      [p.slug, recruiterId],
    );
    if (existing.rows.length) {
      console.log(`Skipping existing problem: ${p.slug}`);
      continue;
    }

    const problem = await CodingModel.createProblem({
      created_by: recruiterId,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty as 'easy',
      description: p.description,
      constraints: p.constraints,
      hints: p.hints,
      starter_code: STARTER_CODE,
      tags: ['arrays', 'strings'],
    });

    let idx = 0;
    for (const s of p.samples) {
      await CodingModel.createTestCase({
        problem_id: problem.id,
        input: s.input,
        expected_output: s.expected_output,
        is_hidden: false,
        is_sample: true,
        weight: 1,
        order_index: idx++,
        explanation: (s as { explanation?: string }).explanation || null,
      });
    }
    for (const h of p.hidden) {
      await CodingModel.createTestCase({
        problem_id: problem.id,
        input: h.input,
        expected_output: h.expected_output,
        is_hidden: true,
        is_sample: false,
        weight: 1,
        order_index: idx++,
        explanation: null,
      });
    }

    const testCases = await CodingModel.listTestCases(problem.id);
    const version = await CodingModel.createProblemVersion({
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
      published_by: recruiterId,
      snapshot_hash: hashSnapshot({ ...problem, test_cases: testCases }),
    });
    await CodingModel.copyTestCasesToVersion(version.id, testCases);
    await CodingModel.updateProblem(problem.id, { status: 'published', current_version_number: 1 } as never);

    console.log(`Seeded problem: ${p.title} (${version.id})`);
  }

  console.log('Coding seed complete');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
