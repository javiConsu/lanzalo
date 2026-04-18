# IAmasters

**Academia de IA para departamentos de empresas, en español.**

IAmasters convierte documentos internos (políticas, playbooks, casos reales) en cursos interactivos impartidos por agentes IA: profesor que explica con voz, tutor que resuelve dudas y evaluador que corrige ejercicios.

## Estado

🚧 MVP en desarrollo — primer lote de cursos: **Ventas**, **Finanzas**, **Dirección**, **Management** y **Productividad**.

## Arquitectura

```
IAmasters
├── backend/     API Express + agentes (Profesor, Tutor, Evaluador) + TTS
├── content/     Outlines de cursos por departamento
├── docs/        Arquitectura y roadmap
└── frontend/    Reproductor Vite + React + Tailwind
```

- **IA**: OpenAI (GPT‑4o para razonamiento, TTS‑1 para voz en español)
- **DB**: PostgreSQL
- **Runtime**: Node.js 18+

## Quick start

```bash
cp .env.example .env          # rellena OPENAI_API_KEY y DATABASE_URL
npm install                   # instala backend + frontend (workspaces)
npm run db:setup              # crea tablas
npm run dev                   # arranca backend :4100 y frontend :5173 en paralelo
```

Luego abre `http://localhost:5173`.

Prueba el endpoint de voz aisladamente:

```bash
curl -X POST http://localhost:4100/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hola, bienvenido a IAmasters","voice":"nova"}' \
  --output demo.mp3
```

## Cursos iniciales

| Departamento | Curso | Lecciones |
|---|---|---|
| Ventas | Prospección y cierre con IA | 8 |
| Finanzas | Análisis y forecasting con IA | 8 |
| Dirección | Liderazgo y dirección en tiempos de IA | 8 |
| Management | Coordinación de equipos con IA | 8 |
| Productividad | Asistentes virtuales con IA | 8 |

Outlines en [`content/`](./content). Metadatos completos (fuente de verdad para el seed) en [`backend/seeds/courses.js`](./backend/seeds/courses.js).

### Poblar la base de datos

```bash
npm run seed                # inserta los 5 cursos + 40 lecciones (idempotente)
npm run generate:content    # rellena slides y narración con gpt-4o (~$1.60 total)
npm run generate:audio      # pre-renderiza narración con tts-1 (~$3.80 total, cacheado)
```

Filtros útiles (funcionan en `generate:content` y `generate:audio`):

```bash
npm run generate:content -- --department ventas
npm run generate:audio   -- --course "Análisis y forecasting con IA"
npm run generate:audio   -- --dry-run
```

## Licencia

MIT — ver [LICENSE](./LICENSE).
