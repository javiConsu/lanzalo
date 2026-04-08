# PROJECT INVENTORY — Lanzalo

**Última actualización:** 2026-04-08
**Propósito:** fuente única de verdad para decidir, delegar y auditar trabajo sin duplicar tareas.

## 1. Objetivo actual del producto

Lanzalo no debe operarse como una plataforma horizontal de agentes que promete hacerlo todo.

Su objetivo operativo actual es este:

> **Ayudar a un founder a pasar de idea a ejecución en 14 días mediante un flujo guiado de análisis, planificación y coejecución con un cofundador IA.**

La directiva vigente de foco está en `FOCUS_DIRECTIVE.plan.md`.

## 2. Flujo principal vivo

El flujo principal que hoy existe en producto y debe priorizarse es el siguiente.

| Paso | Ruta o pieza | Estado | Observación operativa |
|---|---|---|---|
| Entrada pública | `frontend/src/pages/LandingPage.jsx` | Vivo | La promesa pública todavía va más ancha que el producto real |
| Login / registro | `frontend/src/pages/Login` + Clerk | Vivo | Funciona como puerta de entrada al flujo |
| Inicio onboarding | `frontend/src/App.jsx` -> `/onboarding/describe-idea` | Vivo | El entrypoint real no coincide del todo con algunos docs antiguos |
| Idea propia o idea validada | `OnboardingDescribeIdea.jsx`, `OnboardingChooseIdea.jsx` | Vivo | Activo |
| Perfil founder | `OnboardingFounderProfile.jsx` | Vivo | Activo |
| Análisis de viabilidad | `ViabilityAnalysis.jsx` | Vivo | Pieza clave del valor percibido |
| Plan de 14 días | `Plan14Days.jsx` + `backend/routes/plans.js` | Vivo | Núcleo activable del producto |
| Dashboard cofundador | `CofundadorDashboard.jsx` | Vivo | Debe convertirse en centro del producto |
| Delegación al agente | Dentro de `CofundadorDashboard.jsx` | Parcial | Existe, pero necesita más trazabilidad y persistencia |
| Artefactos generados | Historial de chat + panel derecho | Parcial | Existe, pero la lectura todavía es débil |

## 3. Fuente de verdad por capas

| Capa | Archivo o zona | Nivel de confianza | Uso correcto |
|---|---|---|---|
| Routing real | `frontend/src/App.jsx` | Alto | Fuente principal para saber qué ve hoy el usuario |
| Flujo de activación | `Plan14Days.jsx`, `CofundadorDashboard.jsx`, `ViabilityAnalysis.jsx` | Alto | Fuente principal para decisiones de MVP |
| Backend del plan | `backend/routes/plans.js` | Alto | Confirma que el loop principal sí existe |
| Estado documentado | `PROJECT_STATUS.md` | Medio | Útil como contexto, no como verdad final |
| Backlog histórico | `BACKLOG_MAESTRO.md` | Medio | Útil para rescatar tareas, no para priorizar sin revisión |
| Arquitectura aspiracional | `ARCHITECTURE*.md`, `IMPLEMENTATION_PLAN.md` | Bajo-Medio | No usar como base única de decisión |
| Operativa agentes | `AGENTS.md`, `DAILY_SYNCS.md` | Alto | Reutilizable para el sistema operativo |

## 4. Activos reales disponibles

### Producto y aplicación

| Activo | Ubicación | Estado |
|---|---|---|
| Frontend principal | `frontend/` | Vivo |
| Backend principal | `backend/` | Vivo |
| API complementaria | `api/` | Disponible |
| Base de datos y migraciones | `database/`, `backend/migrations/` | Disponible |
| Sistema de agentes | `agents/` | Vivo |
| Landing pública | `frontend/src/pages/LandingPage.jsx` | Viva |
| Dashboard admin | `/admin` y `AdminDashboard` | Vivo pero secundario al MVP |

### Infraestructura y operación

| Activo | Ubicación | Estado |
|---|---|---|
| Despliegue frontend | Vercel | Referenciado en docs |
| Despliegue backend | Railway | Referenciado en docs |
| Auth | Clerk | Integrado |
| Pagos | Stripe | Integrado parcialmente al flujo de negocio |
| Emails | Resend | Integrado |
| Tracking | PostHog | Integrado |

### Repos auxiliares auditados

| Repo | Rol percibido | Utilidad actual |
|---|---|---|
| `superceo` | Cerebro de orquestación y heartbeat | Reutilizable como marco operativo |
| `GTM-skills` | Librería táctica GTM | Secundario por ahora |
| `termlings` | Infraestructura de agentes / terminal | Contexto técnico, no prioridad actual |

## 5. Qué está activo y qué queda congelado

### Activo

| Línea | Decisión |
|---|---|
| Co-fundador IA de 14 días | Activa |
| Análisis de viabilidad | Activa |
| Generación de plan accionable | Activa |
| Delegación de tareas concretas | Activa |
| Medición de activación | Activa |

### Congelado hasta nueva orden

| Línea | Motivo |
|---|---|
| Narrativa de empresa autónoma para todo vertical | Dispersa y promete demasiado |
| Nuevos módulos secundarios sin impacto en activación | No mejoran el loop principal |
| Growth automation avanzada desligada del funnel principal | Prematuro |
| Escalabilidad avanzada para volumen alto | Prematuro |
| Multi-venture como promesa principal | No es el producto que hoy se entiende mejor |

## 6. Riesgos confirmados

| Riesgo | Evidencia | Impacto |
|---|---|---|
| Promesa pública demasiado ancha | Landing y README | Confusión y baja credibilidad |
| Producto mezclado con modo demo | Fallback demo en `plans.js` | Puede falsear activación |
| Persistencia parcial en localStorage | `CofundadorDashboard.jsx` | Fragilidad operacional |
| Dashboard clásico y cofundador compitiendo | Rutas y navegación | Experiencia inconsistente |
| Documentación heterogénea | múltiples docs con objetivos distintos | Decisiones erráticas |

## 7. Documentos de gobierno vigentes

| Documento | Función |
|---|---|
| `FOCUS_DIRECTIVE.plan.md` | Define qué es el producto y qué se congela |
| `SPRINT_01_ACTIVATION.plan.md` | Define el primer sprint operativo |
| `docs/PROJECT-INVENTORY.md` | Define activos, piezas vivas y fuentes de verdad |

## 8. Regla de delegación

Antes de crear o asignar cualquier trabajo, validar estas cuatro preguntas.

| Pregunta | Si la respuesta es no |
|---|---|
| ¿Mejora claridad de promesa? | No delegar |
| ¿Mejora activación del flujo principal? | No delegar |
| ¿Mejora conversión o señal real de valor? | No delegar |
| ¿Existe ya algo parecido en este inventario? | No duplicar |

## 9. Próximos artefactos obligatorios

Este inventario exige crear y mantener los siguientes artefactos operativos.

| Artefacto | Estado esperado |
|---|---|
| `docs/ACTIVATION_SCOREBOARD.md` | Tablero de métricas y criterios de éxito |
| `docs/OPERATING_CADENCE.md` | Cadencia diaria y semanal |
| `docs/EXECUTION_QUEUE.md` | Cola de trabajo viva, recortada al sprint activo |

## 10. Nota operativa final

Si un agente o un humano quiere abrir una nueva línea de trabajo, primero debe demostrar por escrito en qué parte de este inventario encaja.

Si no encaja, no entra.
