import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

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

function getMigrationsDir(): string {
  const isCompiled = __dirname.includes('dist');
  const baseDir = isCompiled ? path.resolve(__dirname, '../../src') : path.resolve(__dirname, '..');
  return path.join(baseDir, 'config', 'migrations');
}

/**
 * Apply all supplementary SQL migrations against the given pool.
 * Every migration uses IF NOT EXISTS / IF NOT EXISTS guards, so re-running is safe.
 * Errors on individual files are logged but do NOT throw — the server keeps running.
 */
export async function applyProductionSqlMigrations(dbPool: Pool): Promise<void> {
  const migrationsDir = getMigrationsDir();
  let client;

  try {
    client = await dbPool.connect();
  } catch (err) {
    console.error('[production-sql] Could not connect to database:', err instanceof Error ? err.message : err);
    return; // non-fatal
  }

  try {
    for (const filename of MIGRATIONS) {
      const startedAt = process.hrtime.bigint();
      const migrationPath = path.join(migrationsDir, filename);

      try {
        const sql = await fs.readFile(migrationPath, 'utf8');
        await client.query(sql);
        console.log(`[production-sql] ✓ ${filename} (${elapsedMs(startedAt)})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Log but continue — don't let one migration block the rest
        console.error(`[production-sql] ✗ ${filename} (${elapsedMs(startedAt)}): ${msg}`);
      }
    }

    console.log('[production-sql] Finished applying production SQL migrations.');
  } finally {
    client.release();
  }
}

// ── Standalone CLI mode ─────────────────────────────────────────────────────
// When run directly via `ts-node` or `node`, execute against the default pool.
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv/config');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const defaultPool: Pool = require('../config/database').default;

  applyProductionSqlMigrations(defaultPool)
    .then(() => defaultPool.end())
    .catch((err) => {
      console.error('[production-sql] Migration execution stopped:', err);
      defaultPool.end();
    });
}
