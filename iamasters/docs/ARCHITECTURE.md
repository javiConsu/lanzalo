# IAmasters — Arquitectura

## Visión de alto nivel

```
┌─────────────────────────────────────────────────────────┐
│                    Reproductor web                      │
│  (slides + voz + chat + quiz)    — pendiente            │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────┐
│                    IAmasters API                        │
│                 Express /api/*                          │
└─┬───────────┬─────────────┬──────────────┬──────────────┘
  │           │             │              │
  ▼           ▼             ▼              ▼
┌────────┐ ┌────────┐   ┌────────┐    ┌──────────┐
│courses │ │lessons │   │  tts   │    │  chat    │
└───┬────┘ └───┬────┘   └───┬────┘    └────┬─────┘
    │          │            │              │
    ▼          ▼            ▼              ▼
┌──────────────────────┐ ┌──────────┐  ┌──────────┐
│  Agentes (OpenAI)    │ │ OpenAI   │  │ Tutor    │
│  • Profesor          │ │ TTS-1    │  │ Agent    │
│  • Evaluador         │ │ (nova)   │  │          │
└──────────┬───────────┘ └──────────┘  └──────────┘
           │
           ▼
     ┌───────────┐
     │ Postgres  │  courses, lessons, enrollments,
     │           │  quiz_attempts, chat_sessions
     └───────────┘
```

## Flujo: crear un curso desde un PDF

1. `POST /api/ingest/pdf` (multipart) → devuelve texto extraído
2. `POST /api/courses` con `{ department, topic, sourceText }` → Profesor genera outline, se guardan `courses` + `lessons` vacías
3. `POST /api/lessons/:id/generate-content` → Profesor rellena slides, narración, ejercicio, resumen
4. `POST /api/tts` con cada `narration` → audio mp3 cacheable por hash
5. Usuario estudia en el reproductor → `POST /api/chat` cuando tiene dudas → Tutor responde
6. Al final de lección: `POST /api/lessons/:id/quiz` → Evaluador genera preguntas
7. `POST /api/lessons/:id/grade` por cada respuesta → score + feedback

## Componentes

| Módulo | Responsabilidad |
|---|---|
| `services/openai-client.js` | Cliente único OpenAI (chat + JSON mode) |
| `services/tts-service.js` | Síntesis de voz TTS‑1 en español |
| `agents/professor-agent.js` | Genera outline y contenido de lecciones |
| `agents/tutor-agent.js` | Chat socrático durante la lección |
| `agents/evaluator-agent.js` | Genera y corrige quizzes |
| `routes/*` | HTTP endpoints sobre los servicios/agentes |
| `db/schema.sql` | Esquema PostgreSQL |

## Modelos usados

- **Razonamiento / generación**: `gpt-4o` (override vía `OPENAI_MODEL`)
- **Voz**: `tts-1` voz `nova` (alternativas: `shimmer`, `alloy`). Para calidad premium: `tts-1-hd`.
- **Futuro**: embeddings (`text-embedding-3-large`) para RAG sobre documentos de empresa.

## Costes estimados (referencia)

- Outline de curso (~2k tokens out): ~$0.02
- Lección completa (~4k tokens out): ~$0.04
- Narración TTS‑1 por lección (~800 palabras ≈ 5 min audio): ~$0.08
- Quiz + grading: ~$0.03

→ Curso completo de 8 lecciones: **~$1.20 OpenAI cost**. A 99€/alumno el margen bruto es >98%.

## Decisiones pendientes

- [ ] Frontend: Vite+React (consistente con Lanzalo) vs Next.js
- [ ] Auth: Clerk (reutilizar Lanzalo) vs propio
- [ ] Storage de audio: Postgres bytea, S3/R2 o servir on‑the‑fly con cache HTTP
- [ ] RAG: pgvector en mismo Postgres vs servicio separado
- [ ] Multi‑tenant: namespace por empresa desde el día 1
