-- Migration 009: Daily Syncs
-- Description: Team daily standup reports with autonomous decisions

CREATE TABLE IF NOT EXISTS daily_syncs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  sync_date DATE NOT NULL,
  summary TEXT NOT NULL,
  wins TEXT, -- JSON array
  issues TEXT, -- JSON array
  trends TEXT, -- JSON object
  decisions TEXT, -- JSON array
  recommendations TEXT, -- JSON array
  agent_reports TEXT, -- JSON array (detailed reports from each agent)
  metrics_snapshot TEXT, -- JSON object (business metrics at sync time)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE(company_id, sync_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_syncs_company ON daily_syncs(company_id);
CREATE INDEX IF NOT EXISTS idx_daily_syncs_date ON daily_syncs(sync_date);

-- Add field to track if company has daily syncs enabled
ALTER TABLE companies ADD COLUMN daily_sync_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN daily_sync_time TEXT DEFAULT '09:00'; -- HH:MM format
ALTER TABLE companies ADD COLUMN last_sync_at TIMESTAMP;
