import { apiUrl } from '../api.js'
import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

export default function Chat() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
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

  // Cargar historial cuando cambia empresa
  useEffect(() => {
    if (selectedCompany) {
      fetch(apiUrl(`/api/user/companies/${selectedCompany}/chat/history?limit=50`), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setMessages(data.messages || [])
        })
        .catch(console.error)
    }
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
        setAiThinking(false)
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

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || !selectedCompany) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setAiThinking(true)

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
        content: '❌ Error: No pude procesar tu mensaje. Intenta de nuevo.',
        created_at: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

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
        </div>
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
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none leading-relaxed
                  [&>p]:mb-2 [&>p:last-child]:mb-0
                  [&>ul]:mb-2 [&>ul]:pl-4 [&>ul>li]:mb-1
                  [&>ol]:mb-2 [&>ol]:pl-4 [&>ol>li]:mb-1
                  [&>h1]:text-base [&>h2]:text-base [&>h3]:text-sm
                  [&>strong]:text-white">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              )}

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
                <span className="text-gray-400 font-medium">Bender Agent está analizando tu solicitud...</span>
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
            placeholder="Escribe a Bender... (ej: 'Añade analytics a mi web')"
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
    </div>
  )
}
