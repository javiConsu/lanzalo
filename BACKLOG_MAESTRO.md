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

### T-003: Fix logout button (bug conocido del doc)
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 2
- **Descripción:** El botón de cerrar sesión no funciona correctamente. Pendiente de fix según el doc.

### T-004: Auth con sesiones (express-session + connect-pg-simple)
- **Tag:** engineering | **Prioridad:** critical | **Complejidad:** 5
- **Descripción:** El doc especifica express-session + connect-pg-simple (no JWT). Evaluar si migrar o mantener JWT actual. El doc dice email+password con bcrypt.

### T-005: Trial de 7 días con paywall
- **Tag:** engineering | **Prioridad:** critical | **Complejidad:** 5
- **Descripción:** Contador de días en dashboard (badge). Al expirar → paywall bloquea generación. Excepción: "Descubre Ideas" sigue accesible. Cron diario para verificar expiración.

### T-006: Webhook Stripe para suscripciones
- **Tag:** engineering | **Prioridad:** critical | **Complejidad:** 5
- **Descripción:** subscription.created → activar créditos. invoice.paid → renovar. checkout.session.completed → packs extra. Integrar con sistema de créditos T-002.

---

## 🟠 SPRINT 2 — ONBOARDING + DASHBOARD (retención)
*Prioridad: que el usuario vea valor inmediato*

### T-007: Encuesta de onboarding (6 preguntas)
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 4
- **Descripción:** Post-registro, 6 preguntas: nombre/rol, país, experiencia, tipo negocio, objetivo, canal adquisición. Opcional pero incentivada. Guardar en DB para segmentación.

### T-008: Formulario "Describe tu idea" (3 campos)
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 4
- **Descripción:** Nombre del negocio, qué hace, para quién. Botón "Montar mi negocio ahora". Post-submit: genera análisis de mercado + landing page automáticamente.

### T-009: Dashboard multi-columna
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 7
- **Descripción:** Rediseño a multi-columna (no single-column stack). Tabs: Negocio, Producto, Marketing, Emails, SEO, Publi. Timeline de progreso visual con milestones animados.

### T-010: Hub de negocios (post-login)
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 4
- **Descripción:** Grid/lista de negocios del usuario. Si ya tiene negocios → directo al hub (NO al onboarding). Estado y progreso de cada uno. Click para entrar al dashboard individual.

### T-011: Sistema de cambios en assets
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 5
- **Descripción:** Botón "Pedir cambios" en cada asset. Formulario simple. Estado visible: pendiente → procesando → aplicado. Historial de cambios por asset. Email notification. GRATIS (no consume créditos).

### T-012: Widget actividad comunidad (/en-vivo)
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 4
- **Descripción:** Columna 3 del dashboard. Últimos 5 eventos de plataforma. Refresh cada 30s. Link a /en-vivo completo.

---

## 🟡 SPRINT 3 — MÓDULOS DE PRODUCTO
*Prioridad: completar features que generan valor*

### T-013: Módulo "Descubre Ideas" completo
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 6
- **Descripción:** Feed de tarjetas con score de éxito (pill badge grande), filtros (categoría, dificultad, score), botón "Lánzalo" → pre-rellena onboarding. Accesible con trial expirado.

### T-014: Módulo Email Marketing completo
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 7
- **Descripción:** Generación de secuencias por IA, gestión de contactos (manual + auto-captura + CSV import), auto-welcome, stats (sent/opened/clicked), preview antes de enviar.

### T-015: Drip sequence del trial (7 emails)
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 5
- **Descripción:** 7 emails automáticos (1/día): bienvenida, progreso, tips marketing, casos éxito, features avanzadas, urgencia (quedan 2 días), último día CTA. VOZ DE MARCA en todos.

### T-016: Emails transaccionales con voz de marca
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 4
- **Descripción:** Milestone completado → email. Cambios aplicados → email. Feedback resuelto → email. TODOS con tono Lanzalo (humor, directo, no corporativo).

### T-017: Módulo SEO
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 5
- **Descripción:** Tab SEO en dashboard. Análisis y optimización SEO de la web generada.

### T-018: Módulo Marketing/Contenido
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 5
- **Descripción:** Tab Marketing en dashboard. Generación de social posts, blog, ad copy via IA.

---

## 🔵 SPRINT 4 — AGENTES AUTÓNOMOS (la magia)
*Prioridad: que los agentes trabajen de verdad*

### T-019: Sistema de tareas completo (backend)
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 7
- **Descripción:** Implementar flujo: todo → in_progress → completed/failed/blocked. Tags de routing (engineering, browser, research, data, support, content, meta_ads). Tareas recurrentes (daily, weekdays, weekly, monthly).

### T-020: Ciclos nocturnos (night shifts)
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 6
- **Descripción:** Cron diario que por cada negocio activo: revisa estado, identifica qué falta, crea 1-3 tareas de alto impacto, genera reporte corto.

### T-021: Memoria compartida (3 capas)
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 7
- **Descripción:** Layer 1 (15K tokens): domain knowledge por empresa. Layer 2 (3K tokens): preferencias usuario. Layer 3 (15K tokens): patrones cross-company. Herramientas: search_memory, read_memory, update_memory.

### T-022: Redis/Upstash para colas de tareas
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 5
- **Descripción:** Implementar Redis (Upstash) para cola de tareas y pub/sub entre agentes. Sin Redis, los agentes no se comunican eficientemente.

### T-023: Research executor con Brave real
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 4
- **Descripción:** Conectar Research Agent a Brave Search API real. Actualmente es placeholder.

### T-024: Trend Scout Agent
- **Tag:** engineering | **Prioridad:** medium | **Complejidad:** 6
- **Descripción:** Scraping diario Reddit ES, Twitter ES, HN. Scoring de probabilidad de éxito. Feed "Descubre Ideas". Email digest semanal. DIFERENCIAL vs Polsia.

---

## ⚪ SPRINT 5 — MARKETING & ADQUISICIÓN
*Prioridad: traer usuarios*

### T-025: Deploy frontend mejorado
- **Tag:** engineering | **Prioridad:** high | **Complejidad:** 2
- **Descripción:** Build listo en /frontend/dist. Ejecutar deploy a Vercel/Render.

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
