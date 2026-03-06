-- Migración: Sistema de Settings para Admin (PostgreSQL)

-- Tabla de configuración global (admin)
CREATE TABLE IF NOT EXISTS platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  openrouter_api_key TEXT,
  default_model TEXT DEFAULT 'anthropic/claude-sonnet-4',
  model_strategy TEXT,
  cost_alert_threshold REAL DEFAULT 100.0,
  max_daily_cost REAL DEFAULT 500.0,
  auto_pause_expensive_companies BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT
);

-- Settings por empresa (overrides opcionales)
CREATE TABLE IF NOT EXISTS company_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  custom_api_key TEXT,
  model_override TEXT,
  cost_limit_daily REAL,
  enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configuración global por defecto
INSERT INTO platform_settings (id, model_strategy)
VALUES (
  'global',
  '{"code": "anthropic/claude-sonnet-4", "marketing": "anthropic/claude-sonnet-3.5", "email": "anthropic/claude-haiku-3", "twitter": "anthropic/claude-haiku-3", "analytics": "openai/gpt-4o-mini"}'
) ON CONFLICT (id) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_settings_enabled ON company_settings(enabled);
