import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import pool from '../config/database';

async function run() {
  const migrationPath = path.resolve(__dirname, '..', 'config', 'migrations', '008_create_coach_tables.sql');
  console.log(`Reading migration from ${migrationPath}...`);
  const sql = await fs.readFile(migrationPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Running migration 008 SQL commands...');
    await client.query(sql);
    console.log('Migration 008 applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
