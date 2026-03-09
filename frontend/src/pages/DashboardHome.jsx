/**
 * DashboardHome — Minimalista estilo Polsia
 * Layout: Stats bar arriba, Tareas+Links izq (30%), Chat der (70%)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiUrl, API_URL } from '../api.js'
import useCompanySelection from '../hooks/useCompanySelection.js'

// ─── Inline Chat (altura limitada, no infinito) ──────────────────
function InlineChat({ companyId, initialMessage }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialSent, setInitialSent] = useState(false)
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

  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage?.trim() || !companyId) return
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
    } finally { setLoading(false) }
  }, [companyId, token])

  useEffect(() => {
    if (initialMessage && companyId && !initialSent && messages.length > 0) {
      setInitialSent(true)
      sendMessage(initialMessage)
    }
  }, [initialMessage, companyId, initialSent, messages.length, sendMessage])

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const msg = input.trim()
    setInput('')
    sendMessage(msg)
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <span className="text-sm font-semibold text-white">Co-Founder</span>
          <span className="text-xs text-gray-500">Tu socio IA</span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-400">Online</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Tu Co-Founder está listo. ¿Qué necesitas?</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-md'
                : 'bg-gray-800 text-gray-200 rounded-bl-md'
            }`}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} /><span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} /></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 border-t border-gray-700/50 flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe a tu Co-Founder..." className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors" disabled={loading} />
        <button type="submit" disabled={!input.trim() || loading} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors">Enviar</button>
      </form>
    </div>
  )
}

// ─── Tasks Widget ──────────────────────────────────────────────
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
    .then(d => setTasks((d.backlog || []).slice(0, 3)))
    .catch(() => {})
  }, [companyId, token])

  const STATUS_COLORS = { todo: 'bg-gray-500', in_progress: 'bg-amber-400', completed: 'bg-emerald-400', failed: 'bg-red-400' }
  const TAG_COLORS = { code: 'text-blue-400', marketing: 'text-pink-400', email: 'text-amber-400', research: 'text-purple-400', data: 'text-cyan-400' }

  return (
    <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-xs">📋</span> Tareas
        </span>
        <button onClick={() => navigate('/backlog')} className="text-xs text-gray-500 hover:text-emerald-400 transition-colors">Ver todo →</button>
      </div>
      <div className="p-3 space-y-2">
        {tasks.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-gray-600 text-xs">Dile a tu Co-Founder qué quieres hacer</p>
          </div>
        ) : tasks.map(task => (
          <div key={task.id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-800/50 rounded-xl">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status] || 'bg-gray-500'}`} />
            <span className="text-xs text-gray-200 flex-1 truncate">{task.title}</span>
            {task.tag && <span className={`text-[10px] ${TAG_COLORS[task.tag] || 'text-gray-500'}`}>{task.tag}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────
function ProjectStatsBar({ company, totalCompanies, businessSlots }) {
  const isLive = company?.status === 'live'
  const revenue = company?.revenue_total || 0
  const balance = company?.balance || 0
  const visits = company?.visits_total || 0
  const costLanzalo = company?.cost_lanzalo || 0
  const costEmail = company?.cost_cold_email || 0
  const costAds = company?.cost_ads || 0
  const investment = costLanzalo + costEmail + costAds

  return (
    <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 p-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-sm font-bold text-white truncate max-w-[160px]">{company?.name || 'Mi negocio'}</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${isLive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>{isLive ? 'Activo' : 'Construyendo'}</span>
        </div>
        <div className="w-px h-6 bg-gray-700/50 hidden sm:block" />
        <div className="flex items-center gap-4 flex-1">
          <div className="text-center"><div className="text-xs text-gray-500">Ingresos</div><div className="text-sm font-bold text-emerald-400">${revenue}</div></div>
          <div className="text-center flex items-center gap-2"><div><div className="text-xs text-gray-500">Balance</div><div className="text-sm font-bold text-white">${balance}</div></div>
            <button onClick={() => alert('Retiradas disponibles pronto.')} className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600/50 text-gray-400 rounded-lg transition-all mt-2">Retirar</button>
          </div>
          <div className="text-center"><div className="text-xs text-gray-500">Inversión</div><div className="text-sm font-bold text-orange-400">${investment}</div></div>
          <div className="text-center"><div className="text-xs text-gray-500">Visitas</div><div className="text-sm font-bold text-blue-400">{visits}</div></div>
          <div className="w-px h-6 bg-gray-700/50 hidden sm:block" />
          <div className="text-center"><div className="text-xs text-gray-500">Negocios</div><div className="text-sm font-bold text-violet-400">{totalCompanies || 1}<span className="text-xs text-gray-500 font-normal">/{businessSlots}</span></div></div>
        </div>
      </div>
    </div>
  )
}

// ─── Links & Documents Widget ─────────────────────────────────
function LinksWidget({ company, companyId }) {
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
  const websiteUrl = company?.website_url
  const DOC_ICONS = { research: '📊', data: '📈', trends: '🌐' }

  return (
    <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/50">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-xs">🔗</span> Web e informes
        </span>
      </div>
      <div className="p-3 space-y-2">
        {subdomain && (landing?.deployed ? (
          <a href={landing.url || websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/15 transition-colors group">
            <span className="text-sm">🌐</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-emerald-400 group-hover:text-emerald-300 truncate font-medium">{subdomain}.lanzalo.pro</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-emerald-500"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Live</span>
                {landing.waitlistCount > 0 && <span className="text-xs text-gray-500">· {landing.waitlistCount} lead{landing.waitlistCount !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <span className="text-xs text-gray-500 group-hover:text-emerald-400">↗</span>
          </a>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-800/50 rounded-xl">
            <span className="text-sm">🌐</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 truncate">{subdomain}.lanzalo.pro</p>
              <p className="text-xs text-amber-400/70">Pendiente — tu Co-Founder la construirá</p>
            </div>
            <span className="text-xs text-gray-600">⏳</span>
          </div>
        ))}
        {documents.map(doc => (
          <div key={doc.id}>
            <button onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)} className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors group text-left">
              <span className="text-sm">{DOC_ICONS[doc.tag] || '📄'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 group-hover:text-emerald-400 transition-colors truncate">{doc.title}</p>
                <p className="text-xs text-gray-500">{doc.tag || 'documento'} · {new Date(doc.completed_at || doc.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
              </div>
              <span className={`text-xs text-gray-500 transition-transform ${expandedDoc === doc.id ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expandedDoc === doc.id && doc.output && (
              <div className="mt-1 mx-1 p-4 bg-gray-800/80 rounded-xl border border-gray-700/50 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs text-gray-300 leading-relaxed font-sans">{doc.output}</pre>
              </div>
            )}
          </div>
        ))}
        {!subdomain && documents.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-gray-600 text-xs">Los documentos generados aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Activity Widget ───────────────────────────────────────────
function ActivityWidget({ companyId }) {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!companyId) return
    const wsUrl = API_URL ? `${API_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws` : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      try {
        const activity = JSON.parse(event.data)
        if (!activity.companyId || activity.companyId === companyId) {
          setEvents(prev => [{ id: Date.now(), ...activity, time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 3))
        }
      } catch(e) {}
    }
    return () => ws.close()
  }, [companyId])

  const ICONS = { task_created: '📋', task_started: '⚡', task_completed: '✅', task_failed: '❌', ceo_message: '🧠', deploy: '🚀', email_sent: '📧', tweet_posted: '🐦' }

  return (
    <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-xs">⚡</span> Actividad
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className={`text-xs ${connected ? 'text-emerald-400' : 'text-gray-600'}`}>{connected ? 'Live' : '...'}</span>
        </span>
      </div>
      <div className="divide-y divide-gray-800/50">
        {events.length === 0 ? (
          <div className="px-4 py-4 text-center">
            <p className="text-gray-600 text-xs">Conectando con tus agentes...</p>
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

// ─── Company Selector ──────────────────────────────────────────
function CompanySelector({ companies, selected, onSelect, onCreateNew, slotsAvailable }) {
  const [open, setOpen] = useState(false)
  if (companies.length <= 1 && !onCreateNew) return null
  const canCreate = slotsAvailable > 0

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-800 transition-colors">
        <span className="text-sm font-medium text-white truncate max-w-[150px]">{selected?.name}</span>
        <span className={`text-xs text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {companies.map(c => (
            <button key={c.id} onClick={() => { onSelect(c); setOpen(false) }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700/50 transition-colors flex items-center gap-2 ${c.id === selected?.id ? 'text-emerald-400 bg-gray-700/30' : 'text-gray-300'}`}>
              <span className="text-xs">{c.status === 'live' ? '🟢' : '🟡'}</span>
              <span className="truncate">{c.name}</span>
            </button>
          ))}
          {canCreate ? (
            <button onClick={() => { onCreateNew(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-sm text-emerald-400 hover:bg-gray-700/50 transition-colors border-t border-gray-700 flex items-center gap-2">
              <span className="text-xs">+</span><span>Crear nuevo negocio</span>
            </button>
          ) : (
            <div className="w-full px-4 py-2.5 text-sm text-gray-500 border-t border-gray-700 flex items-center gap-2">
              <span className="text-xs">🔒</span><span className="text-xs">Sin huecos — compra uno en ajustes</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main DashboardHome (MINIMALISTA) ──────────────────────────
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
    .then(r => r.json()).then(d => setUserProfile(d.user || null)).catch(() => {})
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
    return (<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>)
  }

  if (!company) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Lanza tu primer negocio</h2>
          <p className="text-gray-400 text-sm mb-6">Describe tu idea y tu Co-Founder se encarga del resto.</p>
          <button onClick={() => navigate('/onboarding/choose-path')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-6 rounded-xl transition-colors text-sm">Empezar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {companies.length > 0 && (
        <div className="flex items-center justify-end px-4 pt-3 pb-1 flex-shrink-0">
          <CompanySelector companies={companies} selected={company} onSelect={(c) => selectCompany(c.id)} onCreateNew={() => navigate('/onboarding/describe-idea')} slotsAvailable={userProfile?.slotsAvailable ?? 1} />
        </div>
      )}

      {/* Stats bar — siempre visible arriba */}
      <div className="px-4 pt-2 flex-shrink-0">
        <ProjectStatsBar company={company} totalCompanies={companies.length} businessSlots={userProfile?.businessSlots ?? 1} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Left: Estado del negocio (30%) */}
        <div className="lg:w-[30%] flex flex-col gap-3 overflow-y-auto min-h-0">
          <TasksWidget companyId={company.id} />
          <LinksWidget company={company} companyId={company.id} />
          <ActivityWidget companyId={company.id} />
        </div>

        {/* Right: Chat (70%) — protagonista */}
        <div className="flex-1 lg:w-[70%] min-h-0 flex flex-col">
          <InlineChat companyId={company.id} initialMessage={feedbackMessage} />
        </div>
      </div>
    </div>
  )
}
