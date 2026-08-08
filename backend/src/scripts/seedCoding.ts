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

  const problems = [
    {
      title: 'Two Sum',
      slug: 'two-sum',
      description: 'Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution.',
      constraints: '- 2 <= nums.length <= 10^4\n- Each input has exactly one solution',
      hints: ['Use a hash map to store complements'],
      difficulty: 'easy',
      samples: [
        { input: '4\n2 7 11 15\n9', expected_output: '0 1', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' },
      ],
      hidden: [
        { input: '3\n3 2 4\n6', expected_output: '1 2' },
        { input: '2\n3 3\n6', expected_output: '0 1' },
      ],
    },
    {
      title: 'Reverse String',
      slug: 'reverse-string',
      description: 'Write a function that reverses a string. The input string is given as an array of characters s.',
      constraints: '- 1 <= s.length <= 10^5',
      hints: ['Use two pointers'],
      difficulty: 'easy',
      samples: [
        { input: 'hello', expected_output: 'olleh' },
      ],
      hidden: [
        { input: 'world', expected_output: 'dlrow' },
        { input: 'abc', expected_output: 'cba' },
      ],
    },
    {
      title: 'FizzBuzz',
      slug: 'fizzbuzz',
      description: 'Given an integer n, return a string array answer where:\n- answer[i] == "FizzBuzz" if i is divisible by 3 and 5\n- answer[i] == "Fizz" if i is divisible by 3\n- answer[i] == "Buzz" if i is divisible by 5\n- answer[i] == i (as a string) otherwise',
      constraints: '- 1 <= n <= 10^4',
      hints: ['Check divisibility in order: 15, 3, 5'],
      difficulty: 'easy',
      samples: [
        { input: '5', expected_output: '1\n2\nFizz\n4\nBuzz' },
      ],
      hidden: [
        { input: '3', expected_output: '1\n2\nFizz' },
        { input: '15', expected_output: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz' },
      ],
    },
  ];

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
