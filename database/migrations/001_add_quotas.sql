-- Migración: Sistema de Quotas y Usage Tracking

-- Tabla de tracking de uso
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  quota_type VARCHAR(50) NOT NULL,  -- tasksPerDay, llmTokensPerMonth, etc.
  period VARCHAR(20) NOT NULL,      -- YYYY-MM-DD o YYYY-MM
  amount BIGINT DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, quota_type, period)
);

-- Tabla de uso de LLM (tracking detallado)
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  tokens_used INTEGER NOT NULL,
  estimated_cost DECIMAL(10,4),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_usage_tracking_company ON usage_tracking(company_id, quota_type, period);
CREATE INDEX idx_llm_usage_company_date ON llm_usage(company_id, recorded_at);

-- Agregar campos a companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';

-- Función para limpiar datos antiguos (ejecutar mensualmente)
CREATE OR REPLACE FUNCTION cleanup_old_usage_data()
RETURNS void AS $$
BEGIN
  -- Eliminar datos de uso de más de 3 meses
  DELETE FROM usage_tracking 
  WHERE recorded_at < NOW() - INTERVAL '3 months';
  
  -- Eliminar logs de LLM de más de 6 meses
  DELETE FROM llm_usage 
  WHERE recorded_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE usage_tracking IS 'Tracking de uso de quotas por empresa';
COMMENT ON TABLE llm_usage IS 'Tracking detallado de uso y costos de LLM';
