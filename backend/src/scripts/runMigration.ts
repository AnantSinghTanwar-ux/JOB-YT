import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function main() {
  try {
    const sqlPath = path.join(__dirname, 'add_external_url_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration: add_external_url_column.sql');
    await pool.query(sql);
    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    pool.end();
  }
}

main();
