/**
 * DashboardHome — Rediseño Polsia-style
 * Layout: TerminalLog | 3 columnas (stats+agents | tasks+docs | chat)
 * Tipografía: IBM Plex Mono para datos, sans-serif limpia para texto
 * Sin emojis, sin iconos de colores, sin badges
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiUrl, API_URL } from '../api.js'
import useCompanySelection from '../hooks/useCompanySelection.js'

// ─── Terminal Log ────────────────────────────────────────────────
// Barra estrecha arriba, fondo negro, texto verde, eventos en tiempo real
function TerminalLog({ companyId }) {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const scrollRef = useRef(null)
  const token = localStorage.getItem('token')

  // Cargar historial reciente
  useEffect(() => {
    if (!companyId || !token) return
    const params = new URLSearchParams({ companyId, limit: '10' })
    fetch(apiUrl(`/api/activity?${params}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.events?.length) {
          setEvents(d.events.slice(0, 10).reverse())
        }
      })
      .catch(() => {})
  }, [companyId, token])

  // WebSocket en tiempo real
  useEffect(() => {
    if (!companyId) return
    const wsUrl = API_URL
      ? `${API_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data)
        if (raw.companyId && raw.companyId !== companyId) return
        const msg = raw.message || raw.type || 'actividad'
        const agent = raw.agentType || raw.agent_type || 'sys'
        const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setEvents(prev => [...prev, { id: Date.now(), agent, msg, time }].slice(-20))
      } catch(e) {}
    }
    return () => ws.close()
  }, [companyId])

  // Auto-scroll al último evento
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [events])

  const latest = events[events.length - 1]

  return (
    <div className="h-8 bg-black border-b border-[#21262d] flex items-center px-3 gap-3 flex-shrink-0 overflow-hidden">
      <span className="text-[10px] font-mono text-[#00ff87] flex-shrink-0 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#00ff87] animate-pulse' : 'bg-[#484f58]'}`} />
        {connected ? 'live' : 'off'}
      </span>
      <span className="text-[10px] font-mono text-[#30363d] flex-shrink-0">|</span>
      <div ref={scrollRef} className="flex-1 overflow-hidden">
        {latest ? (
          <span className="text-[10px] font-mono text-[#00ff87] whitespace-nowrap">
            <span className="text-[#484f58]">{latest.time}</span>
            <span className="text-[#8b949e] mx-1">{latest.agent}</span>
            <span className="text-[#6b737b]">{'>'}</span>
            <span className="ml-1">{latest.msg}</span>
          </span>
        ) : (
          <span className="text-[10px] font-mono text-[#484f58] whitespace-nowrap">
            {'> esperando actividad...'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Business Stats ──────────────────────────────────────────────
function BusinessStats({ company }) {
  const isLive = company?.status === 'live'
  const revenue = company?.revenue_total || 0
  const balance = company?.balance || 0
  const visits = company?.visits_total || 0
  const investment = (company?.cost_lanzalo || 0) + (company?.cost_cold_email || 0) + (company?.cost_ads || 0)

  return (
    <div className="space-y-2">
      {/* Estado negocio */}
      <div className="flex items-center justify-between py-1">
        <span className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider">estado</span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${
          isLive
            ? 'text-[#00ff87] border-[#00ff87]/20 bg-[#00ff87]/5'
            : 'text-[#d29922] border-[#d29922]/20 bg-[#d29922]/5'
        }`}>{isLive ? 'live' : 'building'}</span>
      </div>

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-1.5">
        <StatCard label="ingresos" value={`$${revenue}`} color="text-[#00ff87]" />
        <StatCard label="balance" value={`$${balance}`} color="text-[#c9d1d9]" />
        <StatCard label="visitas" value={visits} color="text-[#58a6ff]" />
        <StatCard label="inversión" value={`$${investment}`} color="text-[#d29922]" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] px-2.5 py-2">
      <div className="text-[9px] font-mono text-[#484f58] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-mono font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

// ─── Agent Status ────────────────────────────────────────────────
const AGENTS = [
  { key: 'ceo', name: 'bender', tags: ['ceo', 'strategy'] },
  { key: 'marketing', name: 'marketing', tags: ['marketing', 'copy', 'ads'] },
  { key: 'code', name: 'codigo', tags: ['code', 'deploy', 'web'] },
  { key: 'email', name: 'email', tags: ['email', 'drip'] },
  { key: 'analytics', name: 'analytics', tags: ['analytics', 'data'] },
  { key: 'finance', name: 'finanzas', tags: ['finance', 'financial'] },
]

function AgentStatus({ companyId }) {
  const [states, setStates] = useState({})
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!companyId) return
    fetch(apiUrl(`/api/user/companies/${companyId}/backlog`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        const tasks = d.backlog || []
        const s = {}
        AGENTS.forEach(a => {
          const rel = tasks.filter(t =>
            a.tags.some(tag => (t.tag || '').toLowerCase().includes(tag) || (t.title || '').toLowerCase().includes(tag))
          )
          const active = rel.find(t => t.status === 'in_progress')
          const done = rel.filter(t => t.status === 'completed').length
          s[a.key] = active
            ? { status: 'working', task: active.title }
            : done > 0
              ? { status: 'idle', task: `${done} completada${done > 1 ? 's' : ''}` }
              : { status: 'standby', task: null }
        })
        setStates(s)
      })
      .catch(() => {})
  }, [companyId, token])

  return (
    <div className="bg-[#0d1117] border border-[#21262d]">
      <div className="px-3 py-2 border-b border-[#21262d]">
        <span className="text-[9px] font-mono text-[#484f58] uppercase tracking-wider">agentes</span>
      </div>
      <div className="divide-y divide-[#21262d]">
        {AGENTS.map(a => {
          const st = states[a.key] || { status: 'standby', task: null }
          const dotClass = st.status === 'working'
            ? 'bg-[#00ff87] animate-pulse'
            : st.status === 'idle'
              ? 'bg-[#8b949e]'
              : 'bg-[#21262d]'
          const textClass = st.status === 'working'
            ? 'text-[#00ff87]'
            : st.status === 'idle'
              ? 'text-[#8b949e]'
              : 'text-[#484f58]'
          return (
            <div key={a.key} className="flex items-center gap-2 px-3 py-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
              <span className="text-[10px] font-mono text-[#8b949e] flex-shrink-0 w-20">{a.name}</span>
              <span className={`text-[9px] font-mono flex-1 truncate ${textClass}`}>
                {st.task || st.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tasks Widget ────────────────────────────────────────────────
function Tasks({ companyId }) {
  const [tasks, setTasks] = useState([])
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!companyId) return
    fetch(apiUrl(`/api/user/companies/${companyId}/backlog`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setTasks((d.backlog || []).slice(0, 6)))
      .catch(() => {})
  }, [companyId, token])

  const done = tasks.filter(t => t.status === 'completed').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  const dotColor = {
    todo: 'bg-[#484f58]',
    in_progress: 'bg-[#d29922]',
    completed: 'bg-[#00ff87]',
    failed: 'bg-[#f85149]'
  }

  return (
    <div className="bg-[#0d1117] border border-[#21262d]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]">
        <span className="text-[9px] font-mono text-[#484f58] uppercase tracking-wider">tareas</span>
        <button onClick={() => navigate('/backlog')} className="text-[9px] font-mono text-[#484f58] hover:text-[#58a6ff] transition-colors">
          ver todo
        </button>
      </div>
      {tasks.length > 0 && (
        <div className="px-3 py-2 border-b border-[#21262d] flex items-center gap-3">
          <div className="flex-1 h-0.5 bg-[#21262d]">
            <div className="h-full bg-[#00ff87] transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[9px] font-mono text-[#00ff87] tabular-nums flex-shrink-0">{pct}%</span>
          {inProgress > 0 && <span className="text-[9px] font-mono text-[#d29922] flex-shrink-0">{inProgress} activa{inProgress > 1 ? 's' : ''}</span>}
        </div>
      )}
      <div className="divide-y divide-[#21262d]">
        {tasks.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <span className="text-[10px] font-mono text-[#484f58]">sin tareas activas</span>
          </div>
        ) : tasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 px-3 py-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[t.status] || 'bg-[#484f58]'}`} />
            <span className="text-[11px] text-[#c9d1d9] flex-1 truncate">{t.title}</span>
            {t.tag && <span className="text-[9px] font-mono text-[#484f58] flex-shrink-0">{t.tag}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Documents & Links ───────────────────────────────────────────
function DocsLinks({ company, companyId }) {
  const [documents, setDocuments] = useState([])
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [landing, setLanding] = useState(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!companyId) return
    fetch(apiUrl(`/api/user/companies/${companyId}/documents`), {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(d => setDocuments(d.documents || [])).catch(() => {})

    fetch(apiUrl(`/api/user/companies/${companyId}/landing`), {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(d => setLanding(d)).catch(() => {})
  }, [companyId, token])

  const subdomain = company?.subdomain

  return (
    <div className="bg-[#0d1117] border border-[#21262d]">
      <div className="px-3 py-2 border-b border-[#21262d]">
        <span className="text-[9px] font-mono text-[#484f58] uppercase tracking-wider">web / docs</span>
      </div>
      <div className="divide-y divide-[#21262d]">
        {subdomain && (landing?.deployed ? (
          <a
            href={landing.url || company?.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 hover:bg-[#161b22] transition-colors group"
          >
            <span className="text-[10px] font-mono text-[#00ff87] flex-shrink-0">↗</span>
            <span className="text-[10px] font-mono text-[#00ff87] group-hover:text-[#00ff87]/80 flex-1 truncate">
              {subdomain}.lanzalo.pro
            </span>
            {landing.waitlistCount > 0 && (
              <span className="text-[9px] font-mono text-[#484f58] flex-shrink-0">{landing.waitlistCount} leads</span>
            )}
          </a>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-[10px] font-mono text-[#484f58] flex-shrink-0">○</span>
            <span className="text-[10px] font-mono text-[#8b949e] flex-1 truncate">{subdomain}.lanzalo.pro</span>
            <span className="text-[9px] font-mono text-[#d29922]/70 flex-shrink-0">pendiente</span>
          </div>
        ))}

        {documents.map(doc => (
          <div key={doc.id}>
            <button
              onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#161b22] transition-colors text-left"
            >
              <span className="text-[10px] font-mono text-[#484f58] flex-shrink-0">◈</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#c9d1d9] truncate">{doc.title}</p>
                <p className="text-[9px] font-mono text-[#484f58]">
                  {doc.tag || 'doc'} · {new Date(doc.completed_at || doc.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className={`text-[9px] text-[#484f58] transition-transform flex-shrink-0 ${expandedDoc === doc.id ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {expandedDoc === doc.id && doc.output && (
              <div className="mx-2 mb-2 p-2.5 bg-[#0a0e14] border border-[#21262d] max-h-48 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-[10px] text-[#8b949e] leading-relaxed font-mono">{doc.output}</pre>
              </div>
            )}
          </div>
        ))}

        {!subdomain && documents.length === 0 && (
          <div className="px-3 py-4 text-center">
            <span className="text-[10px] font-mono text-[#484f58]">sin documentos</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline Chat ─────────────────────────────────────────────────
function Chat({ companyId, initialMessage }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialSent, setInitialSent] = useState(false)
  const bottomRef = useRef(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!companyId) return
    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/api/user/companies/${companyId}/chat/history?limit=20`), {
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text) => {
    if (!text?.trim() || !companyId) return
    setLoading(true)
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: text, created_at: new Date().toISOString() }])
    try {
      const res = await fetch(apiUrl(`/api/user/companies/${companyId}/chat`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      if (data.success) {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.message, created_at: new Date().toISOString() }])
      }
    } catch(e) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: 'Error de conexión.', created_at: new Date().toISOString() }])
    } finally { setLoading(false) }
  }, [companyId, token])

  useEffect(() => {
    if (initialMessage && companyId && !initialSent && messages.length > 0) {
      setInitialSent(true)
      send(initialMessage)
    }
  }, [initialMessage, companyId, initialSent, messages.length, send])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const msg = input.trim()
    setInput('')
    send(msg)
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] border border-[#21262d] overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] flex-shrink-0">
        <span className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider">bender</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#00ff87] rounded-full animate-pulse" />
          <span className="text-[9px] font-mono text-[#00ff87]">online</span>
        </span>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="py-8 text-center">
            <span className="text-[10px] font-mono text-[#484f58]">{'> Hola, soy Bender, tu Co-Fundador IA. Vamos a construir algo grande.'}</span>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-[#1f6feb]/20 text-[#c9d1d9] border border-[#1f6feb]/30'
                : 'bg-[#161b22] text-[#c9d1d9] border border-[#21262d]'
            }`}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#161b22] border border-[#21262d] px-3 py-2">
              <div className="flex gap-1 items-center">
                <span className="text-[9px] font-mono text-[#484f58]">procesando</span>
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} className="w-1 h-1 bg-[#484f58] rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-[#21262d] flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribe a tu bender..."
          className="flex-1 px-3 py-1.5 bg-[#0a0e14] border border-[#30363d] text-xs text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#484f58] transition-colors"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-30 disabled:cursor-not-allowed text-[#c9d1d9] text-[10px] font-mono transition-colors border border-[#30363d]"
        >
          enviar
        </button>
      </form>
    </div>
  )
}

// ─── Company Selector ────────────────────────────────────────────
function CompanySelector({ companies, selected, onSelect, onCreateNew, slotsAvailable }) {
  const [open, setOpen] = useState(false)
  if (companies.length <= 1 && !onCreateNew) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 border border-[#30363d] hover:border-[#8b949e] transition-colors"
      >
        <span className="text-[10px] font-mono text-[#8b949e] truncate max-w-[120px]">{selected?.name}</span>
        <span className={`text-[9px] font-mono text-[#484f58] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-[#161b22] border border-[#30363d] shadow-2xl z-50">
          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-[#21262d] transition-colors flex items-center gap-2 ${
                c.id === selected?.id ? 'text-[#00ff87]' : 'text-[#8b949e]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'live' ? 'bg-[#00ff87]' : 'bg-[#d29922]'}`} />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
          <div className="border-t border-[#21262d]">
            {slotsAvailable > 0 ? (
              <button
                onClick={() => { onCreateNew(); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-[10px] font-mono text-[#58a6ff] hover:bg-[#21262d] transition-colors"
              >
                + nuevo negocio
              </button>
            ) : (
              <div className="px-3 py-2 text-[10px] font-mono text-[#484f58]">sin slots disponibles</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main DashboardHome ──────────────────────────────────────────
export default function DashboardHome() {
  const { companies, selectedCompany: company, selectCompany, loadingCompanies: loading } = useCompanySelection()
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) return
    fetch(apiUrl('/api/user/profile'), { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUserProfile(d.user || null))
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (companies.length === 0) return
    let feedbackParam = searchParams.get('feedback')
    let companyParam = searchParams.get('company')
    if (!feedbackParam) {
      try {
        const pending = JSON.parse(localStorage.getItem('pendingFeedback'))
        if (pending?.feedback && pending?.company) {
          feedbackParam = pending.feedback
          companyParam = pending.company
          localStorage.removeItem('pendingFeedback')
        }
      } catch(e) {}
    }
    if (feedbackParam === 'web' && companyParam) {
      const target = companies.find(c => c.id === companyParam)
      if (target) { selectCompany(target.id); setFeedbackMessage('Quiero ajustar cosas de la web') }
      setSearchParams({})
    }
  }, [companies])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-4 h-4 border border-[#30363d] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-xs">
          <p className="font-mono text-[10px] text-[#484f58] mb-6">{'> lanzalo init'}</p>
          <h2 className="text-base font-semibold text-white mb-2">Lanza tu primer negocio</h2>
          <p className="text-[#8b949e] text-xs mb-6 font-mono">describe la idea — el bender hace el resto.</p>
          <button
            onClick={() => navigate('/onboarding/choose-path')}
            className="bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] font-mono text-xs py-2 px-5 border border-[#30363d] transition-colors"
          >
            empezar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Terminal log — barra estrecha en tiempo real */}
      <TerminalLog companyId={company.id} />

      {/* Sub-header: nombre negocio + selector */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#21262d] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${company.status === 'live' ? 'bg-[#00ff87] animate-pulse' : 'bg-[#d29922]'}`} />
          <span className="text-sm font-medium text-white">{company.name}</span>
        </div>
        {companies.length > 0 && (
          <CompanySelector
            companies={companies}
            selected={company}
            onSelect={(c) => selectCompany(c.id)}
            onCreateNew={() => navigate('/onboarding/describe-idea')}
            slotsAvailable={userProfile?.slotsAvailable ?? 1}
          />
        )}
      </div>

      {/* 3 columnas */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* COL IZQUIERDA — 25%: stats + agentes */}
        <div className="lg:w-[25%] border-r border-[#21262d] flex flex-col overflow-y-auto">
          <div className="p-3 space-y-3">
            <BusinessStats company={company} />
            <AgentStatus companyId={company.id} />
          </div>
        </div>

        {/* COL CENTRAL — 40%: tareas + docs/links */}
        <div className="lg:w-[40%] border-r border-[#21262d] flex flex-col overflow-y-auto">
          <div className="p-3 space-y-3">
            <Tasks companyId={company.id} />
            <DocsLinks company={company} companyId={company.id} />
          </div>
        </div>

        {/* COL DERECHA — 35%: chat */}
        <div className="flex-1 lg:w-[35%] flex flex-col overflow-hidden p-3 min-h-[400px] lg:min-h-0">
          <Chat companyId={company.id} initialMessage={feedbackMessage} />
        </div>

      </div>
    </div>
  )
}
