-- Migración: Sistema de Tareas Completo (PostgreSQL)

-- Eliminar tabla existente y recrear con más campos
DROP TABLE IF EXISTS tasks CASCADE;

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by TEXT,
  assigned_to TEXT,

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tag TEXT NOT NULL,
  task_type TEXT,

  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',

  complexity INTEGER,
  estimated_hours REAL,

  related_task_ids JSONB,
  parent_task_id UUID REFERENCES tasks(id),

  recurring TEXT,
  recurrence_pattern JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  blocked_at TIMESTAMP,

  output TEXT,
  error_message TEXT,
  report_id UUID,

  metadata JSONB
);

-- Tabla de propuestas de tareas
CREATE TABLE IF NOT EXISTS task_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  proposed_by TEXT,

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tag TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',

  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  rejected_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Tabla de conversaciones con CEO Agent
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  role TEXT NOT NULL,
  content TEXT NOT NULL,

  task_id UUID REFERENCES tasks(id),
  action TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_tag ON tasks(tag);
CREATE INDEX IF NOT EXISTS idx_task_proposals_company ON task_proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_task_proposals_status ON task_proposals(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_company ON chat_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- Vista para backlog actual
CREATE OR REPLACE VIEW current_backlog AS
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
