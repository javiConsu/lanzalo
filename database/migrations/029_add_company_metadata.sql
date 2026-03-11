-- Migration 029: Add metadata JSONB to companies
-- Used to store: viabilityAnalysis, plan14Days, ideaData, founderProfile references
ALTER TABLE companies ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for querying viability status
CREATE INDEX IF NOT EXISTS idx_companies_metadata ON companies USING GIN (metadata);
