-- Business Slots: limitar cuántos negocios puede tener un usuario
-- Trial = 1 slot gratis. Más slots se compran.

ALTER TABLE users ADD COLUMN IF NOT EXISTS business_slots INTEGER DEFAULT 1;

-- Usuarios existentes: darles tantos slots como empresas ya tienen (mínimo 1)
UPDATE users SET business_slots = GREATEST(
  1,
  (SELECT COUNT(*) FROM companies WHERE user_id = users.id)
);
