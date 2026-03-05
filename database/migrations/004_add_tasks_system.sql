-- Migración: Sistema de Tareas Completo

-- Tabla de tareas (reemplaza la existente básica)
DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  created_by TEXT, -- 'user', 'ceo-agent', agent_id
  assigned_to TEXT, -- agent_id que debe ejecutarla
  
  -- Metadata
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tag TEXT NOT NULL, -- engineering, browser, research, data, support, content, meta_ads, financial
  task_type TEXT, -- bug, feature, refactor, css, auth, seo, research, etc.
  
  -- Workflow
  status TEXT DEFAULT 'todo', -- todo, in_progress, completed, failed, blocked
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  
  -- Estimation
  complexity INTEGER, -- 1-10
  estimated_hours REAL, -- max 4
  
  -- Relationships
  related_task_ids TEXT, -- JSON array of task IDs
  parent_task_id TEXT REFERENCES tasks(id),
  
  -- Recurrence (NULL if one-time)
  recurring TEXT, -- daily, weekdays, weekly, monthly, NULL
  recurrence_pattern TEXT, -- JSON con config específica
  
  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  failed_at TEXT,
  blocked_at TEXT,
  
  -- Resultados
  output TEXT,
  error_message TEXT,
  report_id TEXT, -- Link al reporte si se creó
  
  -- Metadata adicional
  metadata TEXT -- JSON con data extra
);

-- Tabla de propuestas de tareas (requieren aprobación)
CREATE TABLE task_proposals (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  proposed_by TEXT, -- agent_id
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tag TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_by TEXT,
  rejected_reason TEXT,
  
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- Tabla de conversaciones con CEO Agent
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  
  -- Metadata
  task_id TEXT REFERENCES tasks(id), -- Si el mensaje creó/mencionó una tarea
  action TEXT, -- create_task, get_status, etc.
  
  created_at TEXT DEFAULT (datetime('now'))
);

-- Índices
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_tag ON tasks(tag);
CREATE INDEX idx_task_proposals_company ON task_proposals(company_id);
CREATE INDEX idx_task_proposals_status ON task_proposals(status);
CREATE INDEX idx_chat_messages_company ON chat_messages(company_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);

-- Vista para backlog actual
CREATE VIEW current_backlog AS
SELECT 
  t.*,
  c.name as company_name,
  u.email as owner_email
FROM tasks t
JOIN companies c ON t.company_id = c.id
LEFT JOIN users u ON c.user_id = u.id
WHERE t.status IN ('todo', 'in_progress')
ORDER BY 
  CASE t.priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  t.created_at;
