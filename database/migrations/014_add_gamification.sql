-- Migration 014: Gamificación — XP y niveles de negocio

-- Añadir XP y nivel a companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS level_name VARCHAR(50) DEFAULT 'Idea';

-- Tabla de logros (achievements)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  achievement_key VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(10) DEFAULT '🏆',
  xp_reward INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_achievements_company ON achievements(company_id);

-- Tabla de historial XP
CREATE TABLE IF NOT EXISTS xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  source VARCHAR(100) NOT NULL, -- 'task_completed', 'first_deploy', etc.
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_history_company ON xp_history(company_id);
