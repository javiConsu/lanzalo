-- Migration 020: Fix missing columns in tasks table
-- Adds columns referenced by task-executor and various agents

-- retry_count: used by task-executor for retry logic
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- auto_created: used by ceo-agent, growth-agent, daily-sync to mark auto-generated tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false;

-- Ensure priority ordering index exists for task executor polling
CREATE INDEX IF NOT EXISTS idx_tasks_priority_created ON tasks(priority DESC, created_at ASC) WHERE status = 'todo';
