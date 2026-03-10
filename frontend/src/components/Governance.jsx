import { useState, useEffect } from 'react'
import {
  LucideShieldAlert,
  LucideCpu,
  LucideStopCircle,
  LucidePlayCircle,
  LucideActivity,
  LucideRefreshCw
} from "lucide-react"

export function Governance({ agents, events, onAction }) {
  const getAgentIcon = (role) => {
    const icons = {
      CEO: LucideShieldAlert,
      CTO: LucideCpu,
      Marketing: LucideMegaphone,
      Twitter: LucideWifi,
      Email: LucideBarChart2,
      Data: LucideSearch,
      Trends: LucideCheckCircle2
    }
    return icons[role] || LucideActivity
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <LucideShieldAlert className="w-6 h-6 text-blue-500" />
        Governance Control
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent Control Panel */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <LucideCpu className="w-4 h-4" />
            Agent Management
          </h3>
          <div className="space-y-2">
            {agents.map(agent => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <getAgentIcon(agent.role) className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-800">{agent.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{agent.role}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {agent.status === 'active' ? (
                    <button
                      onClick={() => onAction('pause', agent.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                    >
                      <LucideStopCircle className="w-3 h-3" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => onAction('resume', agent.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1"
                    >
                      <LucidePlayCircle className="w-3 h-3" />
                      Resume
                    </button>
                  )}
                  <button
                    onClick={() => onAction('terminate', agent.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-1"
                  >
                    <LucideStopCircle className="w-3 h-3" />
                    Terminate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Log */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <LucideRefreshCw className="w-4 h-4" />
            Governance Events
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {events.slice().reverse().map(event => (
              <div
                key={event.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-800">
                    {event.agentName} {event.action}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(event.timestamp)}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {event.reason}
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-4">
                No events yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}