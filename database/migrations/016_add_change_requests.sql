-- Migration: Sistema de cambios en assets
-- Fecha: 2026-03-08
-- Pedir cambios es GRATIS siempre

CREATE TABLE IF NOT EXISTS change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  asset_type VARCHAR(50) NOT NULL,        -- landing_page, market_analysis, email_sequence, etc.
  asset_id UUID,                          -- ID del asset específico (opcional)
  description TEXT NOT NULL,              -- Qué quiere cambiar el usuario
  status VARCHAR(20) DEFAULT 'pending',   -- pending, processing, applied, rejected
  result TEXT,                            -- Descripción del resultado aplicado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_requests_user ON change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_company ON change_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);

COMMENT ON TABLE change_requests IS 'Peticiones de cambio en assets generados. Siempre GRATIS.';
