import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideActivity, LucideAlertTriangle, LucideCheckCircle2, LucideClock, LucideInfo } from "lucide-react"

/**
 * Componente Timeline - Feed de eventos en tiempo real
 * Muestra eventos del sistema en orden cronológico
 */
export function Timeline({ events }) {
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'heartbeat':
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
        return 'bg-red-100 border-red-200'
      case 'agent_paused':
      case 'agent_terminated':
        return 'bg-orange-100 border-orange-200'
      case 'heartbeat_unhealthy':
      case 'heartbeat_timeout':
        return 'bg-red-100 border-red-200'
      default:
        return 'bg-blue-50 border-blue-100'
    }
  }

  const getEventText = (event) => {
    const { agentName, eventType, timestamp, reason } = event

    switch (eventType) {
      case 'heartbeat':
        return `${agentName} heartbeat received (${new Date(timestamp).toLocaleTimeString()})`
      case 'budget_warning':
        return `${agentName} budget warning: used ${reason}% of budget`
      case 'budget_exceeded':
        return `${agentName} budget exceeded! Agent paused. Used ${reason}`
      case 'agent_paused':
        return `${agentName} paused by governance`
      case 'agent_resumed':
        return `${agentName} resumed by governance`
      case 'agent_terminated':
        return `${agentName} terminated by governance`
      case 'agent_started':
        return `${agentName} started running`
      case 'heartbeat_unhealthy':
        return `${agentName} heartbeat timeout (no data for 5 minutes)`
      case 'heartbeat_timeout':
        return `${agentName} heartbeat timeout (no data for 10 minutes)`
      default:
        return `${agentName}: ${eventType}`
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LucideClock className="w-6 h-6 text-blue-500" />
          Live Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
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
                    {/* Timeline dot */}
                    <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center z-10 -ml-8`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Event content */}
                    <div className={`flex-1 p-3 rounded-lg border ${colorClass}`}>
                      <div className="text-sm">
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
                <div className="text-sm">No events yet</div>
                <div className="text-xs">Waiting for agent activity...</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}