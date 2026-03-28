import {
  LucideActivity,
  LucideCircleAlert,
  LucideCheckCircle2,
  LucideClock
} from 'lucide-react'

export function Heartbeat({ agents = [] }) {
  const getHealthStatus = (heartbeat) => {
    const status = heartbeat?.status || 'unknown'

    if (status === 'healthy') {
      return { status: 'healthy', color: 'text-green-500', dot: 'bg-green-500 animate-pulse', icon: LucideCheckCircle2 }
    }

    if (status === 'warning') {
      return { status: 'warning', color: 'text-yellow-500', dot: 'bg-yellow-500', icon: LucideActivity }
    }

    if (status === 'unhealthy' || status === 'timeout') {
      return { status: 'unhealthy', color: 'text-red-500', dot: 'bg-red-500', icon: LucideCircleAlert }
    }

    return { status: 'unknown', color: 'text-gray-500', dot: 'bg-gray-400', icon: LucideClock }
  }

  const timeSince = (timestamp) => {
    if (!timestamp) return 'sin heartbeat'

    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <LucideActivity className="w-6 h-6 text-red-500" />
        Agent Heartbeat Monitor
      </h2>

      <div className="space-y-3">
        {agents.map(agent => {
          const health = getHealthStatus(agent.heartbeat)
          const Icon = health.icon

          return (
            <div
              key={agent.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${health.dot}`} />
                <div>
                  <div className="font-semibold text-gray-800">{agent.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{agent.role}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-sm font-medium ${health.color} flex items-center gap-1 justify-end`}>
                    <Icon className="w-3 h-3" />
                    {health.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Último heartbeat: {timeSince(agent.heartbeat?.timestamp)}
                  </div>
                  {agent.detail && (
                    <div className="text-xs text-gray-400 mt-1 max-w-xs">{agent.detail}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {agents.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-6">
            No hay agentes disponibles para monitorizar.
          </div>
        )}
      </div>
    </div>
  )
}
