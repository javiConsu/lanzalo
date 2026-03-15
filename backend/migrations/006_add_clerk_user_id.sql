-- Migración 006: Añadir clerk_user_id para autenticación con Clerk
-- Ejecutar: psql $DATABASE_URL -f backend/migrations/006_add_clerk_user_id.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
