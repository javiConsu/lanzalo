-- Migración: Sistema de Memoria (3 Layers)

CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  
  layer INTEGER NOT NULL, -- 1, 2, 3
  content TEXT NOT NULL, -- JSON
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  -- Constraints
  UNIQUE(company_id, layer)
);

-- Índices
CREATE INDEX idx_memory_company ON memory(company_id);
CREATE INDEX idx_memory_layer ON memory(layer);

-- Layer 3 (global) tiene company_id NULL
CREATE UNIQUE INDEX idx_memory_global_layer3 
  ON memory(layer) 
  WHERE company_id IS NULL AND layer = 3;
