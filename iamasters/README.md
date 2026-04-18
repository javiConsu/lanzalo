# IAmasters

**Academia de IA para departamentos de empresas, en español.**

IAmasters convierte documentos internos (políticas, playbooks, casos reales) en cursos interactivos impartidos por agentes IA: profesor que explica con voz, tutor que resuelve dudas y evaluador que corrige ejercicios.

## Estado

🚧 MVP en desarrollo — primer lote de cursos: **Ventas** y **Finanzas**.

## Arquitectura

```
IAmasters
├── backend/     API Express + agentes (Profesor, Tutor, Evaluador)
├── content/     Outlines de cursos por departamento
├── docs/        Arquitectura y roadmap
└── frontend/    (pendiente) Reproductor de clases + chat
```

- **IA**: OpenAI (GPT‑4o para razonamiento, TTS‑1 para voz en español)
- **DB**: PostgreSQL
- **Runtime**: Node.js 18+

## Quick start

```bash
cp .env.example .env          # rellena OPENAI_API_KEY y DATABASE_URL
npm install
npm run db:setup              # crea tablas
npm run dev                   # arranca backend en :4100
```

Prueba el endpoint de voz:

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

Ver [`content/ventas`](./content/ventas) y [`content/finanzas`](./content/finanzas).

## Licencia

MIT — ver [LICENSE](./LICENSE).
