import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import pool from '../config/database';

async function applyMigration() {
  const sqlPath = path.resolve(__dirname, '../config/migrations/009_add_proctoring_to_interviews.sql');
  console.log(`Reading migration from: ${sqlPath}`);
  
  try {
    const sql = await fs.readFile(sqlPath, 'utf8');
    const client = await pool.connect();
    
    try {
      console.log('Applying proctoring violations columns migration...');
      await client.query(sql);
      console.log('✅ Migration applied successfully.');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('❌ Failed to apply migration:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
