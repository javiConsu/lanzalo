# Análisis Paperclip + Plan Estratégico Lanzalo
**Fecha:** 2026-03-17
**Objetivo:** Llevar Lanzalo a €100k/mes integrando lo mejor de Paperclip

---

## 1. Estado Actual de Lanzalo

### Lo que existe (honesto)

| Componente | Estado | Calidad |
|-----------|--------|---------|
| Agentes (CEO, Code, Email, Twitter, Marketing, Financial, Data) | Implementado | Buena lógica, JS puro |
| Orquestador diario | Implementado | Funciona, sin concurrencia |
| Multi-tenancy (schema-per-tenant) | Implementado | MVP, sin aislamiento fuerte |
| VM2 sandboxing | Implementado | Correcto para MVP |
| Dashboard frontend (Next.js) | Implementado | Funcional, sin polish |
| Cost tracking por empresa | Implementado | Básico |
| Sistema de quotas (Free/Pro) | Implementado | Funciona |
| **Auth JWT** | ❌ NO implementado | Crítico pendiente |
| **Stripe payments** | ❌ NO implementado | Crítico pendiente |
| **Deploy a producción** | ❌ NO realizado | Crítico pendiente |
| Tests unitarios | Parcial | Solo integración |
| TypeScript | ❌ JS puro | Deuda técnica |

### Métricas actuales
- ~2,871 líneas de código, 29 archivos core
- 5 commits en git
- 0 usuarios pagando
- 0 deploys en producción

### Veredicto honesto
Lanzalo tiene **buena lógica de negocio** pero está incompleto para producción. Los bloqueadores críticos son auth, pagos y deploy. La arquitectura JS es funcional pero difícil de mantener a escala.

---

## 2. Análisis de Paperclip

### Qué es Paperclip
- **Repo:** `paperclipai/paperclip` — 27,541 stars, MIT, creado marzo 2026
- **Posicionamiento:** "Si OpenClaw es un *empleado*, Paperclip es la *empresa*"
- Plataforma de orquestación de agentes IA para desarrolladores
- TypeScript monorepo (pnpm workspaces)
- Express 5 + Drizzle ORM + PostgreSQL 17 + better-auth
- React 19 + Vite 6 + TanStack Query + Tailwind CSS 4

### Lo que Paperclip hace bien (que Lanzalo necesita)

#### ✅ TOMAR: Atomic checkout para issues
Paperclip resuelve el problema #1 de multi-agente: dos agentes trabajando en la misma tarea.
```
POST /issues/:id/checkout  →  adquiere lock exclusivo con checkout_run_id
POST /issues/:id/release   →  devuelve al pool
```
Lanzalo tiene orquestador secuencial que no escala. Con checkout atómico, múltiples agentes pueden correr en paralelo sin colisiones.

#### ✅ TOMAR: Governance financiero con hard stops
Paperclip tiene políticas de presupuesto de primera clase:
- Soft threshold (80%): crea alerta
- Hard stop (100%): pausa agente automáticamente, cancela trabajo pendiente
- Por agente, por empresa, por proyecto

Lanzalo tiene cost tracking pero sin enforcement automático. Un bug podría generar miles en tokens.

#### ✅ TOMAR: Session compaction
Los agentes de Paperclip rotan sesiones basándose en:
- Máximo de tokens de entrada acumulados
- Número de runs por sesión
- Edad de la sesión en horas

Al rotar, se escribe un "handoff markdown" con contexto relevante. Lanzalo no tiene esto — los contextos crecen indefinidamente.

#### ✅ TOMAR: Config versioning con rollback
Cada cambio en la configuración de un agente se guarda como snapshot. Puedes revertir a cualquier estado anterior. Crítico para debugging en producción.

#### ✅ TOMAR: Flujo de aprobaciones
Paperclip tiene approval workflows para acciones sensibles:
- Contratar un nuevo agente
- Cambios de presupuesto
- Acciones irreversibles

Lanzalo tiene el concepto (`auto_deploy_approved`, `approval_required`) pero sin implementación formal.

#### ✅ TOMAR: SSE para chat en lugar de WebSocket
`paperclip-plugin-chat` usa Server-Sent Events (SSE) para streaming, no WebSocket. SSE es:
- Más simple de implementar
- Funciona sin estado del servidor
- Compatible con Vercel/Edge functions
- Más fácil de depurar

#### ✅ TOMAR: Wizard de creación de empresa (paperclipper/web)
`paperclipper/web` tiene un wizard de 11 pasos con SSE para provisioning en tiempo real. Exactamente lo que Lanzalo necesita para su flujo de onboarding.

#### ✅ TOMAR: Plugin architecture
Sistema de plugins con manifesto, lifecycle completo (install/enable/disable/upgrade/uninstall), UI injection, scheduled jobs, y SSE streaming. Permite extensibilidad sin tocar el core.

