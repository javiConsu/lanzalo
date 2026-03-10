# BACKLOG MAESTRO — Lanzalo
**Creado:** 2026-03-08 17:38 UTC
**Fuente:** Documento de Replicación Completa vs estado actual del código

---

## 🔴 SPRINT 1 — CRÍTICO (desbloquear cobros + core UX)
*Prioridad: que un usuario pueda registrarse, ver valor, y pagar*

### T-001: Fix pricing a $39/mes en todo el código ✅ COMPLETADA
- **Tag:** engineering | **Prioridad:** critical | **Complejidad:** 3
- Revenue share eliminado (admin-financials, payments, migrate)
- Pricing $39 consistente, trial 14 días consistente
- Default revenue_share_rate → 0.00 en schema

### T-002: Sistema de créditos (tablas + lógica) ✅ COMPLETADA
- **Tag:** engineering | **Prioridad:** critical | **Complejidad:** 7
- Creado: backend/middleware/credits.js (lógica completa)
- Creado: backend/routes/credits.js (API: ver, historial, packs, comprar)
- Creado: database/migrations/015_add_credits.sql (tablas user_credits + credit_transactions)
- Integrado en: onboarding.js (initCredits al registro)
- Integrado en: webhooks.js (activatePro, renewMonthly, addCredits para packs)
- Integrado en: server.js (ruta /api/credits)
- Registrado en: migrate.js (migración 015)
- **Pendiente:** ejecutar migración en producción + test

### T-003: Fix logout button ✅ COMPLETADA
- Limpia localStorage + redirect a /
- AdminDashboard.jsx reconstruido (estaba corrupto)

### T-004: Auth con sesiones (express-session + connect-pg-simple)
- **Tag:** engineering | **Prioridad:** critical | **Complejidad:** 5
- **Descripción:** El doc especifica express-session + connect-pg-simple (no JWT). Evaluar si migrar o mantener JWT actual. El doc dice email+password con bcrypt.

### T-005: Trial 14 días con paywall ✅ COMPLETADA
- TrialBadge en sidebar (urgente si <=3 días)
- CreditsBadge en sidebar
- Paywall bloquea chat/backlog/metrics si trial expirado
- Ideas siguen accesibles (re-engagement)
- Profile API devuelve isTrialActive, trialDaysLeft, isTrialExpired, isPro, credits
- Trial manager ya existía (cron 9AM + reminders 10AM + downgrade)

### T-006: Webhook Stripe para suscripciones ✅ COMPLETADA
- checkout.session.completed → activatePro (20cr) o addCredits (packs)
- invoice.payment_succeeded → renewMonthly
- subscription.updated/deleted → downgrade tier

---

## 🟠 SPRINT 2 — ONBOARDING + DASHBOARD (retención)
*Prioridad: que el usuario vea valor inmediato*

### T-007: Encuesta de onboarding (6 preguntas) ✅ YA EXISTÍA
- OnboardingSurvey.jsx con 6 preguntas completas
- Fix aplicado: api.post → fetch con apiUrl
- Reward: 3 ideas validadas al completar

### T-008: Formulario "Describe tu idea" ✅ YA EXISTÍA
- OnboardingChoosePath.jsx: describe idea propia O elegir idea validada
- OnboardingChooseIdea.jsx: elegir de ideas validadas
- Flujo completo: survey → choose-path → create-company

### T-009: Dashboard multi-columna
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 7
- **Descripción:** Rediseño a multi-columna (no single-column stack). Tabs: Negocio, Producto, Marketing, Emails, SEO, Publi. Timeline de progreso visual con milestones animados.

### T-010: Hub de negocios (post-login) ✅ COMPLETADA
- BusinessHub.jsx: grid de negocios con estado/progreso
- Si 0 negocios → CTA "Crear mi negocio"
- Si 1+ → grid con cards clickeables → van al chat
- Botón "+ Nuevo negocio" para crear más
- Dashboard index ahora muestra hub (no chat directo)

### T-011: Sistema de cambios en assets ✅ COMPLETADA
- API: POST/GET /api/changes (crear, listar, ver)
- Tabla change_requests (migración 016)
- GRATIS siempre (credits.js: change_request = 0)
- Activity log al crear cambio
- **Pendiente:** botón "Pedir cambios" en UI de assets + email notifications

### T-012: Widget actividad comunidad (/en-vivo) ✅ YA EXISTÍA
- LiveFeed.jsx en sidebar del dashboard
- WebSocket a backend, refresh en tiempo real
- Muestra últimos 50 eventos con iconos por tipo de agente

---

## 🟡 SPRINT 3 — MÓDULOS DE PRODUCTO
*Prioridad: completar features que generan valor*

