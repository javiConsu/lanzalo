-- Migration 010: Onboarding fields
-- Description: Add trial and onboarding tracking fields to users

-- Users table updates
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS survey_data TEXT; -- JSON
ALTER TABLE users ADD COLUMN IF NOT EXISTS survey_completed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;

-- Companies table updates
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source TEXT; -- 'user_idea' | 'validated_idea'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_id TEXT; -- discovered_ideas.id if from validated

-- Index for trial tracking
CREATE INDEX IF NOT EXISTS idx_users_trial_ends ON users(trial_ends_at) WHERE plan = 'trial';

-- Index for onboarding status
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);
