import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
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
  task_started: 'Tarea iniciada',
  task_created: 'Tarea creada',
  task_completed: 'Tarea completada',
  task_failed: 'Error en tarea',
  ceo_message: 'Mensaje Co-Founder',
  agent_action: 'Acción de agente',
  deploy: 'Deploy realizado',
  email_sent: 'Email enviado',
  tweet_posted: 'Tweet publicado',
  decision: 'Decisión tomada',
  analysis: 'Análisis completado',
  waitlist_signup: 'Nuevo lead en waitlist',
  email_pro_activated: 'Email Pro activado',
}

const TYPE_BADGE = {
  task_completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  task_failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  deploy: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  email_sent: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  tweet_posted: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  decision: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  waitlist_signup: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  task_started: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  analysis: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const EVENT_ICONS = {
  task_started: '⚡',
  task_created: '📋',
  task_completed: '✅',
  task_failed: '❌',
  deploy: '🚀',
  email_sent: '📧',
  tweet_posted: '🐦',
  decision: '🧠',
  analysis: '🔍',
  waitlist_signup: '📋',
  ceo_message: '💬',
  agent_action: '⚡',
}

function normalizeEvent(raw) {
  return {
    id: raw.id || Date.now() + Math.random(),
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

function formatTimestamp(ts) {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    const now = new Date()
    const diffSec = Math.floor((now - d) / 1000)
    if (diffSec < 60) return `hace ${diffSec}s`
    if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)}min`
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function LiveFeedPage() {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const [companies, setCompanies] = useState([])
  const [filterCompany, setFilterCompany] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [filterType, setFilterType] = useState('')
  const [loading, setLoading] = useState(true)
  const wsRef = useRef(null)

  // Cargar empresas del usuario
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.companies) {
          setCompanies(data.companies)
          // Usar la primera empresa por defecto
          if (data.companies.length > 0 && !filterCompany) {
            setFilterCompany(data.companies[0].id)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Cargar historial cuando cambian los filtros
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || !filterCompany) return

    setLoading(true)
    const params = new URLSearchParams({ companyId: filterCompany, limit: '100' })
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
      .finally(() => setLoading(false))
  }, [filterCompany, filterAgent, filterType])

  // WebSocket para nuevos eventos en tiempo real
  useEffect(() => {
    if (!filterCompany) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = API_URL
      ? `${API_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`
      : `${protocol}//${window.location.host}/ws`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data)
        const event = normalizeEvent(raw)

        // Filtrar por empresa
        if (event.companyId && event.companyId !== filterCompany) return
        // Filtrar por agente
        if (filterAgent && event.agentType !== filterAgent) return
        // Filtrar por tipo
        if (filterType && event.type !== filterType) return

        setEvents(prev => [event, ...prev].slice(0, 100))
      } catch {}
    }

    return () => ws.close()
  }, [filterCompany, filterAgent, filterType])

  const activeCompany = companies.find(c => c.id === filterCompany)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              ← Dashboard
            </Link>
            <div className="w-px h-5 bg-gray-700" />
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h1 className="text-lg font-bold text-white">Live Activity Feed</h1>
              {connected ? (
                <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/20">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  En vivo
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-700/50 px-2.5 py-1 rounded-full border border-gray-600/20">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                  Reconectando
                </span>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-500">{events.length} eventos cargados</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Filtros */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
          <span className="text-sm text-gray-400 font-medium mr-1">Filtrar:</span>

          {/* Filtro empresa */}
          {companies.length > 1 && (
            <select
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
              className="text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 min-w-40"
            >
              <option value="">Todas las ventures</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Filtro agente */}
          <select
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
            className="text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
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

          {/* Filtro tipo de evento */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los eventos</option>
            <option value="task_started">⚡ Tareas iniciadas</option>
            <option value="task_completed">✅ Tareas completadas</option>
            <option value="task_failed">❌ Errores</option>
            <option value="deploy">🚀 Deploys</option>
            <option value="email_sent">📧 Emails enviados</option>
            <option value="tweet_posted">🐦 Tweets publicados</option>
            <option value="decision">🧠 Decisiones</option>
            <option value="analysis">🔍 Análisis</option>
            <option value="waitlist_signup">📋 Leads captados</option>
          </select>

          {/* Limpiar filtros */}
          {(filterAgent || filterType) && (
            <button
              onClick={() => { setFilterAgent(''); setFilterType('') }}
              className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 hover:border-gray-500"
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Título venture activa */}
        {activeCompany && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-400">Venture:</span>
            <span className="text-sm font-semibold text-white bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
              🏢 {activeCompany.name}
            </span>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-400 text-sm">Cargando actividad...</p>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center py-20 border border-gray-700/50 rounded-xl bg-gray-800/20">
            <div className="text-center">
              <span className="text-4xl mb-4 block">🔇</span>
              <p className="text-gray-400 font-medium">Sin actividad reciente</p>
              <p className="text-gray-500 text-sm mt-1">Los agentes publicarán eventos aquí cuando trabajen</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => (
              <EventCard key={`${event.id}-${i}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EventCard({ event }) {
  const badgeClass = TYPE_BADGE[event.type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  const eventIcon = EVENT_ICONS[event.type] || '⚡'
  const agentIcon = AGENT_ICONS[event.agentType] || '🤖'

  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl px-5 py-4 hover:bg-gray-800/60 hover:border-gray-600/50 transition-all group">
      <div className="flex items-start gap-4">
        {/* Icono agente */}
        <div className="w-9 h-9 bg-gray-700/80 rounded-xl flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-105 transition-transform">
          {agentIcon}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeClass}`}>
              {eventIcon} {TYPE_LABELS[event.type] || event.type}
            </span>
            {event.agentType && (
              <span className="text-xs text-gray-500">
                {AGENT_ICONS[event.agentType]} {event.agentType}
              </span>
            )}
            {event.companyName && (
              <span className="text-xs text-gray-600">• {event.companyName}</span>
            )}
            <span className="text-xs text-gray-600 ml-auto">{formatTimestamp(event.timestamp)}</span>
          </div>

          {event.message && (
            <p className="text-sm text-gray-200 mt-2 leading-relaxed">{event.message}</p>
          )}

          {event.taskTitle && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-gray-500">📋</span>
              <span className="text-xs text-gray-500 truncate">{event.taskTitle}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
