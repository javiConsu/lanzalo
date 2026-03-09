-- Migration 024: Support tickets y user feedback
-- Tabla de tickets de soporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'bug',  -- 'bug', 'feedback', 'idea'
  message TEXT NOT NULL,
  context_message_id UUID,
  status VARCHAR(50) DEFAULT 'pending',     -- 'pending', 'in_review', 'resolved', 'rejected'
  source VARCHAR(50) DEFAULT 'user',        -- 'user', 'agent'
  admin_notes TEXT,
  resolved_at TIMESTAMP,
  credits_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(type);
-- Tabla de feedback de usuario (likes/dislikes en mensajes del Co-Founder)
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,         -- 'chat_message', 'task_output', 'asset'
  entity_id UUID,
  rating VARCHAR(20) NOT NULL,              -- 'positive', 'negative'
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_company ON user_feedback(company_id);
COMMENT ON TABLE support_tickets IS 'Tickets de soporte y feedback de usuarios. Bug=0 créditos, Feedback=+1 si aprobado.';
COMMENT ON TABLE user_feedback IS 'Likes/dislikes en mensajes del Co-Founder para entrenamiento.';