### T-013: Módulo "Descubre Ideas" ✅ YA EXISTÍA + FIX
- Ideas.jsx completo: feed tarjetas, score, filtros, botón "Lánzalo"
- Backend ideas.js con CRUD + launch
- Fix: URLs ahora usan apiUrl()
- Accesible con trial expirado (Paywall no bloquea /ideas)

### T-014: Módulo Email Marketing ⏳ PARCIAL
- email-service.js ya tiene: welcome, trial reminder, validation, daily sync, task completed, downgrade
- **Falta:** UI de gestión de contactos, CSV import, secuencias IA, stats opened/clicked
- **Prioridad rebajada:** el drip cubre la conversión del trial

### T-015: Drip sequence del trial (7 emails) ✅ COMPLETADA
- drip-sequence.js con 7 emails completos (HTML, voz de marca)
- Día 2-7 con humor español, ejemplos raros, CTAs directos
- Cron diario 10:30 AM UTC
- Registrado en server.js + activity_log

### T-016: Emails transaccionales ✅ YA EXISTÍA
- Welcome, trial reminder, validation complete, daily sync, task completed, downgrade
- Todos con HTML dark theme y tono Lanzalo

### T-017: Módulo SEO
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 5
- **Descripción:** Tab SEO en dashboard. Análisis y optimización SEO de la web generada.

### T-018: Módulo Marketing/Contenido
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 5
- **Descripción:** Tab Marketing en dashboard. Generación de social posts, blog, ad copy via IA.

---

## 🔵 SPRINT 4 — AGENTES AUTÓNOMOS (la magia)
*Prioridad: que los agentes trabajen de verdad*

### T-019: Sistema de tareas completo ✅ YA EXISTÍA
- task-executor.js: polling 10s, 5 concurrent, retry 3x
- 7 executors: code, research, browser, twitter, email, data, trend-scout
- Tags routing: engineering, code, research, browser, twitter, email, data, analytics, trends, ideas
- Gamificación integrada (XP + achievements)
- WebSocket broadcast al completar

### T-020: Ciclos nocturnos (night shifts) ✅ YA EXISTÍA
- orchestrator.js: cron 9AM, ciclo por empresa (5 agentes)
- daily-sync.js: cron cada hora, verifica qué empresas necesitan sync
- Genera reportes, detecta cuellos de botella, crea tareas

### T-021: Memoria compartida (3 capas) ✅ YA EXISTÍA
- memory-system.js: 385 líneas, 3 capas implementadas
- Layer 1: domain knowledge por empresa
- Layer 2: preferencias usuario
- Layer 3: patrones cross-company
- Auto-curación post-ejecución
- Tabla memory con migración 006

### T-022: Redis/Upstash para colas ⏸️ DEPRIORIZDO
- PostgreSQL polling actual funciona para <100 empresas
- Implementar cuando haya volumen real
- Upstash free tier listo cuando se necesite

### T-023: Research executor con Brave real ✅ COMPLETADA
- Brave Search API integrada (BRAVE_API_KEY)
- 10 resultados reales por query
- Fallback graceful si no hay API key

### T-024: Trend Scout Agent ✅ YA EXISTÍA
- trend-scout-executor.js: 492 líneas
- Scraping Reddit (7 subreddits), HackerNews, Product Hunt
- Scoring de probabilidad de éxito con LLM
- Guarda ideas en discovered_ideas
- seed-ideas.js para datos iniciales

---

## ⚪ SPRINT 5 — MARKETING & ADQUISICIÓN
*Prioridad: traer usuarios*

### T-025: Deploy frontend ✅ COMPLETADA
- Build OK (Vite, 249KB gzip 72KB)
- vercel.json actualizado para build desde fuente
- Push a GitHub → deploy automático en Vercel

### T-026: Cold Outreach Agent funcional
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 6
- **Descripción:** Workflow diario: verificar replies, research leads, enviar 2 cold emails/día, follow-ups a 5+ días. Hunter.io para verificar emails.

### T-027: Meta Ads Agent con Fal.ai
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 8
- **Descripción:** Video ads UGC con Fal.ai (más barato que Sora). Template de prompt definido. Auto-pause underperformers (CTR < 0.5% después de 3 días).

### T-028: Twitter Agent con Late.dev
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 4
- **Descripción:** 2 tweets/día. Dark humor, witty. Sin emojis ni hashtags. Cada tweet con link a web. Late.dev ya configurado.

### T-029: Quitar visualización de "Revenue:" en Ideas.jsx ✅ COMPLETADA
- **Tag:** engineering | **Prioridad:** low | **Complejidad:** 2
- **Descripción:** Eliminar visualización de "Revenue:" mostrando potential_revenue en Ideas.jsx
- **Resultado:** Cleanse de texto, menos confusión con el modelo monetario

