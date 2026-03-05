-- Migración: Ideas descubiertas por Trend Scout Agent

CREATE TABLE IF NOT EXISTS discovered_ideas (
  id TEXT PRIMARY KEY,
  
  -- Idea
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  target_audience TEXT,
  
  -- Validación
  evidence TEXT, -- Señales de demanda detectadas
  source TEXT, -- reddit, twitter, hackernews, producthunt, tiktok
  source_url TEXT,
  
  -- Clasificación
  category TEXT, -- saas, marketplace, tool, service
  difficulty TEXT, -- easy, medium, hard
  potential_revenue TEXT, -- "$X-Y/mes"
  score INTEGER, -- 0-100
  
  -- Metadata
  discovered_at TEXT DEFAULT (datetime('now')),
  is_active BOOLEAN DEFAULT 1,
  times_shown INTEGER DEFAULT 0,
  times_launched INTEGER DEFAULT 0 -- Cuántas veces usuarios la lanzaron
);

CREATE INDEX idx_ideas_score ON discovered_ideas(score DESC);
CREATE INDEX idx_ideas_active ON discovered_ideas(is_active);
CREATE INDEX idx_ideas_category ON discovered_ideas(category);
CREATE INDEX idx_ideas_difficulty ON discovered_ideas(difficulty);
CREATE INDEX idx_ideas_discovered ON discovered_ideas(discovered_at DESC);
