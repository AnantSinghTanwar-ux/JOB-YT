import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import pool from '../config/database';

async function run() {
  const migrationPath = path.resolve(__dirname, '..', 'config', 'migrations', '007_add_coding_assessment_module.sql');
  console.log(`Reading migration from ${migrationPath}...`);
  const sql = await fs.readFile(migrationPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Running coding assessment migration...');
    await client.query(sql);
    console.log('Coding assessment migration applied successfully.');
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
