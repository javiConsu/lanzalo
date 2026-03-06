const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
});

const migrations = [
  '001_add_quotas.sql',
  '002_add_auth.sql',
  '003_add_settings.sql',
  '004_add_tasks_system.sql',
  '005_add_reports.sql',
  '006_add_memory.sql',
  '007_add_tweets_emails.sql',
  '008_add_discovered_ideas.sql',
  '009_add_daily_syncs.sql',
  '010_add_onboarding_fields.sql',
  '011_add_discovery_fields.sql'
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const results = [];
    for (const migration of migrations) {
      const { rows } = await client.query('SELECT name FROM _migrations WHERE name = $1', [migration]);
      if (rows.length > 0) {
        results.push({ migration, status: 'skipped (already applied)' });
        continue;
      }

      const filePath = path.join(__dirname, '..', 'database', 'migrations', migration);
      if (!fs.existsSync(filePath)) {
        results.push({ migration, status: 'skipped (file not found)' });
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration]);
        await client.query('COMMIT');
        results.push({ migration, status: 'success' });
      } catch (err) {
        await client.query('ROLLBACK');
        results.push({ migration, status: 'error: ' + err.message });
      }
    }
    return results;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
