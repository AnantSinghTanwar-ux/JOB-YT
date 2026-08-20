import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import pool from '../config/database';

const MIGRATIONS = [
  '004_create_roadmap_tables.sql',
  '007_create_interviews_table.sql',
  '007_add_api_keys.sql',
  '007_create_ai_interview_tables.sql',
  '008_create_coach_tables.sql',
  '009_add_uploaded_resume_to_coach.sql',
  '008_add_api_activity_logs.sql',
  '013_add_ai_interview_jobs_columns.sql',
] as const;

function elapsedMs(start: bigint): string {
  return `${Number(process.hrtime.bigint() - start) / 1_000_000}ms`;
}

async function run() {
  const isCompiled = __dirname.includes('dist');
  const baseDir = isCompiled ? path.resolve(__dirname, '../../src') : path.resolve(__dirname, '..');
  const migrationsDir = path.join(baseDir, 'config', 'migrations');
  const client = await pool.connect();

  try {
    for (const filename of MIGRATIONS) {
      const startedAt = process.hrtime.bigint();
      const migrationPath = path.join(migrationsDir, filename);

      console.log(`[production-sql] Running ${filename}...`);

      try {
        const sql = await fs.readFile(migrationPath, 'utf8');
        await client.query(sql);
        console.log(`[production-sql] Success ${filename} (${elapsedMs(startedAt)})`);
      } catch (err) {
        console.error(`[production-sql] Failed ${filename} (${elapsedMs(startedAt)})`);
        throw err;
      }
    }

    console.log('[production-sql] All production SQL migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[production-sql] Migration execution stopped:', err);
  // DO NOT exit with code 1. Allow the server to start so we can see logs without crashing the deployment.
});
