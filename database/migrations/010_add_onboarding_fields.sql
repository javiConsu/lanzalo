-- Migration 010: Onboarding fields (PostgreSQL)
-- Description: Add trial and onboarding tracking fields to users

-- Users table updates
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS survey_data JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS survey_completed_at TIMESTAMP;

-- Companies table updates
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Index for trial tracking (using subscription_tier instead of plan)
CREATE INDEX IF NOT EXISTS idx_users_trial_ends ON users(trial_ends_at) WHERE subscription_tier = 'trial';

-- Index for onboarding status
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);
