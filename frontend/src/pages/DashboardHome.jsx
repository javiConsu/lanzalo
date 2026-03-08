/**
 * DashboardHome — Todo en un vistazo (estilo Polsia)
 * Widgets a la izquierda, Chat del Co-Founder a la derecha (altura limitada)
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl, API_URL } from '../api.js'

// ─── Inline Chat (altura limitada, no infinito) ──────────────────
function InlineChat({ companyId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!companyId) return
    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/api/user/companies/${companyId}/chat/history?limit=50`), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        const history = data.messages || []

        if (history.length === 0) {
          setLoading(true)
          try {
            const wr = await fetch(apiUrl(`/api/user/companies/${companyId}/chat/welcome`), {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            })
            const wd = await wr.json()
            if (wd.message && !wd.skipped) {
              setMessages([{ id: Date.now(), role: 'assistant', content: wd.message, created_at: new Date().toISOString() }])
            }
          } catch(e) {}
          finally { setLoading(false) }
        } else {
          setMessages(history)
        }
      } catch(e) {}
    }
    load()
  }, [companyId, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || !companyId) return
    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMessage, created_at: new Date().toISOString() }])

    try {
      const res = await fetch(apiUrl(`/api/user/companies/${companyId}/chat`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await res.json()
      if (data.success) {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.message, created_at: new Date().toISOString() }])
      }
    } catch(e) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: 'Error de conexión. Inténtalo de nuevo.', created_at: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-700/50 bg-gray-900/80 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <span className="text-sm">🧠</span>
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-white">Co-Founder</span>
          <span className="ml-2 text-xs text-gray-500">Tu socio IA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500 text-sm">Tu Co-Founder está listo. ¿Qué necesitas?</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-md'
                : 'bg-gray-800 text-gray-100 border border-gray-700/50 rounded-bl-md'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0.15s'}} />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0.3s'}} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-700/50 bg-gray-900/80 flex-shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe a tu Co-Founder..."
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Tasks Widget ──────────────────────────────────────────
function TasksWidget({ companyId }) {
  const [tasks, setTasks] = useState([])
  const token = localStorage.getItem('token')
  const navigate = useNavigate()

  useEffect(() => {
    if (!companyId) return
    fetch(apiUrl(`/api/user/companies/${companyId}/backlog`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setTasks((d.backlog || []).slice(0, 5)))
      .catch(() => {})
  }, [companyId, token])

  const STATUS_COLORS = {
    todo: 'bg-gray-500',
    in_progress: 'bg-amber-400',
    completed: 'bg-emerald-400',
    failed: 'bg-red-400'
  }
  const TAG_COLORS = {
    code: 'text-blue-400',
    marketing: 'text-pink-400',
    email: 'text-amber-400',
    research: 'text-purple-400',
    data: 'text-cyan-400'
  }

  return (
    <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-xs">📋</span> Tareas
        </span>
        <button onClick={() => navigate('/backlog')} className="text-xs text-gray-500 hover:text-emerald-400 transition-colors">
          Ver todo →
        </button>
      </div>
      <div className="divide-y divide-gray-800/50">
        {tasks.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-gray-500 text-xs">Sin tareas pendientes</p>
          </div>
        ) : tasks.map(task => (
          <div key={task.id} className="px-4 py-2.5 hover:bg-gray-800/30 transition-colors">
            <div className="flex items-start gap-2.5">
              <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_COLORS[task.status] || 'bg-gray-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.tag && (
                    <span className={`text-xs ${TAG_COLORS[task.tag] || 'text-gray-500'}`}>
                      {task.tag}
                    </span>
                  )}
                  {task.priority && task.priority !== 'medium' && (
                    <span className={`text-xs ${task.priority === 'critical' || task.priority === 'high' ? 'text-red-400' : 'text-gray-500'}`}>
                      {task.priority === 'critical' ? '🔴' : task.priority === 'high' ? '🟠' : ''}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-600 flex-shrink-0">
                {task.status === 'in_progress' ? '⏳' : task.status === 'completed' ? '✓' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stats Widget ──────────────────────────────────────────
function StatsWidget({ company }) {
  return (
    <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 p-4">
      <span className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        <span className="text-xs">📊</span> {company?.name || 'Mi negocio'}
      </span>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{company?.status === 'live' ? '🟢' : '🟡'}</div>
          <div className="text-xs text-gray-500 mt-0.5">{company?.status === 'live' ? 'Activo' : 'Construyendo'}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-400">${company?.revenue_total || 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">Revenue</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">7</div>
          <div className="text-xs text-gray-500 mt-0.5">Agentes</div>
        </div>
      </div>
    </div>
  )
}

// ─── Links & Documents Widget (clickable docs) ─────────────
function LinksWidget({ company, companyId }) {
  const [documents, setDocuments] = useState([])
  const [expandedDoc, setExpandedDoc] = useState(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!companyId) return
    fetch(apiUrl(`/api/user/companies/${companyId}/documents`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setDocuments(d.documents || []))
      .catch(() => {})
  }, [companyId, token])

  const subdomain = company?.subdomain

  const DOC_ICONS = {
    research: '📊',
    marketing: '📣',
    code: '💻',
    data: '📈',
    email: '📧'
  }

  return (
    <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/50">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-xs">🔗</span> Links y documentos
        </span>
      </div>
      <div className="p-3 space-y-2">
        {/* User's website — placeholder until validated */}
        {subdomain && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-800/50 rounded-xl">
            <span className="text-sm">🌐</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 truncate">
                {subdomain}.lanzalo.pro
              </p>
              <p className="text-xs text-amber-400/70">Pendiente de validar idea</p>
            </div>
            <span className="text-xs text-gray-600">🔒</span>
          </div>
        )}

        {/* Generated documents from completed tasks — CLICKABLE */}
        {documents.map(doc => (
          <div key={doc.id}>
            <button
              onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors group text-left"
            >
              <span className="text-sm">{DOC_ICONS[doc.tag] || '📄'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 group-hover:text-emerald-400 transition-colors truncate">{doc.title}</p>
                <p className="text-xs text-gray-500">
                  {doc.tag || 'documento'} · {new Date(doc.completed_at || doc.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className={`text-xs text-gray-500 transition-transform ${expandedDoc === doc.id ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {/* Expanded document content */}
            {expandedDoc === doc.id && doc.output && (
              <div className="mt-1 mx-1 p-4 bg-gray-800/80 rounded-xl border border-gray-700/50 max-h-96 overflow-y-auto">
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-xs text-gray-300 leading-relaxed font-sans">{doc.output}</pre>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {!subdomain && documents.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-gray-600 text-xs">Los documentos generados por tus agentes aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Activity Widget ───────────────────────────────────────
function ActivityWidget({ companyId }) {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!companyId) return
    const wsUrl = API_URL
      ? `${API_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      try {
        const activity = JSON.parse(event.data)
        if (!activity.companyId || activity.companyId === companyId) {
          setEvents(prev => [{
            id: Date.now(),
            ...activity,
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          }, ...prev].slice(0, 20))
        }
      } catch(e) {}
    }
    return () => ws.close()
  }, [companyId])

  const ICONS = {
    task_created: '📋', task_started: '⚡', task_completed: '✅', task_failed: '❌',
    ceo_message: '🧠', deploy: '🚀', email_sent: '📧', tweet_posted: '🐦'
  }

  return (
    <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-xs">⚡</span> Actividad
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className={`text-xs ${connected ? 'text-emerald-400' : 'text-gray-600'}`}>
            {connected ? 'Live' : '...'}
          </span>
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-gray-800/50">
        {events.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-gray-600 text-xs">Esperando actividad de los agentes...</p>
          </div>
        ) : events.map(event => (
          <div key={event.id} className="px-4 py-2 flex items-center gap-2">
            <span className="text-xs">{ICONS[event.type] || '⚡'}</span>
            <span className="text-xs text-gray-300 flex-1 truncate">{event.message || event.type}</span>
            <span className="text-xs text-gray-600 flex-shrink-0">{event.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Company Selector ──────────────────────────────────────
function CompanySelector({ companies, selected, onSelect, onCreateNew }) {
  const [open, setOpen] = useState(false)

  if (companies.length <= 1 && !onCreateNew) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <span className="text-sm font-medium text-white truncate max-w-[150px]">{selected?.name}</span>
        <span className={`text-xs text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700/50 transition-colors flex items-center gap-2 ${
                c.id === selected?.id ? 'text-emerald-400 bg-gray-700/30' : 'text-gray-300'
              }`}
            >
              <span className="text-xs">{c.status === 'live' ? '🟢' : '🟡'}</span>
              <span className="truncate">{c.name}</span>
            </button>
          ))}
          <button
            onClick={() => { onCreateNew(); setOpen(false) }}
            className="w-full text-left px-4 py-2.5 text-sm text-emerald-400 hover:bg-gray-700/50 transition-colors border-t border-gray-700 flex items-center gap-2"
          >
            <span className="text-xs">+</span>
            <span>Crear nuevo negocio</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main DashboardHome ────────────────────────────────────
export default function DashboardHome() {
  const [companies, setCompanies] = useState([])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        const list = d.companies || []
        setCompanies(list)
        if (list[0]) setCompany(list[0])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No companies yet — nudge to onboarding
  if (!company) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Lanza tu primer negocio</h2>
          <p className="text-gray-400 text-sm mb-6">
            Describe tu idea y tu Co-Founder se encarga del resto.
          </p>
          <button
            onClick={() => navigate('/onboarding/choose-path')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-6 rounded-xl transition-colors text-sm"
          >
            Empezar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Company selector header */}
      {companies.length > 0 && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
          <CompanySelector
            companies={companies}
            selected={company}
            onSelect={setCompany}
            onCreateNew={() => navigate('/onboarding/describe-idea')}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Left: Widgets (40%) */}
        <div className="lg:w-2/5 flex flex-col gap-3 overflow-y-auto min-h-0">
          <ActivityWidget companyId={company.id} />
          <TasksWidget companyId={company.id} />
          <LinksWidget company={company} companyId={company.id} />
          <StatsWidget company={company} />
        </div>

        {/* Right: Chat (60%) — limited height */}
        <div className="flex-1 lg:w-3/5 min-h-0">
          <InlineChat companyId={company.id} />
        </div>
      </div>
    </div>
  )
}
