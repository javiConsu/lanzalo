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

**Semana 9-10:** T-023, T-024, T-026, T-027, T-028
→ Resultado: marketing y adquisición automatizados

---

**Total: 28 tareas | 5 sprints | ~10 semanas**
**Prioridad absoluta: Sprint 1 (desbloquear cobros)**
