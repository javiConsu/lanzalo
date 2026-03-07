import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../api.js'

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
  task_created: 'Tarea creada',
  task_started: 'Empezando',
  task_completed: '✅ Completada',
  task_failed: '❌ Error',
  ceo_message: 'Co-Founder',
  agent_action: 'Agente',
  deploy: '🚀 Deploy',
  email_sent: '📧 Email enviado',
  tweet_posted: '🐦 Tweet publicado'
}

export default function LiveFeed({ companyId }) {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const feedRef = useRef(null)

  useEffect(() => {
    if (!companyId) return

    // Conectar WebSocket
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
        const activity = JSON.parse(event.data)
        // Solo mostrar eventos de esta empresa
        if (!activity.companyId || activity.companyId === companyId) {
          setEvents(prev => [{
            id: Date.now(),
            ...activity,
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }, ...prev].slice(0, 50)) // Máximo 50 eventos
        }
      } catch (e) {}
    }

    return () => ws.close()
  }, [companyId])

  // Auto-scroll al último evento
  useEffect(() => {
    if (feedRef.current && events.length > 0) {
      feedRef.current.scrollTop = 0
    }
  }, [events])

  if (!companyId) return null

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Feed en vivo</span>
          {connected ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
              Desconectado
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{events.length} eventos</span>
      </div>

      {/* Events */}
      <div ref={feedRef} className="h-64 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 text-sm">Esperando actividad...</p>
              <p className="text-gray-600 text-xs mt-1">Los agentes aparecerán aquí cuando trabajen</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {events.map(event => (
              <div key={event.id} className="px-4 py-2.5 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5 flex-shrink-0">
                    {AGENT_ICONS[event.agentType] || AGENT_ICONS[event.type?.split('_')[0]] || '⚡'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">
                        {TYPE_LABELS[event.type] || event.type || 'Actividad'}
                      </span>
                      <span className="text-xs text-gray-600">{event.time}</span>
                    </div>
                    {event.message && (
                      <p className="text-sm text-gray-300 mt-0.5 truncate">{event.message}</p>
                    )}
                    {event.taskTitle && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">📋 {event.taskTitle}</p>
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
