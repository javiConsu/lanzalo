-- Migración: Tweets y Emails

-- Tabla de tweets
CREATE TABLE IF NOT EXISTS tweets (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  type TEXT, -- launch, milestone, feature, dark_humor, question, generic
  
  published BOOLEAN DEFAULT 0,
  twitter_id TEXT, -- ID del tweet en Twitter cuando se publica
  
  created_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE INDEX idx_tweets_company ON tweets(company_id);
CREATE INDEX idx_tweets_published ON tweets(published);

-- Tabla de emails
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- cold, followup, newsletter, transactional, generic
  recipient TEXT, -- Email del destinatario (o NULL si es lista)
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  sent BOOLEAN DEFAULT 0,
  sent_at TEXT,
  opened BOOLEAN DEFAULT 0,
  clicked BOOLEAN DEFAULT 0,
  
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_emails_company ON emails(company_id);
CREATE INDEX idx_emails_type ON emails(type);
CREATE INDEX idx_emails_sent ON emails(sent);
