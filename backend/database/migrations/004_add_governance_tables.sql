-- Paperclip Integration - Database Schema
-- Add governance, budgets, and heartbeat tables

-- 1. Budget History Table
CREATE TABLE IF NOT EXISTS budget_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  budget_daily DECIMAL(10,2) NOT NULL,
  hourly_cost DECIMAL(10,4) NOT NULL,
  token_cost DECIMAL(10,6) NOT NULL,
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  total_hours_used DECIMAL(10,4) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_budget_history_agent_type ON budget_history(agent_type);
CREATE INDEX IF NOT EXISTS idx_budget_history_company_id ON budget_history(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_history_date ON budget_history(date);

-- 2. Governance Events Table
CREATE TABLE IF NOT EXISTS governance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL,
  agent_name VARCHAR(100),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_governance_events_agent_id ON governance_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_governance_events_agent_type ON governance_events(agent_type);
CREATE INDEX IF NOT EXISTS idx_governance_events_user_id ON governance_events(user_id);
CREATE INDEX IF NOT EXISTS idx_governance_events_created_at ON governance_events(created_at DESC);

-- 3. Heartbeat Logs Table
CREATE TABLE IF NOT EXISTS heartbeat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'healthy',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_agent_id ON heartbeat_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_agent_type ON heartbeat_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_created_at ON heartbeat_logs(created_at);

-- 4. Agents Table (if not exists)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  paused BOOLEAN NOT NULL DEFAULT false,
  terminated_at TIMESTAMP,
  last_heartbeat TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_agent_type ON agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_agents_company_id ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- 5. Agent Usage Table (for tracking daily usage)
CREATE TABLE IF NOT EXISTS agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_hours DECIMAL(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_usage_agent_type ON agent_usage(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_usage_company_id ON agent_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_usage_created_at ON agent_usage(created_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_history_updated_at BEFORE UPDATE ON budget_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default agents (global agents, not company-specific)
INSERT INTO agents (agent_type, name, status) VALUES
  ('CEO', 'CEO Agent', 'active'),
  ('Code', 'CTO / Code Agent', 'active'),
  ('Marketing', 'Marketing Agent', 'active'),
  ('Twitter', 'Twitter Agent', 'active'),
  ('Email', 'Email Agent', 'active'),
  ('Data', 'Data / Analytics Agent', 'active')
ON CONFLICT (agent_type) DO NOTHING;