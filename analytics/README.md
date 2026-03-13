# Analytics — Loop 1 Product Feedback

Dashboard de PostHog para el **Loop 1** de Lanzalo. Mide 5 métricas clave para entender si los usuarios están llegando al momento "aha" y qué los frena.

## Dashboard: "Loop 1 - Product Feedback"

Importar la configuración desde `posthog-dashboard.json` en PostHog > Dashboards > Import.

---

## Las 5 Métricas

### 1. Agentes creados (total + por semana)
- **Evento:** `agent_created`
- **Agrupación:** semanal
- **Objetivo:** Ver si la tracción de nuevas empresas creadas crece semana a semana.
- **Alerta:** Si < 5 agentes/semana en la primera quincena → revisar onboarding.

### 2. % que llegan a `venture_launched`
- **Tipo:** Funnel — `$pageview (login)` → `venture_launched`
- **Ventana:** 14 días desde primer evento
- **Objetivo Loop 1:** > 40% de usuarios completan hasta lanzar su venture.
- **Significado:** Mide la fluidez del onboarding completo.

### 3. Tiempo medio hasta primer venture
- **Cálculo:** Tiempo entre primera sesión y evento `venture_launched`
- **Método PostHog:** "Time to convert" en el funnel de la métrica 2.
- **Objetivo:** < 30 minutos en media.
- **Alerta:** Si > 60 minutos → revisar pasos de onboarding (demasiados friction points).

### 4. Tasa de activación (3+ sesiones / 7 días)
- **Evento:** `activation_complete`
- **Lógica:** Se dispara automáticamente en el frontend cuando el usuario acumula 3 sesiones en 7 días (ver `lib/analytics/events.js`).
- **Objetivo Loop 1:** > 30% de usuarios registrados se activan.
- **Significado:** El usuario encontró valor suficiente para volver.

### 5. Respuestas survey Q1 — top frenos
- **Evento:** `survey_responded` con `survey_type: activation`
- **Breakdown:** propiedad `q1`
- **Valores posibles:** `no_tiempo` | `no_sabia` | `faltaba_equipo` | `no_viable` | `otro`
- **Objetivo:** Entender los frenos históricos para ajustar el messaging y onboarding.
- **Uso:** Alimenta copywriting de landing, emails y posicionamiento.

---

## Frecuencia de Revisión

| Frecuencia | Quién | Qué revisar |
|-----------|-------|------------|
| Semanal (lunes) | Jeff + Sara | Métricas 1, 2, 4 — tracción y activación |
| Quincenal | Jeff + Alex | Métrica 3 — tiempo onboarding, optimizar si > 60 min |
| Mensual | Equipo | Métrica 5 — survey Q1, revisar messaging |

---

## Eventos Requeridos

Todos los eventos están definidos en `frontend/src/lib/analytics/events.js`:

| Evento | Dónde se dispara | Instalado en |
|--------|-----------------|-------------|
| `agent_created` | Al crear empresa en onboarding | LAN-68 |
| `venture_launched` | Click "Empezar Día 1" en Plan14Days | LAN-68 |
| `activation_complete` | 3ª sesión en 7 días (auto) | LAN-68 |
| `survey_responded` | Submit ActivationSurvey | LAN-69 |

---

## Cómo Importar el Dashboard en PostHog

1. Ir a PostHog > **Dashboards** > botón **New dashboard**
2. Seleccionar **Import from JSON**
3. Subir `analytics/posthog-dashboard.json`
4. Ajustar el date range al período deseado (por defecto: últimos 30 días)
5. Guardar y compartir con el equipo

> **Nota:** Si las métricas muestran 0, verificar que `VITE_POSTHOG_KEY` y `VITE_POSTHOG_HOST` están configuradas en el entorno de producción y que `initPostHog()` se llama al arrancar la app.
