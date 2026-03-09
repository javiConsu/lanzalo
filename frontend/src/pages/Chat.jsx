import { apiUrl } from '../api.js'
import { useState, useEffect, useRef, useCallback } from 'react'

export default function Chat() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState({}) // { messageId: 'positive'|'negative' }
  const messagesEndRef = useRef(null)

  const token = localStorage.getItem('token')

  // Cargar empresas
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

  // Cargar historial cuando cambia empresa + auto-welcome si es primera vez
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
          // Primera vez — generar welcome message del Co-Founder
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
            // Silencioso — welcome es optional
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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebSocket para live updates
  useEffect(() => {
    if (!selectedCompany) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

    ws.onmessage = (event) => {
      const activity = JSON.parse(event.data)
      
      // Si es una notificación de tarea completada, recargar mensajes
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

  // Feedback handler
  const handleFeedback = useCallback(async (messageId, rating) => {
    // Optimistic UI
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
      // Revert on error
      setFeedbackSent(prev => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
    }
  }, [selectedCompany, token])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || !selectedCompany) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Añadir mensaje del usuario inmediatamente
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
        // Añadir respuesta del asistente
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
      {/* Header */}
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
            <span className="text-sm text-gray-400">Co-Founder Agent</span>
          </div>
        </div>
      </div>

      {/* Messages */}
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
                  {msg.task_id && ` • Tarea: ${msg.task_id.substring(0, 8)}`}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs opacity-50">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>
                
                {/* Feedback buttons — only on assistant messages */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 ml-2">
                    {feedbackSent[msg.id] ? (
                      <span className="text-xs text-gray-400">
                        {feedbackSent[msg.id] === 'positive' ? '👍 Gracias' : '👎 Anotado'}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleFeedback(msg.id, 'positive')}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400 hover:bg-green-500/10 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
                          </svg>
                          Útil
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, 'negative')}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
                          </svg>
                          No útil
                        </button>
                      </>
                    )}
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
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                <span className="text-gray-400 ml-2">Co-Founder pensando...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
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

        <div className="mt-3 text-xs text-gray-500 text-center">
          Ejemplos: "Añade analytics a mi web" • "Tweetea sobre nuestro milestone" • "Calcula métricas"
        </div>
      </div>
    </div>
  )
}
