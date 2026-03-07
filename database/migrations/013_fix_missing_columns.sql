-- Migration 013: Fix missing columns (production hotfix)
-- Description: Add all missing columns detected in production logs

-- Companies: daily sync fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS daily_sync_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_daily_sync TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS next_daily_sync TIMESTAMP;

-- Companies: discovery/preview fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS discovery_score INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS preview_generated_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Users: auth fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'trial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Users: trial/onboarding fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS survey_data JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS survey_completed_at TIMESTAMP;

-- Companies: source fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Companies: settings
ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS target_market TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_model TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS competitors TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_trial_ends ON users(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_companies_daily_sync ON companies(daily_sync_enabled, next_daily_sync);
