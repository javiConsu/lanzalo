import { useState, useEffect } from 'react'
import {
  LucideActivity,
  LucideCircleAlert,
  LucideCheckCircle2,
  LucideClock,
  LucidePulse
} from "lucide-react"

export function Heartbeat({ agents }) {
  const getHealthStatus = (heartbeat) => {
    if (!heartbeat) return { status: 'unknown', color: 'text-gray-500', icon: LucideClock }
    const age = Date.now() - new Date(heartbeat.timestamp).getTime()
    const timeout = 5 * 60 * 1000 // 5 minutes

    if (age > timeout) return { status: 'unhealthy', color: 'text-red-500', icon: LucideCircleAlert }
    if (age > timeout * 0.8) return { status: 'warning', color: 'text-yellow-500', icon: LucideActivity }
    return { status: 'healthy', color: 'text-green-500', icon: LucideCheckCircle2 }
  }

  const timeSince = (timestamp) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <LucidePulse className="w-6 h-6 text-red-500" />
        Agent Heartbeat Monitor
      </h2>
      <div className="space-y-3">
        {agents.map(agent => {
          const heartbeat = agent.heartbeat
          const health = getHealthStatus(heartbeat)

          return (
            <div
              key={agent.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${health.status === 'healthy' ? 'bg-green-500 animate-pulse' : health.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <div>
                  <div className="font-semibold text-gray-800">{agent.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{agent.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-sm font-medium ${health.color} flex items-center gap-1 justify-end`}>
                    <health.icon className="w-3 h-3" />
                    {health.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Last heartbeat: {timeSince(heartbeat?.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}