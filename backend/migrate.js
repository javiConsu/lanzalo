// v3 - schema applied inline in route, only run numbered migrations
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Solo las migraciones numeradas (schema base se aplica inline en la ruta)
const migrationFiles = [
  { name: '001_add_quotas.sql', file: path.join(__dirname, '..', 'database', 'migrations', '001_add_quotas.sql') },
  { name: '002_add_auth.sql', file: path.join(__dirname, '..', 'database', 'migrations', '002_add_auth.sql') },
  { name: '003_add_settings.sql', file: path.join(__dirname, '..', 'database', 'migrations', '003_add_settings.sql') },
  { name: '004_add_tasks_system.sql', file: path.join(__dirname, '..', 'database', 'migrations', '004_add_tasks_system.sql') },
  { name: '005_add_reports.sql', file: path.join(__dirname, '..', 'database', 'migrations', '005_add_reports.sql') },
  { name: '006_add_memory.sql', file: path.join(__dirname, '..', 'database', 'migrations', '006_add_memory.sql') },
  { name: '007_add_tweets_emails.sql', file: path.join(__dirname, '..', 'database', 'migrations', '007_add_tweets_emails.sql') },
  { name: '008_add_discovered_ideas.sql', file: path.join(__dirname, '..', 'database', 'migrations', '008_add_discovered_ideas.sql') },
  { name: '009_add_daily_syncs.sql', file: path.join(__dirname, '..', 'database', 'migrations', '009_add_daily_syncs.sql') },
  { name: '010_add_onboarding_fields.sql', file: path.join(__dirname, '..', 'database', 'migrations', '010_add_onboarding_fields.sql') },
  { name: '011_add_discovery_fields.sql', file: path.join(__dirname, '..', 'database', 'migrations', '011_add_discovery_fields.sql') },
  { name: '013_fix_missing_columns.sql', file: path.join(__dirname, '..', 'database', 'migrations', '013_fix_missing_columns.sql') },
  { name: '014_add_gamification.sql', file: path.join(__dirname, '..', 'database', 'migrations', '014_add_gamification.sql') },
  { name: '015_add_credits.sql', file: path.join(__dirname, '..', 'database', 'migrations', '015_add_credits.sql') },
  { name: '016_add_change_requests.sql', file: path.join(__dirname, '..', 'database', 'migrations', '016_add_change_requests.sql') },
  { name: '017_add_email_pro.sql', file: path.join(__dirname, '..', 'database', 'migrations', '017_add_email_pro.sql') },
  { name: '018_add_marketing_content.sql', file: path.join(__dirname, '..', 'database', 'migrations', '018_add_marketing_content.sql') },
  { name: '019_add_brand_config.sql', file: path.join(__dirname, '..', 'database', 'migrations', '019_add_brand_config.sql') },
  { name: '020_fix_tasks_columns.sql', file: path.join(__dirname, '..', 'database', 'migrations', '020_fix_tasks_columns.sql') },
  { name: '021_business_slots.sql', file: path.join(__dirname, '..', 'database', 'migrations', '021_business_slots.sql') },
  { name: '022_referral_system.sql', file: path.join(__dirname, '..', 'database', 'migrations', '022_referral_system.sql') },
  { name: '023_password_reset_tokens.sql', file: path.join(__dirname, '..', 'database', 'migrations', '023_password_reset_tokens.sql') },
  { name: '024_add_support_feedback.sql', file: path.join(__dirname, '..', 'database', 'migrations', '024_add_support_feedback.sql') },
  { name: '025_add_feedback_daily_reports.sql', file: path.join(__dirname, '..', 'database', 'migrations', '025_add_feedback_daily_reports.sql') },
  { name: '026_budgets_governance_heartbeat.sql', file: path.join(__dirname, '..', 'database', 'migrations', '026_budgets_governance_heartbeat.sql') },
  { name: '027_add_password_reset_tokens_v1.sql', file: path.join(__dirname, '..', 'database', 'migrations', '027_add_password_reset_tokens_v1.sql') },
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const results = [];
    for (const { name, file } of migrationFiles) {
      const { rows } = await client.query('SELECT name FROM _migrations WHERE name = $1', [name]);
      if (rows.length > 0) {
        results.push({ migration: name, status: 'skipped (already applied)' });
        continue;
      }

      if (!fs.existsSync(file)) {
        results.push({ migration: name, status: 'skipped (file not found: ' + file + ')' });
        continue;
      }

      const sql = fs.readFileSync(file, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        results.push({ migration: name, status: 'success' });
      } catch (err) {
        await client.query('ROLLBACK');
        results.push({ migration: name, status: 'error: ' + err.message.split('\n')[0] });
      }
    }
    return results;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
