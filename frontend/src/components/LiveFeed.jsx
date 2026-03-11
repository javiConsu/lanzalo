import { useState, useEffect, useRef } from 'react'
import { API_URL, apiUrl } from '../api.js'

const AGENT_ICONS = {
  code: '💻',
  marketing: '📢',
  email: '📧',
  twitter: '🐦',
  data: '📊',
  research: '🔍',
  trends: '🎯',
  browser: '🌐',
  ceo: '🧠',
  cofounder: '🧠',
  system: '⚙️'
}

const TYPE_LABELS = {
  task_started: '⚡ Iniciando',
  task_created: 'Tarea creada',
  task_completed: '✅ Completada',
  task_failed: '❌ Error',
  ceo_message: 'Co-Founder',
  agent_action: 'Agente',
  deploy: '🚀 Deploy',
  email_sent: '📧 Email enviado',
  tweet_posted: '🐦 Tweet publicado',
  decision: '🧠 Decisión',
  analysis: '🔍 Análisis',
  waitlist_signup: '📋 Nuevo lead',
  email_pro_activated: '📬 Email Pro',
}

const TYPE_COLORS = {
  task_completed: 'text-green-400',
  task_failed: 'text-red-400',
  deploy: 'text-purple-400',
  email_sent: 'text-yellow-400',
  tweet_posted: 'text-sky-400',
  decision: 'text-orange-400',
  waitlist_signup: 'text-emerald-400',
  task_started: 'text-blue-400',
}

/**
 * Normaliza un evento que puede venir de WebSocket (formato DB snake_case)
 * o de la API REST (formato camelCase).
 */
function normalizeEvent(raw) {
  return {
    id: raw.id || Date.now(),
    companyId: raw.companyId || raw.company_id,
    companyName: raw.companyName || raw.company_name,
    taskId: raw.taskId || raw.task_id,
    taskTitle: raw.taskTitle || raw.task_title,
    agentType: raw.agentType || raw.agent_type,
    type: raw.type || raw.activity_type || 'agent_action',
    message: raw.message,
    metadata: raw.metadata,
    timestamp: raw.timestamp || raw.created_at,
  }
}

/**
 * LiveFeed — componente de feed en tiempo real de actividad de agentes.
 *
 * Props:
 *   companyId   — UUID de la empresa activa (requerido)
 *   maxHeight   — altura máxima del feed (default "16rem")
 *   showFilters — mostrar controles de filtro (default false)
 *   compact     — modo compacto para sidebar (default true)
 */
export default function LiveFeed({ companyId, maxHeight = '16rem', showFilters = false, compact = true }) {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const [filterAgent, setFilterAgent] = useState('')
  const [filterType, setFilterType] = useState('')
  const wsRef = useRef(null)
  const feedRef = useRef(null)

  // Cargar historial al montar
  useEffect(() => {
    if (!companyId) return

    const token = localStorage.getItem('token')
    if (!token) return

    const params = new URLSearchParams({ companyId, limit: '50' })
    if (filterAgent) params.set('agentType', filterAgent)
    if (filterType) params.set('eventType', filterType)

    fetch(apiUrl(`/api/activity?${params}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.events) {
          setEvents(data.events.map(normalizeEvent))
        }
      })
      .catch(() => {})
  }, [companyId, filterAgent, filterType])

  // Conexión WebSocket para eventos en tiempo real
  useEffect(() => {
    if (!companyId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = API_URL
      ? `${API_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`
      : `${protocol}//${window.location.host}/ws`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data)
        const normalized = normalizeEvent(raw)

        // Filtrar por empresa
        if (normalized.companyId && normalized.companyId !== companyId) return

        // Aplicar filtros activos
        if (filterAgent && normalized.agentType !== filterAgent) return
        if (filterType && normalized.type !== filterType) return

        setEvents(prev => [normalized, ...prev].slice(0, 50))
      } catch (e) {}
    }

    return () => ws.close()
  }, [companyId, filterAgent, filterType])

  // Auto-scroll al primer evento (más reciente arriba)
  useEffect(() => {
    if (feedRef.current && events.length > 0) {
      feedRef.current.scrollTop = 0
    }
  }, [events.length])

  if (!companyId) return null

  const visibleEvents = events.slice(0, compact ? 30 : 50)

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Feed en vivo</span>
          {connected ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              En vivo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
              Reconectando
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{events.length} eventos</span>
      </div>

      {/* Filtros (solo si showFilters=true) */}
      {showFilters && (
        <div className="flex gap-2 px-4 py-2 border-b border-gray-700 bg-gray-800/50">
          <select
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
            className="flex-1 text-xs bg-gray-700 border border-gray-600 text-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los agentes</option>
            <option value="ceo">🧠 Co-Founder</option>
            <option value="code">💻 Engineer</option>
            <option value="marketing">📢 Marketing</option>
            <option value="email">📧 Email</option>
            <option value="twitter">🐦 Social</option>
            <option value="data">📊 Data</option>
            <option value="research">🔍 Research</option>
            <option value="trends">🎯 Trends</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="flex-1 text-xs bg-gray-700 border border-gray-600 text-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los eventos</option>
            <option value="task_started">⚡ Iniciadas</option>
            <option value="task_completed">✅ Completadas</option>
            <option value="task_failed">❌ Fallidas</option>
            <option value="deploy">🚀 Deploys</option>
            <option value="email_sent">📧 Emails</option>
            <option value="tweet_posted">🐦 Tweets</option>
            <option value="decision">🧠 Decisiones</option>
            <option value="waitlist_signup">📋 Leads</option>
          </select>
        </div>
      )}

      {/* Events */}
      <div ref={feedRef} className="overflow-y-auto" style={{ maxHeight }}>
        {visibleEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-gray-500 text-sm">Esperando actividad...</p>
              <p className="text-gray-600 text-xs mt-1">Los agentes aparecerán aquí</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {visibleEvents.map(event => (
              <div key={event.id} className="px-4 py-2.5 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5 flex-shrink-0">
                    {AGENT_ICONS[event.agentType] || '⚡'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${TYPE_COLORS[event.type] || 'text-gray-400'}`}>
                        {TYPE_LABELS[event.type] || event.type || 'Actividad'}
                      </span>
                      <span className="text-xs text-gray-600">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    {event.message && (
                      <p className={`text-sm text-gray-300 mt-0.5 ${compact ? 'truncate' : 'line-clamp-2'}`}>
                        {event.message}
                      </p>
                    )}
                    {event.taskTitle && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">📋 {event.taskTitle}</p>
                    )}
                    {!compact && event.companyName && (
                      <p className="text-xs text-gray-600 mt-0.5">🏢 {event.companyName}</p>
                    )}
                  </div>
                  {event.type === 'task_completed' && (
                    <span className="text-green-400 text-xs flex-shrink-0">✓</span>
                  )}
                  {event.type === 'task_failed' && (
                    <span className="text-red-400 text-xs flex-shrink-0">✗</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}