### Lo que Paperclip hace que Lanzalo NO debe copiar

#### ❌ NO COPIAR: UI orientada a desarrolladores
El dashboard de Paperclip es técnico: issue tracker estilo GitHub, org charts, runtime state, API key management. Los usuarios de Lanzalo son emprendedores no técnicos. Copiar esta UX asustaría a nuestros usuarios.

#### ❌ NO COPIAR: CLI-first onboarding
`npx paperclipai onboard` está diseñado para devs. Lanzalo necesita web-first, sin terminal.

#### ❌ NO COPIAR: Múltiples adaptadores de IA (7 providers)
Innecesario para MVP. Añade complejidad sin valor real ahora. Usar OpenRouter abstrae esto perfectamente.

#### ❌ NO COPIAR: PostgreSQL embebido
El modo dev con PostgreSQL embebido es elegante para devs pero irrelevante para SaaS.

### Repositorios útiles de Paperclip

| Repo | Utilidad para Lanzalo |
|------|----------------------|
| `paperclipai/paperclip` | Arquitectura de referencia, atomic checkout, budgets |
| `paperclipper/web` | Wizard de onboarding (adaptar para no-devs) |
| `paperclip-plugin-chat` | Chat SSE con thinking blocks, slash commands, threads |

---

## 3. Decisión Estratégica: ¿Reescribir o Adaptar?

### Opciones

**Opción A: Reescribir en TypeScript (como Paperclip)**
- Pro: Arquitectura limpia, TypeScript, Drizzle ORM
- Contra: 6-8 semanas perdidas, riesgo altísimo, 0 revenue durante reescritura

**Opción B: Continuar con JS, añadir features directamente**
- Pro: Rápido, sin riesgo
- Contra: Deuda técnica creciente, difícil de mantener

**Opción C: Migración incremental (RECOMENDADA)**
- Nuevas features en TypeScript desde el inicio
- Migrar código existente conforme lo tocamos
- Drizzle ORM para nuevas tablas, mantener queries pg para las existentes
- better-auth para auth nueva (no reescribir)

### ✅ DECISIÓN: Migración incremental

**Razón:** No hay revenue todavía. Cada semana sin usuarios pagando es una semana perdida. La migración incremental permite:
1. Unbloquear lo crítico (auth + pagos + deploy) en 2-3 semanas
2. Añadir features de Paperclip (atomic checkout, budgets) en paralelo
3. Mejorar la base técnica sin parar el negocio

---

## 4. Visión del Producto Final

### Lanzalo 2.0: El Sistema Operativo para tu Negocio IA

**Usuario objetivo:** Emprendedor no técnico que quiere que la IA construya y gestione su negocio.

**Diferenciador vs. Paperclip:**
- Paperclip = plataforma para desarrolladores que orquestan agentes
- Lanzalo = producto para emprendedores donde los agentes YA están configurados y listos

**Flujo core:**
```
Signup → Onboarding wizard (5 pasos) → CEO Agent crea plan →
Agentes ejecutan en paralelo → Dashboard muestra progreso →
Aprobaciones para acciones sensibles → Empresa "viva" en 24h
```

### Features del producto final

**Nivel 1 (MVP — necesario para lanzar):**
- Auth + billing (Stripe)
- Onboarding wizard 5 pasos
- Chat con CEO Agent (SSE streaming)
- Dashboard de empresa con actividad en tiempo real
- 5 agentes core: CEO, Code, Marketing, Email, Research
- Budget governance con hard stops
- Deploy de landing pages

**Nivel 2 (Growth — necesario para €10k/mes):**
- Agentes adicionales: Twitter, Financial, Data, Support
- Ideas marketplace
- Session compaction (agentes con memoria larga)
- Config versioning + rollback
- Approval workflows
- Plugin system básico

**Nivel 3 (Scale — necesario para €100k/mes):**
- Integraciones: Zapier, Slack, Make
- API pública para devs
- White-label para agencias
- Mobile app (React Native)
- Multi-idioma
- Marketplace de templates de empresa
- Análisis predictivo de churn

---

## 5. Plan de Desarrollo hacia €100k/mes

### Modelo de revenue

**Pricing recomendado** (basado en análisis competitivo):

| Plan | Precio | Límites |
|------|--------|---------|
| Free | €0 | 1 empresa, 3 tareas/día, sin email/twitter automation |
| Starter | €29/mes | 1 empresa, 20 tareas/día, email automation |
| Pro | €79/mes | 5 empresas, 100 tareas/día, todo incluido |
| Business | €199/mes | Ilimitado, API, soporte prioritario, white-label parcial |

