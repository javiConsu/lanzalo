# IAmasters — Roadmap

## Fase 0 — Scaffolding ✅
- [x] Estructura del repo
- [x] Backend Express con rutas base
- [x] Agentes Profesor, Tutor, Evaluador
- [x] Servicio TTS con OpenAI tts‑1
- [x] Schema Postgres
- [x] Outlines de los 5 cursos iniciales (Ventas, Finanzas, Dirección, Management, Productividad)
- [x] Catálogo estructurado en `seeds/courses.js` (fuente de verdad)
- [x] Seed idempotente (`npm run seed`)
- [x] Generación de contenido de lecciones vía agente Profesor (`npm run generate:content`)
- [x] Cache de audio TTS por hash de texto (evita re‑sintetizar)
- [x] Script `generate:audio` que pre‑renderiza narración (intro + slides + summary)
- [x] Endpoint `GET /api/tts/:hash` para servir audio cacheado

## Fase 1 — MVP backend (1‑2 semanas)
- [ ] Tests: agentes devuelven JSON válido contra schemas Zod
- [ ] Rate limiting por IP y logging estructurado
- [ ] Health check con verificación de OpenAI y DB

## Fase 2 — Reproductor web (2‑3 semanas)
- [ ] App Vite+React: login → lista de cursos → reproductor
- [ ] Reproductor: slide + `<audio>` con narración + barra de progreso
- [ ] Chat lateral con Tutor, streaming de tokens
- [ ] Quiz al final de cada lección con feedback inmediato
- [ ] Guardar progreso por usuario (enrollments)

## Fase 3 — Ingesta de contenido corporativo (2 semanas)
- [ ] Upload de PDF/DOCX con extracción y chunking
- [ ] Embeddings con pgvector
- [ ] RAG en el agente Profesor: la lección cita pasajes del manual
- [ ] Conectores Notion y Google Drive (OAuth)

## Fase 4 — Multi‑tenant + Billing (2 semanas)
- [ ] Organizaciones + invitaciones por email
- [ ] Clerk para auth (compartir con Lanzalo) o propio
- [ ] Stripe: planes por asientos (starter 5 / team 25 / enterprise custom)
- [ ] Admin panel: progreso del equipo, tiempo estudiado, scoring medio

## Fase 5 — Catálogo ampliado (en paralelo, continuo)
Próximos departamentos tras Ventas y Finanzas:
- Marketing
- RRHH / People
- Legal
- Operaciones / Supply chain
- Producto
- Atención al cliente

## Fase 6 — Extras (backlog)
- [ ] Certificados descargables al completar curso
- [ ] Ranking interno por empresa
- [ ] Integraciones: Slack (recordatorios), Teams
- [ ] Modo móvil PWA
- [ ] Exportar lección a MP4 (slides + audio) para LMS corporativos
- [ ] White‑label para consultoras

## KPIs objetivo (6 meses post‑lanzamiento)
- 10 empresas piloto firmadas
- 500 alumnos activos
- NPS > 40
- Completion rate > 60%
- CAC < 3 meses de payback
