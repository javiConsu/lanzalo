-- Migration: Sistema de Créditos
-- Fecha: 2026-03-08
-- Decisión: Trial 14 días / 5 créditos | Pro $39/mes / 20 créditos | Sin revenue share

-- Créditos por usuario
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 0,
  monthly_credits INTEGER NOT NULL DEFAULT 0,    -- Lo que recibe cada mes (0 trial, 20 pro)
  bonus_credits INTEGER NOT NULL DEFAULT 0,      -- Comprados en packs, no expiran
  credits_used INTEGER NOT NULL DEFAULT 0,       -- Total histórico consumido
  reset_date TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Log de transacciones de créditos
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,                       -- +5 grant, -1 consumo, +10 pack
  balance_after INTEGER,                         -- Saldo resultante
  type VARCHAR(50) NOT NULL,                     -- trial_grant, monthly_grant, pack_purchase, consumption, refund, referral_bonus
  action VARCHAR(100),                           -- generate_landing, generate_analysis, etc.
  project_id UUID,                               -- A qué negocio se asocia (opcional)
  metadata JSONB,                                -- Tokens usados, coste API, modelo, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_created ON credit_transactions(user_id, created_at DESC);

-- Comentarios
COMMENT ON TABLE user_credits IS 'Saldo de créditos por usuario. Trial=5, Pro=20/mes, Packs=bonus';
COMMENT ON TABLE credit_transactions IS 'Log inmutable de todo movimiento de créditos';
COMMENT ON COLUMN user_credits.bonus_credits IS 'Créditos comprados en packs. No expiran. No se resetean.';
COMMENT ON COLUMN user_credits.monthly_credits IS 'Créditos mensuales del plan. Se resetean cada mes.';