**Math para €100k/mes:**
- Mix realista: 40% Starter + 45% Pro + 15% Business
- Para €100k: ~900 clientes pagando
  - 360 × €29 = €10,440
  - 405 × €79 = €31,995
  - 135 × €199 = €26,865
  - **Total: ~€69k** ← necesitamos ~1,300 clientes o ajustar mix
- Con mayor conversión a Pro/Business (~60%/30%/10%): ~950 clientes = €100k

**Timeline:**
- Mes 1-2: Lanzamiento → €0-500
- Mes 3-4: Early adopters → €2k-8k
- Mes 5-6: Marketing activo → €15k-30k
- Mes 7-9: Escala → €50k-75k
- Mes 10-12: Optimización → €100k

### Fase 0: Desbloquear (Semanas 1-2) — BLOQUEADORES CRÍTICOS

**Objetivo:** Sistema funcionando en producción con 1 usuario pagando.

| Tarea | Descripción | Prioridad |
|-------|-------------|-----------|
| Auth JWT | Implementar registro/login completo | P0 |
| Stripe | Checkout + webhooks + portal | P0 |
| Deploy Railway + Vercel + Supabase | Producción real | P0 |
| Variables de entorno | Secrets de producción | P0 |

**Resultado:** Alguien puede registrarse y pagar.

---

### Fase 1: MVP Completo (Semanas 3-6)

**Objetivo:** Flujo end-to-end funcional. 10 beta users, 3+ pagando.

#### Semana 3: Onboarding + Company creation
- Wizard de 5 pasos (adaptado de paperclipper/web):
  1. Nombre + descripción del negocio
  2. Audiencia objetivo
  3. Presupuesto inicial
  4. Objetivos (leads, revenue, brand)
  5. Confirmación + provisioning con SSE
- SSE para mostrar progreso de creación en tiempo real
- CEO Agent recibe contexto completo del wizard

#### Semana 4: Chat con CEO Agent (SSE)
- Implementar chat basado en `paperclip-plugin-chat`
- SSE streaming (reemplazar WebSocket para chat)
- Thinking blocks (mostrar razonamiento del CEO)
- Slash commands: `/tasks`, `/status`, `/deploy`, `/budget`
- Thread management (crear, renombrar, borrar conversaciones)
- Sin historial infinito → session compaction desde día 1

#### Semana 5: Dashboard + Activity Feed
- Dashboard de empresa: KPIs, actividad, budget usage
- Feed en tiempo real (WebSocket para eventos, SSE para chat)
- Approval UI: aprobar/rechazar acciones de agentes
- Budget panel: gasto actual vs límite, alertas

#### Semana 6: Atomic Checkout + Budget governance
- Implementar atomic checkout para tareas (prevenir colisiones)
- Budget policies: soft warning al 80%, hard stop al 100%
- Cost events por cada llamada LLM
- Dashboard de costos admin (cuánto gasta cada empresa)

---

### Fase 2: Product-Market Fit (Semanas 7-12)

**Objetivo:** Iteración basada en feedback. 50 users, €3k-8k MRR.

#### Semana 7-8: Email automation system
- Drip campaign completo (8 emails: días 1,2,3,4,5,12,13,14)
- Templates React Email + Resend
- Scheduled emails infrastructure
- Trial reminder emails (3 días, 2 días, 1 día)

#### Semana 9-10: Agentes adicionales
- Twitter Agent (posting, scheduling, analytics)
- Financial Agent (análisis diario de costos y churn)
- Data Agent (métricas de negocio, trends)
- Todos con session compaction

#### Semana 11: Ideas Marketplace
- Banco de ideas validadas con score
- Filtros por categoría, presupuesto, audiencia
- "Lanzar esta idea" → onboarding directo
- Reward por completar survey: acceso a top 3 ideas

#### Semana 12: Config versioning + Approval workflows
- Snapshot de config de cada agente en cada cambio
- UI para ver historial + rollback
- Approval flow formal para: deploys, gastos >X€, cambios de config críticos

---

### Fase 3: Escala (Semanas 13-20)

**Objetivo:** Sistemas para crecer a 500+ users. €20k-50k MRR.

#### Semana 13-14: Plugin system básico
- SDK de plugins (basado en @paperclipai/plugin-sdk)
- Primeros plugins: Stripe, Zapier, Slack
- Plugin UI injection en dashboard

#### Semana 15-16: API pública v1
- Autenticación por API key
- Endpoints: crear empresa, ejecutar agente, consultar estado
- Documentación con Mintlify
- Rate limiting por plan

#### Semana 17-18: Optimizaciones de escala
- Atomic checkout para 1000+ empresas concurrentes
- DB connection pooling (PgBouncer)
- Redis para job queues (reemplazar Bull in-memory)
- Kubernetes config preparada

#### Semana 19-20: Marketing y growth
- Landing page optimizada con casos de uso reales
- Programa de referidos (€20 por referido que paga)
- Testimoniales y case studies
- SEO técnico

