-- Migración: Sistema de Reportes

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id),
  
  type TEXT NOT NULL, -- research, financial, analytics, marketing
  title TEXT,
  content TEXT NOT NULL, -- Markdown/JSON
  
  metadata TEXT, -- JSON con data extra
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_reports_company ON reports(company_id);
CREATE INDEX idx_reports_task ON reports(task_id);
CREATE INDEX idx_reports_type ON reports(type);
