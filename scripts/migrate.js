/**
 * Database migration runner
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration(filename) {
  const filepath = path.join(__dirname, '..', 'database', 'migrations', filename);
  
  console.log(`Running migration: ${filename}`);
  
  const sql = fs.readFileSync(filepath, 'utf8');
  
  try {
    await pool.query(sql);
    console.log(`✅ ${filename} applied successfully`);
  } catch (error) {
    console.error(`❌ ${filename} failed:`, error.message);
    throw error;
  }
}

async function main() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Usage: node migrate.js <migration_file>');
    console.error('Example: node migrate.js 009_add_daily_syncs.sql');
    process.exit(1);
  }
  
  try {
    await runMigration(migrationFile);
    console.log('Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
