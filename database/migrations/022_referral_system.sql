-- Referral system: each user gets a unique code, can refer others for 20 credits
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);

-- Generate referral codes for existing users (8-char alphanumeric)
UPDATE users SET referral_code = UPPER(SUBSTR(MD5(id::text || created_at::text), 1, 8))
WHERE referral_code IS NULL;

-- Track referral conversions
CREATE TABLE IF NOT EXISTS referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referred_id UUID NOT NULL REFERENCES users(id),
  credits_awarded INT DEFAULT 20,
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);
