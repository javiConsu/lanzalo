const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
});

const MIGRATE_SECRET = process.env.MIGRATE_SECRET || 'lanzalo-migrate-2026';

// Schema base SQL (inline para no depender del filesystem)
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  tagline VARCHAR(500),
  description TEXT,
  industry VARCHAR(100),
  subdomain VARCHAR(100) UNIQUE,
  status VARCHAR(50) DEFAULT 'planning',
  revenue_total DECIMAL(10,2) DEFAULT 0,
  revenue_share_rate DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  output TEXT,
  scheduled_for TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  type VARCHAR(50),
  framework VARCHAR(50),
  status VARCHAR(50) DEFAULT 'deploying',
  deploy_log TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255),
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  sent_at TIMESTAMP,
  replied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft',
  scheduled_for TIMESTAMP,
  posted_at TIMESTAMP,
  tweet_id VARCHAR(100),
  engagement_likes INT DEFAULT 0,
  engagement_retweets INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_deployments_company ON deployments(company_id);
CREATE INDEX IF NOT EXISTS idx_emails_company ON emails(company_id);
CREATE INDEX IF NOT EXISTS idx_tweets_company ON tweets(company_id);
CREATE INDEX IF NOT EXISTS idx_analytics_company ON analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_company ON activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
`;

async function handleMigrate(req, res) {
  const secret = req.body?.secret || req.query?.secret;
  if (secret !== MIGRATE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = await pool.connect();
  const results = [];

  try {
    // Create tracking table
    await client.query(`CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, executed_at TIMESTAMP DEFAULT NOW())`);

    // Run schema (000)
    const { rows: r0 } = await client.query("SELECT name FROM _migrations WHERE name = '000_schema'");
    if (r0.length === 0) {
      try {
        await client.query('BEGIN');
        await client.query(SCHEMA_SQL);
        await client.query("INSERT INTO _migrations (name) VALUES ('000_schema')");
        await client.query('COMMIT');
        results.push({ migration: '000_schema', status: 'success' });
      } catch(e) {
        await client.query('ROLLBACK');
        results.push({ migration: '000_schema', status: 'error: ' + e.message.split('\n')[0] });
      }
    } else {
      results.push({ migration: '000_schema', status: 'skipped (already applied)' });
    }

    // Run remaining migrations from filesystem
    const { runMigrations } = require('../migrate');
    const migrResults = await runMigrations();
    results.push(...migrResults);

    const errors = results.filter(r => r.status.startsWith('error'));
    res.json({ success: errors.length === 0, results, errors });
  } catch(err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

router.post('/', handleMigrate);
router.get('/', handleMigrate);

module.exports = router;
