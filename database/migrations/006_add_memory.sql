-- Migración: Sistema de Memoria (3 Layers) (PostgreSQL)

CREATE TABLE IF NOT EXISTS memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  layer INTEGER NOT NULL,
  content JSONB NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, layer)
);

CREATE INDEX IF NOT EXISTS idx_memory_company ON memory(company_id);
CREATE INDEX IF NOT EXISTS idx_memory_layer ON memory(layer);
