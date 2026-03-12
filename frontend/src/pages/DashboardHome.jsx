/**
 * DashboardHome — Rediseño limpio
 * Layout: TerminalLog | StatsBar | 2 columnas (info | chat)
 * Texto legible, chat limitado, créditos visibles
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiUrl, API_URL } from '../api.js'
import useCompanySelection from '../hooks/useCompanySelection.js'

// ─── Terminal Log ───
function TerminalLog({ companyId }) {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const scrollRef = useRef(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!companyId || !token) return
    const params = new URLSearchParams({ companyId, limit: '10' })
    fetch(apiUrl(`/api/activity?${params}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (d.events?.length) setEvents(d.events.slice(0, 10).reverse()) })
      .catch(() => {})
  }, [companyId, token])

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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [events])

  const latest = events[events.length - 1]
  return (
    <div className="h-7 flex items-center gap-2 px-4 bg-[#0a0e14] border-b border-[#21262d] text-[10px] font-mono overflow-hidden flex-shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-[#00ff87]' : 'bg-[#484f58]'}`} />
      <span className="text-[#484f58] flex-shrink-0">{connected ? 'en vivo' : 'desconectado'}</span>
      <span className="text-[#30363d] flex-shrink-0">|</span>
      {latest ? (
        <span ref={scrollRef} className="text-[#8b949e] truncate">
          <span className="text-[#484f58]">{latest.time}</span>
          {' '}<span className="text-[#58a6ff]">{latest.agent}</span>
          {' '}<span className="text-[#30363d]">{'>'}</span>
          {' '}{latest.msg}
        </span>
      ) : (
        <span className="text-[#484f58]">{'> conectado, esperando actividad...'}</span>
      )}
    </div>
  )
}

// ─── Stats Bar (horizontal, compacta) ───
function StatsBar({ company, credits }) {
  const isLive = company?.status === 'live'
    const revenue = Number(company?.revenue_total) || 0
  const balance = Number(company?.balance) || 0
  const visits = Number(company?.visits_total) || 0
  const investment = (Number(company?.cost_lanzalo) || 0) + (Number(company?.cost_cold_email) || 0) + (Number(company?.cost_ads) || 0)
  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-[#0d1117] border-b border-[#21262d] text-[10px] font-mono overflow-x-auto flex-shrink-0">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#00ff87] animate-pulse' : 'bg-[#d29922]'}`} />
        <span className="text-[#8b949e]">Estadísticas</span>
      </div>
      <span className="text-[#21262d]">|</span>
      <div className="flex items-center gap-1">
        <span className="text-[#8b949e]">ingresos</span>
        <span className="text-[#c9d1d9]">${revenue.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[#8b949e]">balance</span>
        <span className="text-[#c9d1d9]">${balance}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[#8b949e]">visitas</span>
        <span className="text-[#c9d1d9]">{visits}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[#8b949e]">inversión</span>
        <span className="text-[#c9d1d9]">${investment}</span>
      </div>
      <span className="text-[#21262d]">|</span>
      <div className="flex items-center gap-1">
        <span className="text-[#8b949e]">créditos</span>
        <span className="text-[#58a6ff] font-semibold">{credits ?? '...'}</span>
      </div>
    </div>
  )
}

// ─── Agent Status ───
const AGENTS = [
  { key: 'ceo', name: 'Bender', role: 'CEO', tags: ['ceo', 'strategy'] },
  { key: 'marketing', name: 'Luna', role: 'Marketing', tags: ['marketing', 'copy', 'ads'] },
  { key: 'code', name: 'Dev', role: 'Código', tags: ['code', 'deploy', 'web'] },
  { key: 'email', name: 'Nora', role: 'Email', tags: ['email', 'drip'] },
  { key: 'analytics', name: 'Data', role: 'Analytics', tags: ['analytics', 'data'] },
  { key: 'finance', name: 'Rex', role: 'Finanzas', tags: ['finance', 'financial'] },
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
            a.tags.some(tag =>
              (t.tag || '').toLowerCase().includes(tag) ||
              (t.title || '').toLowerCase().includes(tag)
            )
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
      }).catch(() => {})
  }, [companyId, token])

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded p-3">
      <h3 className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider mb-2">agentes</h3>
      {AGENTS.map(a => {
        const st = states[a.key] || { status: 'standby', task: null }
        const dotClass = st.status === 'working' ? 'bg-[#00ff87] animate-pulse'
          : st.status === 'idle' ? 'bg-[#8b949e]' : 'bg-[#30363d]'
        return (
          <div key={a.key} className="flex items-center gap-2 py-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                            <span className="text-[11px] w-24 flex flex-col leading-tight"><span className="text-[#c9d1d9] font-semibold">{a.name}</span><span className="text-[9px] text-[#8b949e]">{a.role}</span></span>
            <span className="text-[10px] text-[#8b949e] truncate">{st.task || ({working:'trabajando',idle:'inactivo',standby:'en espera'}[st.status] || st.status)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tasks Widget ───
function Tasks({ companyId }) {
  const [tasks, setTasks] = useState([])
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!companyId) return
    fetch(apiUrl(`/api/user/companies/${companyId}/backlog`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setTasks((d.backlog || []).slice(0, 8)))
      .catch(() => {})
  }, [companyId, token])

  const done = tasks.filter(t => t.status === 'completed').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  const dotColor = {
    todo: 'bg-[#484f58]', in_progress: 'bg-[#d29922]',
    completed: 'bg-[#00ff87]', failed: 'bg-[#f85149]'
  }

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider">tareas</h3>
        {tasks.length > 0 && (
          <span className="text-[10px] font-mono text-[#484f58]">{pct}%</span>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-[11px] text-[#8b949e] italic">Bender está preparando las primeras tareas...</p>
      ) : tasks.map(t => (
        <div key={t.id} className="flex items-center gap-2 py-1">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[t.status] || 'bg-[#484f58]'}`} />
          <span className="text-[11px] text-[#c9d1d9] truncate flex-1">{t.title}</span>
          {t.tag && <span className="text-[9px] text-[#484f58] font-mono">{t.tag}</span>}
        </div>
      ))}
    </div>
  )
}

// ─── Documents & Links ───
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
  if (!subdomain && documents.length === 0) return null

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded p-3">
      <h3 className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider mb-2">web / documentos</h3>
      {subdomain && (landing?.deployed ? (
        <a href={landing.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 py-1 text-[11px] text-[#58a6ff] hover:underline">
          <span>↗</span> {subdomain}.lanzalo.pro
          {landing.waitlistCount > 0 && (
            <span className="text-[9px] bg-[#21262d] text-[#8b949e] px-1.5 py-0.5 rounded">{landing.waitlistCount} registros</span>
          )}
        </a>
      ) : (
        <div className="flex items-center gap-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#484f58]" />
          <span className="text-[11px] text-[#8b949e]">{subdomain}.lanzalo.pro</span>
          <span className="text-[9px] text-[#d29922]">pendiente</span>
        </div>
      ))}
      {documents.map(doc => (
        <div key={doc.id}>
          <button
            onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
            className="w-full flex items-center gap-2 py-1.5 hover:bg-[#161b22] transition-colors text-left rounded"
          >
            <span className="text-[10px] text-[#484f58]">◈</span>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-[#c9d1d9] block truncate">{doc.title}</span>
              <span className="text-[9px] text-[#484f58]">{doc.tag || 'doc'} · {new Date(doc.completed_at || doc.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            </div>
            <span className="text-[9px] text-[#484f58]">▾</span>
          </button>
          {expandedDoc === doc.id && doc.output && (
            <div className="pl-5 pr-2 pb-2 text-[11px] text-[#8b949e] whitespace-pre-wrap max-h-40 overflow-y-auto">{doc.output}</div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Inline Chat (scroll limitado) ───
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
        } else { setMessages(history) }
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
    <div className="bg-[#0d1117] border border-[#21262d] rounded flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] flex-shrink-0">
        <span className="text-[11px] font-mono font-semibold text-[#c9d1d9]">BENDER — CO-FUNDADOR IA</span>
        <span className="flex items-center gap-1 text-[9px] font-mono text-[#00ff87]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87]" /> en línea
        </span>
      </div>
      {/* Messages - scroll limitado */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="text-[12px] text-[#8b949e] italic py-4">
            {'Hola, soy Bender, tu Co-Fundador IA. Cuéntame tu idea y me pongo a trabajar.'}
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block max-w-[90%] px-3 py-2 rounded text-[12px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#21262d] text-[#c9d1d9]'
                : 'bg-[#161b22] text-[#c9d1d9] border border-[#21262d]'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[11px] text-[#8b949e]">
            <span>procesando</span>
            {[0, 0.15, 0.3].map((d, i) => (
              <span key={i} className="w-1 h-1 rounded-full bg-[#8b949e] animate-pulse" style={{ animationDelay: `${d}s` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-3 py-2 border-t border-[#21262d] flex-shrink-0">
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe a Bender..."
          className="flex-1 px-3 py-1.5 bg-[#0a0e14] border border-[#30363d] rounded text-[12px] text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#484f58] transition-colors"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}
          className="px-3 py-1.5 text-[11px] font-mono text-[#8b949e] border border-[#30363d] rounded hover:text-[#c9d1d9] hover:border-[#484f58] transition-colors disabled:opacity-30"
        >enviar</button>
      </form>
    </div>
  )
}

// ─── Company Selector ───
function CompanySelector({ companies, selected, onSelect, onCreateNew, slotsAvailable }) {
  const [open, setOpen] = useState(false)
  if (companies.length <= 1 && !onCreateNew) return null
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 border border-[#30363d] rounded hover:border-[#8b949e] transition-colors">
        <span className="text-[11px] font-mono text-[#c9d1d9] truncate max-w-[140px]">{selected?.name}</span>
        <span className="text-[9px] text-[#484f58]">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-[#161b22] border border-[#30363d] rounded shadow-2xl z-50 overflow-hidden">
          {companies.map(c => (
            <button key={c.id} onClick={() => { onSelect(c); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-[#21262d] transition-colors flex items-center gap-2 ${
                c.id === selected?.id ? 'text-[#00ff87]' : 'text-[#8b949e]'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.id === selected?.id ? 'bg-[#00ff87]' : 'bg-[#30363d]'}`} />
              {c.name}
            </button>
          ))}
          {slotsAvailable > 0 ? (
            <button onClick={() => { onCreateNew(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[10px] font-mono text-[#58a6ff] hover:bg-[#21262d] transition-colors">
              + nuevo negocio
            </button>
          ) : (
            <div className="px-3 py-2 text-[9px] text-[#484f58]">sin espacios disponibles</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main DashboardHome ───
export default function DashboardHome() {
  const { companies, selectedCompany: company, selectCompany, loadingCompanies: loading } = useCompanySelection()
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [credits, setCredits] = useState(null)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const token = localStorage.getItem('token')

  // Load user profile
  useEffect(() => {
    if (!token) return
    fetch(apiUrl('/api/user/profile'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setUserProfile(d.user || null))
      .catch(() => {})
  }, [token])

  // Load credits
  useEffect(() => {
    if (!token) return
    fetch(apiUrl('/api/credits'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
            .then(d => setCredits(d.credits?.total ?? null))
      .catch(() => {})
  }, [token])

  // Handle feedback deep-links
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
        <span className="text-[11px] font-mono text-[#484f58]">cargando...</span>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[11px] font-mono text-[#484f58] mb-4">{'> lanzalo init'}</p>
          <h2 className="text-lg font-semibold text-[#c9d1d9] mb-2">Lanza tu primer negocio</h2>
          <p className="text-[12px] text-[#8b949e] mb-6">Describe tu idea — Bender hace el resto.</p>
          <button onClick={() => navigate('/onboarding/choose-path')}
            className="bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] font-mono text-xs py-2 px-5 border border-[#30363d] rounded transition-colors">
            empezar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Terminal log */}
      <TerminalLog companyId={company.id} />

      {/* Stats bar horizontal */}
      <StatsBar company={company} credits={credits} />

      {/* Sub-header: nombre + selector */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#21262d] flex-shrink-0">
        <span className="text-[12px] font-semibold text-[#c9d1d9]">Negocios</span>
        {companies.length > 0 && (
          <CompanySelector
            companies={companies} selected={company}
            onSelect={(c) => selectCompany(c.id)}
            onCreateNew={() => navigate('/onboarding/describe-idea')}
            slotsAvailable={userProfile?.slotsAvailable ?? 1}
          />
        )}
      </div>

            {/* 3 columnas: agentes+tareas | docs | chat */}
        <div className="flex-1 flex gap-3 p-3 overflow-hidden min-h-0">
          {/* Col 1 — agentes + tareas */}
          <div className="w-[25%] flex flex-col gap-3 overflow-y-auto min-h-0 flex-shrink-0">
            <AgentStatus companyId={company.id} />
            <Tasks companyId={company.id} />
          </div>

          {/* Col 2 — web / documentos */}
          <div className="w-[25%] flex flex-col gap-3 overflow-y-auto min-h-0 flex-shrink-0">
            <DocsLinks company={company} companyId={company.id} />
          </div>

          {/* Col 3 — chat Bender (altura fija = col 1) */}
          <div className="flex-1 min-h-0 max-h-[calc(100vh-220px)] flex flex-col">
            <Chat companyId={company.id} initialMessage={feedbackMessage} />
          </div>
        </div>
    </div>
  )
}
