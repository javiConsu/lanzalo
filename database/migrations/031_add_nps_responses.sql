-- Migration 031: NPS responses table
-- Stores Net Promoter Score surveys shown post-onboarding
-- Trigger: 7 days after registration OR after plan_generated

CREATE TABLE IF NOT EXISTS nps_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       SMALLINT NOT NULL CHECK (score >= 0 AND score <= 10),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nps_responses_user_id ON nps_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_score ON nps_responses(score);
