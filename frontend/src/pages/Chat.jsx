import { apiUrl } from '../api.js'
import { useState, useEffect, useRef, useCallback } from 'react'

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
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState({})
  const [showLikeHint, setShowLikeHint] = useState(true)
  
  // Modals
  const [bugModal, setBugModal] = useState({ open: false, messageId: null })
  const [feedbackModal, setFeedbackModal] = useState({ open: false, messageId: null })
  const [bugText, setBugText] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  
  const messagesEndRef = useRef(null)
  const token = localStorage.getItem('token')

  // ─── Cargar empresas ───
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

  // ─── Cargar historial ───
  useEffect(() => {
    if (!selectedCompany) return

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
      if (activity.type === 'task_completed' || activity.type === 'task_failed') {
        fetch(apiUrl(`/api/user/companies/${selectedCompany}/chat/history?limit=50`), {
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
        content: 'Error: No pude procesar tu mensaje.',
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
    if (!feedbackText.trim() || feedbackText.trim().length < 10) return
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
        <div className="text-center">
          <p className="text-gray-400 mb-4">No tienes empresas aún</p>
          <p className="text-sm text-gray-500">Crea tu primera empresa para empezar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* ═══ Header ═══ */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <select
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Co-Founder</span>
          </div>
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

      {/* ═══ Success toast ═══ */}
      {successMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm max-w-sm text-center shadow-lg animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* ═══ Messages ═══ */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100 border border-gray-700'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              
              {msg.action && (
                <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                  Acción: {msg.action}
                  {msg.task_id && ` · Tarea: ${msg.task_id.substring(0, 8)}`}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs opacity-50">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>
                
                {/* Feedback buttons — solo en mensajes del asistente */}
                {msg.role === 'assistant' && msg.id && (
                  <div className="flex items-center gap-1">
                    {/* Like */}
                    <button
                      onClick={() => handleFeedback(msg.id, 'positive')}
                      className={`p-1 rounded transition-colors ${
                        feedbackSent[msg.id] === 'positive'
                          ? 'text-green-400'
                          : 'text-gray-500 hover:text-green-400'
                      }`}
                      title="Me gusta — así aprende tu Co-Founder"
                    >
                      <ThumbUpIcon filled={feedbackSent[msg.id] === 'positive'} />
                    </button>
                    {/* Dislike */}
                    <button
                      onClick={() => handleFeedback(msg.id, 'negative')}
                      className={`p-1 rounded transition-colors ${
                        feedbackSent[msg.id] === 'negative'
                          ? 'text-red-400'
                          : 'text-gray-500 hover:text-red-400'
                      }`}
                      title="No me gusta"
                    >
                      <ThumbDownIcon filled={feedbackSent[msg.id] === 'negative'} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-gray-400 ml-2">Co-Founder pensando...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* ═══ Input + Action Buttons ═══ */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <form onSubmit={handleSend} className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe lo que necesitas..."
            className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </form>

        {/* Action bar: Algo va mal + Dar Feedback */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Algo va mal */}
            <button
              onClick={() => setBugModal({ open: true, messageId: messages.length > 0 ? messages[messages.length - 1]?.id : null })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all"
            >
              <AlertIcon />
              <span>Algo va mal</span>
            </button>

            {/* Dar Feedback */}
            <button
              onClick={() => setFeedbackModal({ open: true, messageId: messages.length > 0 ? messages[messages.length - 1]?.id : null })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-violet-400/70 hover:text-violet-400 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 rounded-lg transition-all"
            >
              <FeedbackIcon />
              <span>Dar Feedback</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/20 text-violet-300 rounded-full">+créditos</span>
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Ejemplos: "Añade analytics" · "Tweetea sobre nuestro milestone" · "Calcula métricas"
          </div>
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
              <h3 className="text-white font-semibold">Dar Feedback</h3>
              <p className="text-xs text-gray-400">Propón mejoras o funcionalidades nuevas</p>
            </div>
          </div>

          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="¿Qué te gustaría que hiciera diferente? ¿Qué funcionalidad echas en falta? Cuanto más detalle, mejor..."
            className="w-full h-32 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
            autoFocus
          />

          {/* Credit info */}
          <div className="mt-3 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2.5">
            <p className="text-xs text-violet-300">
              <span className="font-semibold">+1 crédito</span> si aprobamos tu feedback para desarrollo.
            </p>
            <p className="text-[11px] text-violet-300/60 mt-1">
              Cada crédito = 1 tarea nueva que tu Co-Founder resolverá. Bastante generoso, ¿no? 😏
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
                disabled={submitting || feedbackText.trim().length < 10}
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
