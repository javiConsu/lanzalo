-- Migration: Budgets, Governance Events, Heartbeat Logs
-- Date: 2026-03-10
-- Purpose: Enable Paperclip integration for agent management

-- Budget History Table
CREATE TABLE IF NOT EXISTS budget_history (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_role VARCHAR(50) NOT NULL,
  used_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  metric_type VARCHAR(50) DEFAULT 'tokens', -- tokens, api_calls, hours
  recorded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_budget_history_company ON budget_history(company_id);
CREATE INDEX idx_budget_history_agent ON budget_history(agent_role);
CREATE INDEX idx_budget_history_date ON budget_history(recorded_at);

-- Governance Events Table
CREATE TABLE IF NOT EXISTS governance_events (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  agent_role VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL, -- pause, resume, terminate
  reason TEXT,
  performed_by VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_governance_events_company ON governance_events(company_id);
CREATE INDEX idx_governance_events_agent ON governance_events(agent_id);
CREATE INDEX idx_governance_events_action ON governance_events(action);
CREATE INDEX idx_governance_events_date ON governance_events(created_at);

-- Heartbeat Logs Table
CREATE TABLE IF NOT EXISTS heartbeat_logs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_role VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'healthy', -- healthy, warning, unhealthy, timeout
  data JSONB DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_heartbeat_logs_company ON heartbeat_logs(company_id);
CREATE INDEX idx_heartbeat_logs_agent ON heartbeat_logs(agent_role);
CREATE INDEX idx_heartbeat_logs_status ON heartbeat_logs(status);
CREATE INDEX idx_heartbeat_logs_date ON heartbeat_logs(timestamp);

-- Insert default budget allocations (CEOs approval)
INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
SELECT
  c.id,
  'CEO'::VARCHAR,
  0.00,
  4.00,
  'dollars',
  NOW()
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM budget_history bh WHERE bh.company_id = c.id AND bh.agent_role = 'CEO'
)
ON CONFLICT DO NOTHING;

INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
SELECT
  c.id,
  'CTO'::VARCHAR,
  0.00,
  8.00,
  'dollars',
  NOW()
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM budget_history bh WHERE bh.company_id = c.id AND bh.agent_role = 'CTO'
)
ON CONFLICT DO NOTHING;

INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
SELECT
  c.id,
  'Marketing'::VARCHAR,
  0.00,
  4.00,
  'dollars',
  NOW()
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM budget_history bh WHERE bh.company_id = c.id AND bh.agent_role = 'Marketing'
)
ON CONFLICT DO NOTHING;

INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
SELECT
  c.id,
  'Twitter'::VARCHAR,
  0.00,
  2.00,
  'dollars',
  NOW()
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM budget_history bh WHERE bh.company_id = c.id AND bh.agent_role = 'Twitter'
)
ON CONFLICT DO NOTHING;

INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
SELECT
  c.id,
  'Email'::VARCHAR,
  0.00,
  2.00,
  'dollars',
  NOW()
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM budget_history bh WHERE bh.company_id = c.id AND bh.agent_role = 'Email'
)
ON CONFLICT DO NOTHING;

INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
SELECT
  c.id,
  'Data'::VARCHAR,
  0.00,
  4.00,
  'dollars',
  NOW()
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM budget_history bh WHERE bh.company_id = c.id AND bh.agent_role = 'Data'
)
ON CONFLICT DO NOTHING;

INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
SELECT
  c.id,
  'Trends'::VARCHAR,
  0.00,
  2.00,
  'dollars',
  NOW()
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM budget_history bh WHERE bh.company_id = c.id AND bh.agent_role = 'Trends'
)
ON CONFLICT DO NOTHING;

-- Helper function to update agent status
CREATE OR REPLACE FUNCTION update_agent_status(company_id INTEGER, agent_id INTEGER, status VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE tasks
  SET status = status
  WHERE company_id = company_id AND id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to record heartbeat
CREATE OR REPLACE FUNCTION record_heartbeat(company_id INTEGER, agent_role VARCHAR, status VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  heartbeat_id INTEGER;
BEGIN
  INSERT INTO heartbeat_logs (company_id, agent_role, status, timestamp, recorded_at)
  VALUES (company_id, agent_role, status, NOW(), NOW())
  RETURNING id INTO heartbeat_id;

  RETURN heartbeat_id;
END;
$$ LANGUAGE plpgsql;