-- Migration 030: Tabla projects para MVP Cofundador
-- Modelo unificado Project/Idea con todos los campos de onboarding

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Perfil del founder (Paso 1)
  motivacion VARCHAR(50),           -- validar_idea | encontrar_idea | vender_mas | explorar
  experiencia VARCHAR(50),          -- primer_proyecto | ya_lance_algo | vivo_de_proyectos
  tiempo_semanal VARCHAR(20),       -- menos_3h | 3_7h | mas_7h

  -- Datos de la idea (Paso 3)
  idea_titulo VARCHAR(255),
  idea_descripcion TEXT,
  cliente_potencial TEXT,
  canales_cliente JSONB DEFAULT '[]',  -- ["linkedin","instagram","tiktok","email","comunidades"]
  objetivo_14_dias VARCHAR(50),        -- primeras_ventas | validar_interes | entender_viabilidad

  -- Estado del proyecto
  status VARCHAR(50) DEFAULT 'onboarding',  -- onboarding | analyzing | planning | executing | completed

  -- Contenido generado por agentes (rellenado por LAN-38)
  analisis_viabilidad JSONB,   -- informe de viabilidad estructurado
  plan_14_dias JSONB,          -- plan día a día estructurado

  -- Link opcional a la tabla companies legacy
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices de consulta
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_analisis ON projects USING GIN (analisis_viabilidad) WHERE analisis_viabilidad IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_plan ON projects USING GIN (plan_14_dias) WHERE plan_14_dias IS NOT NULL;
