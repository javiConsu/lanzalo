-- Migration: Sistema de Tiers de Suscripcion (3 planes)
-- Fecha: 2026-03-28
-- Planes: Starter 29€, Pro 79€, Business 199€
-- Creditos: Starter 10, Pro 30, Business 100

-- Actualizar comentario de subscription_tier
COMMENT ON COLUMN users.subscription_tier IS 'Plan de suscripcion: free (trial), starter (29€/mes, 10 creditos), pro (79€/mes, 30 creditos), business (199€/mes, 100 creditos)';

-- Actualizar creditos mensuales por defecto segun tier
-- Esta tabla define los creditos que cada plan recibe mensualmente
CREATE TABLE IF NOT EXISTS plan_configs (
  tier VARCHAR(50) PRIMARY KEY,
  monthly_price_eur INTEGER NOT NULL,
  monthly_credits INTEGER NOT NULL,
  business_slots INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO plan_configs (tier, monthly_price_eur, monthly_credits, business_slots, features) VALUES
  ('free', 0, 5, 0, '{"trial": true, "trial_days": 14}'),
  ('starter', 29, 10, 0, '{"support": "email"}'),
  ('pro', 79, 30, 1, '{"support": "priority", "analytics": true}'),
  ('business', 199, 100, 3, '{"support": "dedicated", "analytics": true, "api_access": true}')
ON CONFLICT (tier) DO UPDATE SET
  monthly_price_eur = EXCLUDED.monthly_price_eur,
  monthly_credits = EXCLUDED.monthly_credits,
  business_slots = EXCLUDED.business_slots,
  features = EXCLUDED.features,
  updated_at = NOW();

-- Stripe price IDs por plan (metadata)
CREATE TABLE IF NOT EXISTS stripe_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(50) NOT NULL REFERENCES plan_configs(tier),
  stripe_price_id VARCHAR(255) NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_prices_tier ON stripe_prices(tier);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_active ON stripe_prices(active);

COMMENT ON TABLE plan_configs IS 'Configuracion de planes de suscripcion';
COMMENT ON TABLE stripe_prices IS 'Mapeo de Price IDs de Stripe a tiers';
