-- Migration 028: Añadir columna credits a users
-- La tabla user_credits existe (015) pero register() inserta credits en users directamente.
-- Esta migración añade la columna faltante para que el registro funcione.

ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);

-- Dar 50 créditos de bienvenida a usuarios existentes que tengan 0
UPDATE users SET credits = 50 WHERE credits = 0 AND plan = 'trial';

-- Índice para códigos de referido
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
