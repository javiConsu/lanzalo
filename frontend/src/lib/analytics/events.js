/**
 * lib/analytics/events.js
 * Módulo de eventos PostHog para Lanzalo.
 * Centraliza los 5 eventos clave del Loop 1.
 *
 * Uso:
 *   import { trackAgentCreated } from '../lib/analytics/events'
 *   trackAgentCreated({ agentId: company.id, agentType: 'co-founder', userId: user.id })
 */

import { captureEvent, identifyUser } from '../posthog'

// ─── Evento 1: agent_created ────────────────────────────────
/**
 * Usuario crea un agente (empresa/venture) en Lanzalo.
 * @param {{ agentId: string, agentType: string, userId: string }} props
 */
export function trackAgentCreated({ agentId, agentType, userId }) {
  captureEvent('agent_created', {
    agent_id: agentId,
    agent_type: agentType,
    user_id: userId,
  })
}

// ─── Evento 2: task_assigned ────────────────────────────────
/**
 * Primera tarea asignada a un agente.
 * @param {{ agentId: string, taskId: string, userId: string }} props
 */
export function trackTaskAssigned({ agentId, taskId, userId }) {
  captureEvent('task_assigned', {
    agent_id: agentId,
    task_id: taskId,
    user_id: userId,
  })
}

// ─── Evento 3: task_completed ───────────────────────────────
/**
 * Agente completa una tarea.
 * @param {{ agentId: string, taskId: string, durationMs?: number }} props
 */
export function trackTaskCompleted({ agentId, taskId, durationMs }) {
  captureEvent('task_completed', {
    agent_id: agentId,
    task_id: taskId,
    duration_ms: durationMs ?? null,
  })
}

// ─── Evento 4: venture_launched ─────────────────────────────
/**
 * Usuario lanza primer proyecto/idea (hace clic en "Empezar Día 1").
 * @param {{ ventureId: string, ideaType: string, userId: string }} props
 */
export function trackVentureLaunched({ ventureId, ideaType, userId }) {
  captureEvent('venture_launched', {
    venture_id: ventureId,
    idea_type: ideaType,
    user_id: userId,
  })
}

// ─── Evento 5: activation_complete ─────────────────────────
/**
 * Usuario activado: 3+ sesiones en 7 días.
 * @param {{ userId: string, daysToActivate: number, plan: string }} props
 */
export function trackActivationComplete({ userId, daysToActivate, plan }) {
  captureEvent('activation_complete', {
    user_id: userId,
    days_to_activate: daysToActivate,
    plan: plan,
  })
}

// ─── Identify: llamar en login/signup ───────────────────────
/**
 * Identifica al usuario en PostHog con propiedades de segmentación.
 * @param {{ userId: string, plan: string, fechaRegistro: string, tipoUsuario: string }} props
 */
export function identifyLanzaloUser({ userId, plan, fechaRegistro, tipoUsuario }) {
  identifyUser(userId, {
    plan,
    fecha_registro: fechaRegistro,
    tipo_usuario: tipoUsuario, // 'founder_humano' | 'agente_autonomo'
  })
}

// ─── Utilidad: tracking de sesiones para activation_complete
const SESSION_KEY = 'lanzalo_sessions'
const ACTIVATION_FIRED_KEY = 'lanzalo_activation_fired'
const ACTIVATION_SESSIONS_NEEDED = 3
const ACTIVATION_WINDOW_DAYS = 7

/**
 * Registra la sesión actual y dispara activation_complete si aplica.
 * Llámalo una vez al iniciar sesión con un usuario autenticado.
 * @param {{ userId: string, plan: string, fechaRegistro: string }} props
 */
export function trackSessionAndCheckActivation({ userId, plan, fechaRegistro }) {
  // No repetir si ya se disparó
  if (localStorage.getItem(ACTIVATION_FIRED_KEY) === userId) return

  const now = Date.now()
  const windowStart = now - ACTIVATION_WINDOW_DAYS * 24 * 60 * 60 * 1000

  // Cargar sesiones previas
  let sessions = []
  try {
    sessions = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]')
  } catch {
    sessions = []
  }

  // Añadir sesión actual (timestamp del inicio del día para deduplicar por día)
  const todayStart = new Date(now).setHours(0, 0, 0, 0)
  if (!sessions.includes(todayStart)) {
    sessions.push(todayStart)
  }

  // Filtrar sesiones dentro de la ventana de 7 días
  const recent = sessions.filter(ts => ts >= windowStart)
  localStorage.setItem(SESSION_KEY, JSON.stringify(recent))

  if (recent.length >= ACTIVATION_SESSIONS_NEEDED) {
    // Calcular días hasta activación
    const firstSession = Math.min(...recent)
    const daysToActivate = Math.round((now - firstSession) / (24 * 60 * 60 * 1000))

    trackActivationComplete({ userId, daysToActivate, plan })
    localStorage.setItem(ACTIVATION_FIRED_KEY, userId)
  }
}
