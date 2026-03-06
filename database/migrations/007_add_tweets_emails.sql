-- Migración: Tweets y Emails (PostgreSQL)

-- Agregar columnas extra a tweets (ya existe tabla base)
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE;
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS twitter_id TEXT;

-- Agregar columnas extra a emails (ya existe tabla base)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS template TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tweets_company ON tweets(company_id);
CREATE INDEX IF NOT EXISTS idx_tweets_published ON tweets(published);
CREATE INDEX IF NOT EXISTS idx_emails_company ON emails(company_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
