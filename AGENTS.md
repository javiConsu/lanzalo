# Lanzalo - AGENTS.md

Lanzalo es una plataforma SaaS de Co-Fundador IA que permite crear y lanzar empresas autonomas impulsadas por IA.

## ⚠️ PRIMERO: Heartbeat Protocol

**AL DESPERTAR, DEBES:**

1. **Obtener tus tareas asignadas:**
```bash
curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "${PAPERCLIP_API_URL}/api/companies/${PAPERCLIP_COMPANY_ID}/issues?assigneeAgentId=${PAPERCLIP_AGENT_ID}&status=todo,in_progress,blocked"
```

2. **Si hay tareas, hacer CHECKOUT inmediatamente:**
```bash
curl -X POST -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  "${PAPERCLIP_API_URL}/api/issues/{ISSUE_ID}/checkout" \
  -d '{"agentId": "'$PAPERCLIP_AGENT_ID'", "expectedStatuses": ["todo", "backlog", "blocked"]}'
```

3. **Trabajar en la tarea y actualizar estado**

**NUNCA ignores las tareas asignadas. Si no hay tareas, entra en modo Self-Improvement.**

---

## Tech Stack

- **Frontend**: Next.js 14 + React + Tailwind CSS (en `/frontend`)
- **Backend**: Node.js + Express (en `/backend` y `/api`)
- **Base de Datos**: PostgreSQL (Supabase/Neon)
- **IA**: OpenRouter (Claude Sonnet 4)
- **Auth**: Clerk
- **Hosting**: Vercel (frontend) + Railway (backend)
- **Pagos**: Stripe
- **Emails**: Resend

## Estructura del Proyecto

```
lanzalo/
  frontend/       # Next.js 14 app (dashboard, onboarding, landing)
  backend/        # Express API server principal
  api/            # Endpoints API adicionales
  agents/         # Logica de agentes autonomos
  analytics/      # Sistema de analytics y metricas
  database/       # Schemas SQL, migraciones
  deployer/       # Sistema de auto-deploy
  emails/         # Templates y sistema de emails
  landing/        # Landing page publica
  scripts/        # Scripts de utilidad y deploy
  test/           # Tests del proyecto
  packages/       # Paquetes compartidos (incluye paperclip config)
  docs/           # Documentacion tecnica
```

## Convenciones de Codigo

- JavaScript/TypeScript
- Usar ES modules (import/export)
- Nombres de variables y funciones en camelCase
- Componentes React en PascalCase
- Archivos de componentes en PascalCase, resto en kebab-case
- Commits en formato convencional: `feat(scope): descripcion`, `fix(scope): descripcion`
- Documentacion y comentarios en espanol cuando sea relevante al negocio

## Comandos Principales

```bash
# Desarrollo
npm run dev          # Arranca todo en modo desarrollo

# Frontend
cd frontend && npm run dev    # Next.js dev server
cd frontend && npm run build  # Build de produccion

# Backend
cd backend && npm start       # Servidor Express

# Tests
cd test && npm test           # Ejecutar tests
```

## Agentes del Equipo

### CEO - Neo (Orquestador)
- Rol: CEO / Orquestador general
- Responsabilidad: Coordinar tareas entre agentes, tomar decisiones estrategicas, priorizar issues
- Puede asignar tareas a Fron-Dani y Back-David

### Fron-Dani (Frontend)
- Rol: Desarrollador Frontend
- Responsabilidad: Todo lo relacionado con `/frontend`, componentes React, UI/UX, Tailwind, Next.js
- Stack: Next.js 14, React, Tailwind CSS, Clerk (auth frontend)
- Al modificar frontend, verificar que el build pase: `cd frontend && npm run build`

### Back-David (Backend)
- Rol: Desarrollador Backend
- Responsabilidad: Todo lo relacionado con `/backend`, `/api`, `/database`, integraciones (Stripe, Resend, OpenRouter)
- Stack: Node.js, Express, PostgreSQL, Stripe API
- Al modificar backend, verificar que los tests pasen: `cd test && npm test`

## Reglas Importantes

1. No hacer cambios breaking sin coordinacion con CEO-Neo
2. Siempre crear rama feature antes de hacer cambios: `git checkout -b feat/descripcion`
3. Los cambios en la base de datos requieren migracion SQL documentada
4. Las API keys nunca se hardcodean - usar variables de entorno
5. El frontend se despliega en Vercel, el backend en Railway
6. Stripe es el sistema de pagos - planes y monetizacion van por ahi
7. Clerk maneja toda la autenticacion de usuarios
8. Cada agente debe limitarse a su area de responsabilidad

## Operating Persona Override
Before planning, writing, delegating, selling, or reviewing, you MUST read `javi.md` and follow it as the primary operating persona. If any instruction conflicts, `javi.md` wins for tone, decision criteria, copywriting standards, and execution style.

## External Access Rule
If a workflow depends on an external credential or integration, never report it vaguely. You MUST specify: (1) exact credential name, (2) exact service where it is created, (3) exact route to obtain it, and (4) whether it can be obtained autonomously from existing authenticated sessions. Only escalate when payment, OTP, CAPTCHA, or a missing owner-only permission blocks execution.

## Paperclip Heartbeat Protocol

### Autenticacion
- Variables de entorno: `PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`
- Todos los requests usan `Authorization: Bearer $PAPERCLIP_API_KEY`
- Incluir header `X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID` en requests que modifican issues

### Procedimiento por Heartbeat

**Paso 1 - Identidad:** `GET /api/agents/me`

**Paso 2 - Obtener asignaciones:**
```
GET /api/companies/{companyId}/issues?assigneeAgentId={your-agent-id}&status=todo,in_progress,blocked
```

**Paso 3 - Checkout (OBLIGATORIO antes de trabajar):**
```
POST /api/issues/{issueId}/checkout
Headers: Authorization: Bearer $PAPERCLIP_API_KEY, X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
{ "agentId": "{your-agent-id}", "expectedStatuses": ["todo", "backlog", "blocked"] }
```

**Paso 4 - Contexto:** `GET /api/issues/{issueId}` y `GET /api/issues/{issueId}/comments`

**Paso 5 - Trabajar:** Ejecutar la tarea asignada

**Paso 6 - Actualizar estado:**
```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
{ "status": "done", "comment": "Que se hizo y por que." }
```

Estados: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled`

### Reglas Criticas
- **SIEMPRE hacer checkout** antes de trabajar
- **NUNCA reintentar un 409** (la tarea pertenece a otro agente)
- **Siempre comentar** en tareas `in_progress` antes de salir
- Si estas bloqueado, actualizar status a `blocked` con comentario explicando el bloqueo
- Los @mentions (`@AgentName`) disparan heartbeats - usar con moderacion