### T-030: Business Ticker ✅ COMPLETADA
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 5
- **Descripción:** Añadir ticker estilo Twitter con última empresa creada
- **Componente:** BusinessTicker.jsx + Backend endpoint /api/companies/last + Integración en Dashboard.jsx
- **Resultado:** Showcase de social proof automático

### T-031: Recuperación de contraseña ✅ COMPLETADA
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 7
- **Descripción:** Flujo completo JWT 24h para recuperar contraseña
- **Backend:** 2 endpoints POST + tabla password_reset_tokens
- **Frontend:** 2 páginas + rutas + link en Login
- **Resultado:** UX básica faltada con JWT 24h

### T-032: Investigar modelos locales + cloud para optimizar costos
- **Tag:** engineering | **Prioridad:** low | **Complejidad:** 6
- **Descripción:** Evaluar si Lanzalo puede usar modelos locales (0.8B-7B) como fallback/budget-optimizer mientras mantiene calidad. Benchmark: Cuánto ahorras vs qué pierdes en calidad para casos típicos de Lanzalo (analysis, marketing, support).
- **Contexto:** Ziwen Xu demostró 0.8B model 24/7 en Mac mini con OpenClaw eliminando costos de API.
- **Opciones:** Solo cloud, solo local, híbrido (0.8B para tareas simples + 7B+ para complejas).
- **Resultado esperado:** Data-driven recommendation para MVP (cost-benefit analysis).

### T-033: Contexto visualizer en dashboard
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 5
- **Descripción:** Integrar contexto visualizer (basado en context-doctor) en Dashboard de Lanzalo. Mostrar gráficos de uso de contexto, alertas cuando >80% y sugerencias de optimización.
- **Feature listo en workspace:** context-doctor instalado y funcionando
- **Features:**
  - Gráfico de últimos 7 días de uso de contexto
  - Alertas (WhatsApp/Telegram) cuando contexto excede threshold
  - Auto-optimización: sugerir archivos para compress o eliminación
  - Comparación con benchmarks (ej. "Tu contexto está en el 15% vs promedio 20% del sector")
- **Output:** Dashboard con tab "Contexto" (stats + alerts)

