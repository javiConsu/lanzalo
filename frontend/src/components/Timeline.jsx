import {
  LucideActivity,
  LucideAlertTriangle,
  LucideCheckCircle2,
  LucideCircleAlert,
  LucideClock,
  LucideInfo,
  LucideStopCircle
} from 'lucide-react'

/**
 * Componente Timeline - Feed de eventos operativos
 */
export function Timeline({ events = [] }) {
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'heartbeat':
      case 'heartbeat_warning':
        return LucideActivity
      case 'budget_warning':
      case 'budget_exceeded':
        return LucideAlertTriangle
      case 'agent_paused':
      case 'agent_resumed':
      case 'agent_terminated':
        return LucideStopCircle
      case 'agent_started':
        return LucideCheckCircle2
      case 'heartbeat_unhealthy':
      case 'heartbeat_timeout':
        return LucideCircleAlert
      default:
        return LucideInfo
    }
  }

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'budget_exceeded':
      case 'heartbeat_unhealthy':
      case 'heartbeat_timeout':
        return 'bg-red-100 border-red-200 text-red-700'
      case 'agent_paused':
      case 'agent_terminated':
      case 'budget_warning':
      case 'heartbeat_warning':
        return 'bg-orange-100 border-orange-200 text-orange-700'
      case 'agent_resumed':
      case 'agent_started':
      case 'heartbeat':
        return 'bg-green-100 border-green-200 text-green-700'
      default:
        return 'bg-blue-50 border-blue-100 text-blue-700'
    }
  }

  const getEventText = (event) => {
    const { agentName, agentRole, eventType, timestamp, reason } = event
    const label = agentName || agentRole || 'Agent'

    switch (eventType) {
      case 'heartbeat':
        return `${label} heartbeat recibido (${new Date(timestamp).toLocaleTimeString()})`
      case 'heartbeat_warning':
        return `${label} se acerca al timeout de heartbeat`
      case 'budget_warning':
        return `${label} se acerca al límite de presupuesto`
      case 'budget_exceeded':
        return `${label} ha excedido su presupuesto`
      case 'agent_paused':
        return `${label} pausado${reason ? ` · ${reason}` : ''}`
      case 'agent_resumed':
        return `${label} reanudado${reason ? ` · ${reason}` : ''}`
      case 'agent_terminated':
        return `${label} terminado${reason ? ` · ${reason}` : ''}`
      case 'agent_started':
        return `${label} ha iniciado trabajo`
      case 'heartbeat_unhealthy':
      case 'heartbeat_timeout':
        return `${label} sin señal de heartbeat saludable`
      default:
        return `${label}: ${eventType}`
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Sin fecha'

    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`
    return date.toLocaleDateString()
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <LucideClock className="w-6 h-6 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">Timeline operativa</h3>
      </div>

      <div className="p-4">
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {events.length > 0 ? (
              events.map((event, index) => {
                const Icon = getEventIcon(event.eventType)
                const colorClass = getEventColor(event.eventType)

                return (
                  <div
                    key={event.id || index}
                    className="relative flex gap-4"
                  >
                    <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center z-10 -ml-8`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className={`flex-1 p-3 rounded-lg border ${colorClass}`}>
                      <div className="text-sm font-medium">
                        {getEventText(event)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center text-gray-500 py-8">
                <LucideClock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <div className="text-sm">Sin eventos todavía</div>
                <div className="text-xs">Esperando actividad operativa real</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
