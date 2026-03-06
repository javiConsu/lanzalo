-- Schema SQLite para desarrollo local

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  role TEXT DEFAULT 'user',
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  email_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (NOW()),
  updated_at TEXT DEFAULT (NOW())
);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  industry TEXT,
  subdomain TEXT UNIQUE,
  status TEXT DEFAULT 'planning',
  revenue_total REAL DEFAULT 0,
  revenue_share_rate REAL DEFAULT 0.05,
  created_at TEXT DEFAULT (NOW()),
  updated_at TEXT DEFAULT (NOW())
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  output TEXT,
  scheduled_for TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (NOW())
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT DEFAULT (NOW())
);

-- LLM Usage
CREATE TABLE IF NOT EXISTS llm_usage (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  estimated_cost REAL,
  recorded_at TEXT DEFAULT (NOW())
);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  quota_type TEXT NOT NULL,
  period TEXT NOT NULL,
  amount INTEGER DEFAULT 0,
  recorded_at TEXT DEFAULT (NOW()),
  UNIQUE(company_id, quota_type, period)
);

-- Crear admin inicial
INSERT OR IGNORE INTO users (id, email, password_hash, name, role, plan, email_verified)
VALUES (
  'admin-001',
  'admin@lanzalo.local',
  '$2b$10$rBV2KKH.4VZDCd6FVOFZPu.CJdTRYPPVdKU8RJqkO9YqPLXxEYYWe', -- admin123
  'Admin',
  'admin',
  'pro',
  1
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_company ON activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_company ON llm_usage(company_id);