---

### Fase 4: €100k (Mes 6-12)

**Palancas de crecimiento:**

1. **White-label para agencias** — una agencia puede revender Lanzalo a sus clientes a €150-300/mes por cliente. 10 agencias con 10 clientes cada una = 100 clientes extra.

2. **Enterprise/Business tier** — Empresas medianas que quieren IA gestionando departamentos enteros. €499-999/mes. Solo 100 clientes = €50k.

3. **Marketplace de templates** — Templates de empresa por industria (restaurante, e-commerce, consultora). Vendidos por €29-99 one-time. Upsell natural a Pro.

4. **Afiliados** — Influencers de emprendimiento, newsletters como "The Hustle" o equivalentes en español. 30% de comisión.

5. **Content marketing en español** — Lanzalo es spanish-first. El SEO en español para "IA para emprendedores", "crear empresa con IA" está menos competido que en inglés.

---

## 6. Decisiones Técnicas Inmediatas

### ¿Drizzle ORM ahora o después?
**Respuesta:** Usar Drizzle solo para tablas NUEVAS que creemos. No migrar las existentes hasta que sea necesario. Las consultas pg existentes funcionan y reescribirlas es riesgo sin beneficio.

### ¿better-auth o implementar JWT propio?
**Respuesta:** Usar better-auth. Tiene social login, magic links, sesiones, y está probado. El JWT custom que está en IMPLEMENTATION_PLAN.md es correcto pero reinventa la rueda.

### ¿SSE o WebSocket para chat?
**Respuesta:** SSE para chat (streaming de mensajes). WebSocket para eventos del dashboard (actividad, notificaciones). Paperclip-plugin-chat demuestra que SSE funciona perfectamente para chat de agentes.

### ¿TypeScript ahora?
**Respuesta:** Sí, pero solo para código nuevo. No reescribir lo existente. Configurar `tsconfig.json` con `allowJs: true` para que convivan. Migrar file por file conforme los tocamos.

### ¿Monorepo?
**Respuesta:** No todavía. Introducir estructura de monorepo cuando tengamos claramente separados backend/frontend/shared types. Forzarlo ahora añade overhead sin valor.

---

## 7. Próximos 3 Pasos Concretos

### Paso 1 — Esta semana: Auth + Deploy (Bloqueadores P0)
1. Implementar auth con `better-auth` (`npm install better-auth`)
2. Configurar Railway + Supabase en producción
3. Deploy de backend + frontend
4. Probar registro + login en producción

### Paso 2 — Semana 2: Stripe + Onboarding
1. Integrar Stripe Checkout (plan Pro €79/mes)
2. Webhook handler para `checkout.session.completed`
3. Empezar wizard de onboarding 5 pasos

### Paso 3 — Semana 3-4: Chat + Budget governance
1. Adaptar `paperclip-plugin-chat` a SSE para chat con CEO Agent
2. Implementar budget policies con hard stops
3. Atomic checkout para tareas de agentes

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Runaway LLM costs | Alta | Alto | Hard stops de presupuesto — Fase 1 Semana 6 |
| Agentes colisionando en misma tarea | Media | Medio | Atomic checkout — Fase 1 Semana 6 |
| Pérdida de contexto de agentes | Alta | Medio | Session compaction — Semana 4 |
| Usuarios no entienden el producto | Alta | Alto | Onboarding wizard + chat con CEO |
| Competencia de Paperclip | Baja | Medio | Paperclip es para devs, Lanzalo para emprendedores |
| Infraestructura no escala | Baja (primeros meses) | Alto | Monitorear, escalar cuando lleguemos a 80% |
| Churn alto en trial | Alta | Alto | Drip emails + valor inmediato en onboarding |

---

## Resumen Ejecutivo

**Lanzalo tiene buena lógica de negocio pero no puede lanzar sin auth y pagos.**

**De Paperclip, adoptamos:**
- Atomic checkout (sin colisiones de agentes)
- Budget governance con hard stops (sin runaways de costo)
- SSE para chat (más simple que WebSocket)
- Wizard de onboarding (de paperclipper/web)
- Session compaction (agentes con memoria controlada)
- Config versioning (debugging en producción)
- Plugin architecture (extensibilidad futura)

**No copiamos:**
- La UX técnica de Paperclip (wronge audience)
- CLI-first approach
- 7 adaptadores de IA
- PostgreSQL embebido

**Para llegar a €100k/mes:**
1. Lanzar en producción — Semana 1-2
2. 10 usuarios beta pagando — Semana 3-4
3. PMF con 50+ usuarios — Mes 2-3
4. Marketing activo — Mes 3-6
5. €100k MRR — Mes 10-12

**La única métrica que importa ahora:** ¿Está deployed? Si la respuesta es no, todo lo demás es irrelevante.