### T-034: Backend - cambiar "backlog" → "colas" en API
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 4
- **Descripción:** Refactorizar endpoints y nombres en backend que usan "backlog" o "Cola"
- **Cambios:**
  - endpoints: cambiar "backlog" → "colas" o "work-queues" (GET/POST)
  - middleware: messages "backlog" → "colas"
  - rutas: /api/backlog/* → /api/colas/*
  - base de datos: tabla si existe (a veces se llama backlog)
- **Resultado:** API usando terminología correcta en español

### T-035: Frontend - cambiar "Backlog" → "Cola de trabajo"
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 3
- **Descripción:** Refactorizar todos los textos y nombres en frontend que usan "backlog"
- **Cambios:**
  - Tab: "Cola de trabajo" (Dashboard.jsx)
  - Text: "Tareas en tu cola", "Tu cola tiene X tareas pendientes"
  - Botones: "Ver cola", "Agregar a cola", "Cola completa"
  - Emails: "En tu cola hay X tareas pendientes..."
  - API responses: cambiar "backlog" → "colas" o "work_queues"
- **Resultado:** Terminología 100% en español, consistente en todo el sistema

### T-036: Sistema de notificaciones - actualizaciones en cola
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 4
- **Descripción:** Cuando una tarea es completada, notificar al usuario sobre el progreso en la cola de trabajo
- **Features:**
  - Email: "Tarea X completada en tu cola"
  - Notification toast: "¡Tarea completada! Tu cola tiene X tareas pendientes"
  - Stream de actualizaciones: "X tareas completadas en la última hora"
- **Resultado:** Usuario siempre alineado con qué hay en su cola

### T-037: Base de datos - Feedback Processor (migración 018)
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 4
- **Descripción:** Crear tabla feedback_daily_reports para guardar stats del agente de feedback diario
- **Estructura:**
  ```sql
  CREATE TABLE feedback_daily_reports (
    id UUID PRIMARY KEY,
    company_id UUID,
    date DATE,
    feedback_count INTEGER,
    bug_count INTEGER,
    improvement_count INTEGER,
    top_themes JSONB,
    suggested_tasks JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- **Índices:** idx_feedback_daily_company, idx_feedback_daily_date
- **Resultado:** Base de datos preparada para guardar reportes diarios

### T-038: Backend - Crear feedback-processor-executor.js
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 8
- **Descripción:** Crear el 8to executor del sistema que analiza feedback y propone mejoras
- **Archivo:** /backend/agents/executors/feedback-processor-executor.js (400 líneas)
- **Funcionalidad:**
  - Recolectar datos de chat_messages, tasks, task_proposals, memory, activity_log
  - Analizar con LLM (300k tokens, incluyendo reflections)
  - Proponer 2-3 tareas (alta/med/baja prioridad)
  - Guardar en task_proposals
  - Crear reporte en feedback_daily_reports
- **Output:** Consistente con otros executors (status, output, insights)
- **Resultado:** Agente funcional que procesa feedback diariamente

### T-039: Backend - Integrar en scheduler (9AM daily)
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 3
- **Descripción:** Programar feedback-processor para ejecutarse cada día a las 9AM UTC
- **Cambios:**
  - integrar en orchestrator.js o scheduler.js
  - cron: "0 9 * * *"
  - Ejecutar para todas las empresas
  - Opcional: ejecutar solo en empresas con actividad reciente
- **Resultado:** Agente se ejecuta automáticamente diariamente

### T-040: Frontend - UI para ver reporte diario de feedback
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 6
- **Descripción:** Dashboard tab "Feedback" para ver reporte diario de feedback processor
- **Features:**
  - Gráficos: feedback count por día (últimos 7 días)
  - Stats: bugs, improvements, complaints separados
  - Top themes: gráfico de barras con temas más frecuentes
  - Suggested tasks: lista de propuestas con prioridad badge
  - Acción: aprobar/rechazar propuestas directamente
- **Resultado:** Usuario ve feedback procesado y propuestas de mejora

### T-041: Email template - reporte diario de feedback
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 3
- **Descripción:** Crear plantilla email para co-founder con reporte diario de feedback
- **Variables:**
  - fecha, feedback_count, bug_count, improvement_count
  - top_themes (JSONB → list sorted)
  - suggested_tasks (array de objetos con title, priority, description)
- **Plantilla:** HTML + texto plano, tono profesional pero cercano
- **Resultado:** Email completo y listo para enviar

### T-042: Sistema de notificaciones - a co-founder
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 3
- **Descripción:** Sistema para notificar al co-founder cuando hay nuevas propuestas
- **Canales:**
  - Telegram: envío automático del resumen del reporte
  - Email: envío automático del reporte completo
- **Resultado:** Co-founder recibe reporte inmediatamente después de que el agente ejecuta

### T-043: Telegram notification - resumen del reporte
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 2
- **Descripción:** Enviar notificación breve al co-founder en Telegram
- **Content:**
  - "Reporte de Feedback: X feedback, Y bugs encontrados"
  - "Z nuevas propuestas de mejora en tu dashboard"
  - CTA: "Ver más"
- **Resultado:** Co-founder ve aviso rápido en Telegram

### T-044: Email template - nuevas mejoras implementadas
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 2
- **Descripción:** Crear plantilla email para notificar al usuario cuando el co-founder aprueba mejoras
- **Variables:**
  - nombre_usuario, mejoras_aprobadas (array de objetos)
  - fecha_implementación, fecha_aprobación
- **Content:**
  - "Tu feedback llevó a mejoras en [empresa]"
  - Lista de mejoras implementadas
  - Link al dashboard
- **Resultado:** Usuario recibe email claro cuando mejora es implementada

### T-045: Notificación del usuario - nuevas mejoras
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 2
- **Descripción:** Notificar al usuario cuando hay mejoras disponibles o implementadas
- **Canales:**
  - Email (contenido como T-044)
  - Notification toast en dashboard
  - Slack/Telegram si configurado
- **Resultado:** Usuario siempre alineado con estado de mejoras

---

## ORDEN DE EJECUCIÓN RECOMENDADO

**Semana 1-2:** T-001, T-002, T-003, T-004, T-005, T-006, T-025
→ Resultado: usuario puede registrarse, ver trial, pagar $39/mes, créditos funcionan

**Semana 3-4:** T-007, T-008, T-009, T-010, T-011, T-012
→ Resultado: onboarding completo, dashboard profesional, cambios en assets

**Semana 5-6:** T-013, T-014, T-015, T-016
→ Resultado: módulos de valor (ideas, emails, drip), emails con voz de marca

**Semana 7-8:** T-019, T-020, T-021, T-022
→ Resultado: agentes autónomos funcionando con memoria y ciclos nocturnos

**Semana 9-10:** T-023, T-024, T-026, T-027, T-028, T-034, T-035, T-036, T-037, T-038, T-039, T-040, T-041, T-042, T-043, T-044, T-045
→ Resultado: marketing y adquisición automatizados + terminología en español + feedback processor diario (reporte co-founder + notificación usuario)

