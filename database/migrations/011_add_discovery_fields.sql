-- Migration 011: Strategic Discovery fields
-- Description: Add discovery session tracking to users

-- Users table updates
ALTER TABLE users ADD COLUMN IF NOT EXISTS discovery_responses TEXT; -- JSON
ALTER TABLE users ADD COLUMN IF NOT EXISTS discovery_analysis TEXT; -- JSON
ALTER TABLE users ADD COLUMN IF NOT EXISTS discovery_completed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_path TEXT; -- JSON
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_path_at TIMESTAMP;

-- Index for discovery completion tracking
CREATE INDEX IF NOT EXISTS idx_users_discovery_completed ON users(discovery_completed_at) WHERE discovery_completed_at IS NOT NULL;

-- Index for users who selected a path
CREATE INDEX IF NOT EXISTS idx_users_path_selected ON users(selected_path_at) WHERE selected_path_at IS NOT NULL;
