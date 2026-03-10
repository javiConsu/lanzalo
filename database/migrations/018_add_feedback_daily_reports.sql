-- Migración: Sistema de Feedback Processor (PostgreSQL)

-- Tabla para guardar stats diarios del Feedback Processor
CREATE TABLE IF NOT EXISTS feedback_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  feedback_count INTEGER DEFAULT 0,
  bug_count INTEGER DEFAULT 0,
  improvement_count INTEGER DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,

  top_themes JSONB DEFAULT '[]'::jsonb, -- [{theme: "dashboard performance", count: 3}]

  suggested_tasks JSONB DEFAULT '[]'::jsonb, -- [{title, priority, description, estimated_hours}]

  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para queries eficientes
CREATE INDEX IF NOT EXISTS idx_feedback_daily_company ON feedback_daily_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_feedback_daily_date ON feedback_daily_reports(date);
CREATE INDEX IF NOT EXISTS idx_feedback_daily_company_date ON feedback_daily_reports(company_id, date);

-- Vista para ver reportes recientes
CREATE OR REPLACE VIEW latest_feedback_reports AS
SELECT
  fr.*,
  c.name as company_name,
  c.user_id
FROM feedback_daily_reports fr
JOIN companies c ON fr.company_id = c.id
ORDER BY fr.date DESC, fr.created_at DESC;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_feedback_daily_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feedback_daily_reports_updated_at
BEFORE UPDATE ON feedback_daily_reports
FOR EACH ROW
EXECUTE FUNCTION update_feedback_daily_reports_updated_at();

-- Tabla de propuesta de tasks (ya existe, pero aquí está para referencia)
-- NOTA: task_proposals ya existe en migración 004_add_tasks_system.sql
-- Esta migración solo agrega feedback_daily_reports

COMMENT ON TABLE feedback_daily_reports IS 'Estadísticas diarias del Feedback Processor (agente que analiza feedback de usuarios)';
COMMENT ON COLUMN feedback_daily_reports.top_themes IS 'Array de objetos con {theme: string, count: integer}, ordenados por count DESC';
COMMENT ON COLUMN feedback_daily_reports.suggested_tasks IS 'Array de objetos con {title, priority, description, estimated_hours}';
