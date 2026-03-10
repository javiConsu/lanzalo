import { apiUrl } from '../api.js'
import { useState, useEffect, useRef, useCallback } from 'react'
import useCompanySelection from '../hooks/useCompanySelection.js'

// ═══════════════════════════════════════════════════════
// ICONOS SVG
// ═══════════════════════════════════════════════════════

const ThumbUpIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
  </svg>
)

const ThumbDownIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
  </svg>
)

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

const FeedbackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// ═══════════════════════════════════════════════════════
// MODAL COMPONENT
// ═══════════════════════════════════════════════════════

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN CHAT COMPONENT
// ═══════════════════════════════════════════════════════

export default function Chat() {
  const { companies, selectedCompanyId: selectedCompany, selectCompany: setSelectedCompany } = useCompanySelection()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const messagesEndRef = useRef(null)
  const token = localStorage.getItem('token')

  // ─── Cargar historial ───
  useEffect(() => {
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.companies?.length > 0) {
          setCompanies(data.companies)
          setSelectedCompany(data.companies[0].id)
        }
      })
      .catch(console.error)
  }, [token])

    const loadHistory = async () => {
      try {
        const res = await fetch(apiUrl(`/api/user/companies/${selectedCompany}/chat/history?limit=50`), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        const history = data.messages || []

        if (history.length === 0) {
          setLoading(true)
          try {
            const welcomeRes = await fetch(apiUrl(`/api/user/companies/${selectedCompany}/chat/welcome`), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            const welcomeData = await welcomeRes.json()
            if (welcomeData.message && !welcomeData.skipped) {
              setMessages([{
                id: Date.now(),
                role: 'assistant',
                content: welcomeData.message,
                created_at: new Date().toISOString()
              }])
            }
          } catch (e) {
            // Silencioso
          } finally {
            setLoading(false)
          }
        } else {
          setMessages(history)
        }
      } catch (e) {
        console.error('Error loading chat:', e)
      }
    }

    loadHistory()
  }, [selectedCompany, token])

  // ─── Auto-scroll ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── WebSocket ───
  useEffect(() => {
    if (!selectedCompany) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
    ws.onmessage = (event) => {
      const activity = JSON.parse(event.data)

      // Si es una notificación de tarea completada, recargar mensajes
      if (activity.type === 'task_completed' || activity.type === 'task_failed') {
        setAiThinking(false)
        fetch(`/api/user/companies/${selectedCompany}/chat/history?limit=50`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setMessages(data.messages || []))
          .catch(console.error)
      }
    }
    return () => ws.close()
  }, [selectedCompany, token])

  // ─── Ocultar hint de likes después de unos segundos ───
  useEffect(() => {
    const timer = setTimeout(() => setShowLikeHint(false), 15000)
    return () => clearTimeout(timer)
  }, [])

  // ─── Like/Dislike handler ───
  const handleFeedback = useCallback(async (messageId, rating) => {
    setFeedbackSent(prev => ({ ...prev, [messageId]: rating }))
    try {
      await fetch(apiUrl(`/api/companies/${selectedCompany}/chat/${messageId}/feedback`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating })
      })
    } catch (e) {
      setFeedbackSent(prev => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
    }
  }, [selectedCompany, token])

  // ─── Enviar mensaje ───
  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || !selectedCompany) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setAiThinking(true)

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }])

    try {
      const res = await fetch(apiUrl(`/api/user/companies/${selectedCompany}/chat`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage })
      })

      const data = await res.json()

      if (data.success) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.message,
          action: data.action,
          task_id: data.taskId,
          created_at: new Date().toISOString()
        }])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: '❌ Error: No pude procesar tu mensaje. Intenta de nuevo.',
        created_at: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  // ─── Submit Bug Report ───
  const handleBugSubmit = async () => {
    if (!bugText.trim() || bugText.trim().length < 5) return
    setSubmitting(true)
    try {
      const res = await fetch(apiUrl(`/api/companies/${selectedCompany}/support/bug`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: bugText.trim(),
          contextMessageId: bugModal.messageId
        })
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMessage(data.message)
        setBugModal({ open: false, messageId: null })
        setBugText('')
        setTimeout(() => setSuccessMessage(null), 5000)
      }
    } catch (e) {
      console.error('Bug submit error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Submit Feedback ───
  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || feedbackText.trim().length < 50) return
    setSubmitting(true)
    try {
      const res = await fetch(apiUrl(`/api/companies/${selectedCompany}/support/feedback`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: feedbackText.trim(),
          contextMessageId: feedbackModal.messageId
        })
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMessage(data.message)
        setFeedbackModal({ open: false, messageId: null })
        setFeedbackText('')
        setTimeout(() => setSuccessMessage(null), 6000)
      }
    } catch (e) {
      console.error('Feedback submit error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Empty state ───
  if (companies.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
            <span className="text-4xl">🚀</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Bienvenido a Lanzalo</h2>
          <p className="text-gray-400 mb-6">Tu co-fundador IA está listo para ayudarte a escalar tu empresa</p>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-sm text-gray-400">Selecciona una empresa o crea una nueva para comenzar</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header con stats */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700/50 p-5">
        <div className="flex items-center gap-5">
          <select
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-5 py-2.5 bg-gray-800/80 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-600 transition-all font-medium"
          >
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400 font-medium">Agentes Activos</span>
            </div>
          </div>

          {companies.length > 1 && (
            <select
              value={selectedCompany || ''}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="text-sm px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Like hint banner */}
        {showLikeHint && (
          <div className="mt-3 flex items-center gap-2 text-xs text-violet-300/80 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
            <span>👍</span>
            <span>Dale like a las ocurrencias de tu Co-Founder para que vaya aprendiendo de lo que te gusta</span>
            <button
              onClick={() => setShowLikeHint(false)}
              className="ml-auto text-violet-400/60 hover:text-violet-300 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-5 py-4 shadow-lg ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                  : 'bg-gray-800/90 border border-gray-700/50 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

              {msg.action && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/60 flex items-center gap-2">
                  <span>⚡</span>
                  <span className="font-medium">Acción:</span>
                  {msg.action}
                  {msg.task_id && ` • ID: ${msg.task_id.substring(0, 8)}`}
                </div>
              )}

              <div className="text-xs opacity-50 mt-2 flex items-center gap-2">
                <span>🕐</span>
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {aiThinking && (
          <div className="flex justify-start">
            <div className="bg-gray-800/90 border border-gray-700/50 rounded-2xl px-5 py-4 shadow-lg max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-200"></div>
                </div>
                <span className="text-gray-400 font-medium">Co-Founder Agent está analizando tu solicitud...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input con gradient */}
      <div className="bg-gradient-to-t from-gray-800 to-gray-900 border-t border-gray-700/50 p-5">
        <form onSubmit={handleSend} className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe lo que necesitas... (ej: 'Añade analytics a mi web')"
            className="flex-1 px-5 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-600 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-7 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Enviando...
              </span>
            ) : (
              'Enviar'
            )}
          </button>
        </form>

        <div className="mt-3 text-xs text-gray-500 text-center bg-gray-800/30 rounded-lg py-2">
          <span className="text-gray-400">💡 Ejemplos:</span>
          {' '}
          <span className="text-gray-400">"Añade analytics a mi web"</span>
          {' • '}
          <span className="text-gray-400">"Tweetea sobre nuestro milestone"</span>
          {' • '}
          <span className="text-gray-400">"Calcula métricas"</span>
        </div>
      </div>

      {/* ═══ Modal: Algo va mal ═══ */}
      <Modal isOpen={bugModal.open} onClose={() => { setBugModal({ open: false, messageId: null }); setBugText(''); }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center text-red-400">
              <AlertIcon />
            </div>
            <div>
              <h3 className="text-white font-semibold">Algo va mal</h3>
              <p className="text-xs text-gray-400">Cuéntanos qué ha pasado y lo arreglamos</p>
            </div>
          </div>

          <textarea
            value={bugText}
            onChange={(e) => setBugText(e.target.value)}
            placeholder="Describe el problema... ¿Qué esperabas que pasara? ¿Qué pasó en su lugar?"
            className="w-full h-28 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
            autoFocus
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-500">Sin créditos — es gratis reportar</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setBugModal({ open: false, messageId: null }); setBugText(''); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBugSubmit}
                disabled={submitting || bugText.trim().length < 5}
                className="px-4 py-2 text-sm bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Enviar reporte'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ═══ Modal: Dar Feedback ═══ */}
      <Modal isOpen={feedbackModal.open} onClose={() => { setFeedbackModal({ open: false, messageId: null }); setFeedbackText(''); }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-violet-500/15 rounded-xl flex items-center justify-center text-violet-400">
              <FeedbackIcon />
            </div>
            <div>
              <h3 className="text-white font-semibold">Mejora Lánzalo</h3>
              <p className="text-xs text-gray-400">Propón ideas para mejorar la plataforma (no tu proyecto)</p>
            </div>
          </div>

          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="¿Qué mejorarías de Lánzalo como plataforma? ¿Qué funcionalidad echas en falta? Esto es para mejorar Lánzalo, no tu proyecto. Mínimo 50 caracteres — cuanto más detalle, mejor."
            className="w-full h-32 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
            autoFocus
          />

          {/* Credit info */}
          <div className="mt-3 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2.5">
            <p className="text-xs text-violet-300">
              <span className="font-semibold">+1 crédito</span> por cada idea aprobada. Cuantas más ideas envíes, más créditos puedes conseguir.
            </p>
            <p className="text-[11px] text-violet-300/60 mt-1">
              Cada crédito = 1 tarea nueva que tu Co-Founder ejecutará. Explícate bien (mín. 50 caracteres).
            </p>
            <p className="text-[11px] text-amber-300/80 mt-1">
              ✨ En tu periodo trial: <span className="font-semibold">+2 créditos</span> por feedback aprobado — aprovecha estos primeros días
            </p>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-500">Solo damos crédito si se aprueba</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setFeedbackModal({ open: false, messageId: null }); setFeedbackText(''); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={submitting || feedbackText.trim().length < 50}
                className="px-4 py-2 text-sm bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Enviar feedback'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}