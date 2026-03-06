-- Migration 012: Preview System
-- Description: Preview builds before execution (inspired by lead-magnet-quiz workflow)

-- Build previews table
CREATE TABLE IF NOT EXISTS build_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Preview metadata
  title TEXT NOT NULL,
  description TEXT,
  industry TEXT, -- SaaS, ecommerce, marketplace, etc.
  template_id TEXT, -- Template used
  
  -- What will be built
  preview_data JSONB NOT NULL,
  /* Structure:
  {
    "landing_page": {
      "sections": [...],
      "design": {...},
      "copy": {...}
    },
    "features": [...],
    "tech_stack": [...],
    "timeline": "X weeks",
    "complexity": "simple|medium|complex"
  }
  */
  
  -- Preview render
  preview_html TEXT, -- HTML preview for iframe
  preview_images TEXT, -- JSON array of image URLs
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, expired
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

-- Preview feedback/iterations
CREATE TABLE IF NOT EXISTS preview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id UUID REFERENCES build_previews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  feedback_type TEXT NOT NULL, -- approve, reject, iterate, comment
  feedback_text TEXT,
  changes_requested JSONB, -- Specific changes
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Preview versions (iterations)
CREATE TABLE IF NOT EXISTS preview_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id UUID REFERENCES build_previews(id) ON DELETE CASCADE,
  
  version_number INTEGER NOT NULL,
  preview_data JSONB NOT NULL,
  preview_html TEXT,
  changes_from_previous TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(preview_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_build_previews_company ON build_previews(company_id);
CREATE INDEX IF NOT EXISTS idx_build_previews_user ON build_previews(user_id);
CREATE INDEX IF NOT EXISTS idx_build_previews_status ON build_previews(status);
CREATE INDEX IF NOT EXISTS idx_preview_feedback_preview ON preview_feedback(preview_id);
CREATE INDEX IF NOT EXISTS idx_preview_versions_preview ON preview_versions(preview_id);

-- Add preview_id to companies (links to approved preview)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS preview_id UUID REFERENCES build_previews(id);

-- Add preview_mode to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS preview_mode_enabled BOOLEAN DEFAULT TRUE;

-- Comments
COMMENT ON TABLE build_previews IS 'AI-generated build previews for user approval';
COMMENT ON TABLE preview_feedback IS 'User feedback and iteration requests on previews';
COMMENT ON TABLE preview_versions IS 'Version history of preview iterations';
