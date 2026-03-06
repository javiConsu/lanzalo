-- Migration 009: Daily Syncs (PostgreSQL)
-- Description: Team daily standup reports with autonomous decisions

CREATE TABLE IF NOT EXISTS daily_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sync_date DATE NOT NULL,
  summary TEXT NOT NULL,
  wins JSONB,
  issues JSONB,
  trends JSONB,
  decisions JSONB,
  recommendations JSONB,
  agent_reports JSONB,
  metrics_snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, sync_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_syncs_company ON daily_syncs(company_id);
CREATE INDEX IF NOT EXISTS idx_daily_syncs_date ON daily_syncs(sync_date);
