-- IAmasters schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ingested_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    VARCHAR(512) NOT NULL,
  mime_type   VARCHAR(128) NOT NULL,
  department  VARCHAR(64),
  text        TEXT NOT NULL,
  pages       INT,
  chars       INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ingested_documents_department_idx ON ingested_documents(department);

CREATE TABLE IF NOT EXISTS courses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department          VARCHAR(64) NOT NULL,
  title               VARCHAR(255) NOT NULL,
  summary             TEXT,
  audience            VARCHAR(255),
  outline             JSONB,
  source_document_id  UUID REFERENCES ingested_documents(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Para bases de datos creadas antes de añadir source_document_id
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS source_document_id UUID
  REFERENCES ingested_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS courses_department_idx ON courses(department);
CREATE UNIQUE INDEX IF NOT EXISTS courses_department_title_uidx ON courses(department, title);

CREATE TABLE IF NOT EXISTS lessons (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  "order"            INT NOT NULL,
  title              VARCHAR(255) NOT NULL,
  objectives         TEXT[],
  keywords           TEXT[],
  estimated_minutes  INT,
  content            JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, "order")
);

CREATE TABLE IF NOT EXISTS enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(128) NOT NULL,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status      VARCHAR(32) DEFAULT 'active',      -- active|completed|dropped
  progress    JSONB DEFAULT '{}'::jsonb,          -- { lessonId: { watched, quizScore } }
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(128) NOT NULL,
  lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  answers     JSONB NOT NULL,     -- [{questionId, answer, score, feedback}]
  total_score INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(128) NOT NULL,
  lesson_id   UUID REFERENCES lessons(id) ON DELETE SET NULL,
  messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
