-- Lanzalo Database Schema

-- Users (founders who sign up)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro ($39/mo)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Companies (each AI-run venture)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  tagline VARCHAR(500),
  description TEXT,
  industry VARCHAR(100),
  subdomain VARCHAR(100) UNIQUE, -- e.g., mycompany.lanzalo.app
  status VARCHAR(50) DEFAULT 'planning', -- planning, building, live, paused
  revenue_total DECIMAL(10,2) DEFAULT 0,
  revenue_share_rate DECIMAL(3,2) DEFAULT 0.20, -- 20%
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks (daily autonomous work cycles)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL, -- code, marketing, email, twitter, analytics
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  output TEXT, -- result/log of the task
  scheduled_for TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deployments (web apps/sites deployed)
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  type VARCHAR(50), -- web_app, landing_page, api, database
  framework VARCHAR(50), -- nextjs, express, static
  status VARCHAR(50) DEFAULT 'deploying', -- deploying, live, failed
  deploy_log TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Emails (outreach campaigns & automation)
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255),
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, bounced, replied
  sent_at TIMESTAMP,
  replied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tweets (social media automation)
CREATE TABLE tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, posted
  scheduled_for TIMESTAMP,
  posted_at TIMESTAMP,
  tweet_id VARCHAR(100), -- Twitter's tweet ID
  engagement_likes INT DEFAULT 0,
  engagement_retweets INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics (metrics tracking)
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL, -- visitors, signups, revenue, etc.
  metric_value DECIMAL(10,2) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Activity Log (live feed for dashboard)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL, -- task_start, task_complete, deploy, email_sent, tweet_posted
  message TEXT NOT NULL,
  metadata JSONB, -- additional context
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_companies_user ON companies(user_id);
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_deployments_company ON deployments(company_id);
CREATE INDEX idx_emails_company ON emails(company_id);
CREATE INDEX idx_tweets_company ON tweets(company_id);
CREATE INDEX idx_analytics_company ON analytics(company_id);
CREATE INDEX idx_activity_log_company ON activity_log(company_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
