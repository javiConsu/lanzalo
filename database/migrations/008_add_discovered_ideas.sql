-- Migración: Ideas descubiertas por Trend Scout Agent (PostgreSQL)

CREATE TABLE IF NOT EXISTS discovered_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  target_audience TEXT,

  evidence TEXT,
  source TEXT,
  source_url TEXT,

  category TEXT,
  difficulty TEXT,
  potential_revenue TEXT,

  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',

  metadata JSONB,

  discovered_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovered_ideas_score ON discovered_ideas(score);
CREATE INDEX IF NOT EXISTS idx_discovered_ideas_status ON discovered_ideas(status);
CREATE INDEX IF NOT EXISTS idx_discovered_ideas_category ON discovered_ideas(category);
