-- Migración: Sistema de Settings para Admin

-- Tabla de configuración global (admin)
CREATE TABLE IF NOT EXISTS platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  openrouter_api_key TEXT,
  default_model TEXT DEFAULT 'anthropic/claude-sonnet-4',
  model_strategy TEXT, -- JSON con estrategia por tipo de tarea
  cost_alert_threshold REAL DEFAULT 100.0, -- Alerta si costos > $100/día
  max_daily_cost REAL DEFAULT 500.0, -- Pausar todo si se pasa
  auto_pause_expensive_companies INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT
);

-- Settings por empresa (overrides opcionales)
CREATE TABLE IF NOT EXISTS company_settings (
  company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  custom_api_key TEXT, -- API key propia del cliente (opcional)
  model_override TEXT, -- Override del modelo para esta empresa
  cost_limit_daily REAL, -- Límite de costo diario
  enabled INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Insertar configuración global por defecto
INSERT OR IGNORE INTO platform_settings (id, model_strategy)
VALUES (
  'global',
  '{
    "code": "anthropic/claude-sonnet-4",
    "marketing": "anthropic/claude-sonnet-3.5",
    "email": "anthropic/claude-haiku-3",
    "twitter": "anthropic/claude-haiku-3",
    "analytics": "openai/gpt-4o-mini"
  }'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_settings_enabled ON company_settings(enabled);

-- Comentarios (SQLite no soporta COMMENT ON, usar -- inline)
