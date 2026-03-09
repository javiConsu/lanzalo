-- Migración 017: Email Pro — Cold email as a service via Instantly.ai
-- Plan: 15€/mes, Lanzalo gestiona dominio + warmup + campañas

-- ═══════════════════════════════════════
-- Email Pro subscriptions (per company)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_pro_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, setting_up, active, paused, cancelled, failed
  
  -- Instantly setup
  instantly_domain TEXT,           -- e.g. 'acmecorp-mail.com'
  instantly_account_id TEXT,       -- Instantly account UUID
  instantly_account_email TEXT,    -- e.g. 'hello@acmecorp-mail.com'
  instantly_warmup_status TEXT DEFAULT 'pending', -- pending, warming, ready
  instantly_dfy_order_id TEXT,     -- DFY order reference
  
  -- Limits
  emails_per_month INTEGER DEFAULT 500,
  emails_sent_this_month INTEGER DEFAULT 0,
  month_reset_at TIMESTAMP,
  
  -- Timestamps
  activated_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_pro_company ON email_pro_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_email_pro_user ON email_pro_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_pro_status ON email_pro_subscriptions(status);
-- One active subscription per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_pro_active 
  ON email_pro_subscriptions(company_id) 
  WHERE status IN ('active', 'setting_up', 'pending');

-- ═══════════════════════════════════════
-- Instantly campaigns (linked to Lanzalo companies)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS instantly_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES email_pro_subscriptions(id),
  
  -- Instantly data
  instantly_campaign_id TEXT,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed
  
  -- Sequence
  subject TEXT,
  email_body TEXT,
  followup_steps JSONB DEFAULT '[]', -- [{delay_days: 3, subject: '...', body: '...'}]
  
  -- Stats (synced from Instantly)
  leads_count INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  
  -- Metadata
  target_audience TEXT,         -- Description of ideal customer
  created_by TEXT DEFAULT 'agent', -- 'agent' or 'user'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instantly_campaigns_company ON instantly_campaigns(company_id);

-- ═══════════════════════════════════════
-- Leads imported (CSV uploads + agent-found)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES instantly_campaigns(id),
  
  -- Contact info
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  company_domain TEXT,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  job_title TEXT,
  
  -- Instantly sync
  instantly_lead_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'new', -- new, contacted, replied, interested, not_interested, bounced
  source TEXT DEFAULT 'manual', -- manual (CSV), agent, enrichment
  
  -- Engagement
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMP,
  last_replied_at TIMESTAMP,
  reply_content TEXT,           -- Last reply text
  
  -- AI analysis
  interest_score REAL,          -- 0.0-1.0 AI-assessed interest level
  ai_notes TEXT,                -- Agent's analysis of this lead
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
-- Prevent duplicate leads per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_email 
  ON leads(company_id, email);

-- ═══════════════════════════════════════
-- Add Stripe fields for Email Pro to users table
-- ═══════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add Email Pro Stripe price env reference
-- STRIPE_EMAIL_PRO_PRICE_ID should be set in .env
