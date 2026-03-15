-- Migration 031: Tabla survey_responses para encuesta de activación
-- Se dispara tras el evento venture_launched (primer proyecto lanzado)

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  survey_type VARCHAR(50) NOT NULL DEFAULT 'activation',

  -- Pregunta 1: ¿Qué te frenó antes de intentar lanzar tu idea?
  -- Valores: no_tiempo | no_sabia | faltaba_equipo | no_viable | otro
  q1 VARCHAR(100),
  q1_other TEXT,  -- texto libre si seleccionó "Otro"

  -- Pregunta 2: ¿Qué quieres haber conseguido con Lanzalo en los próximos 14 días?
  q2 TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_type ON survey_responses(survey_type);
