import { useState, useEffect } from 'react'
import {
  LucideTrendingUp,
  LucideCheckCircle2,
  LucideCircleAlert,
  LucideBrainCircuit,
  LucideShieldAlert,
  LucideCpu,
  LucideMegaphone,
  LucideWifi,
  LucideBarChart2,
  LucideSearch
} from "lucide-react"

export function OrgChart({ agents }) {
  // Jerarquía definida
  const hierarchy = {
    CEO: {
      icon: LucideTrendingUp,
      color: "from-purple-500 to-indigo-600",
      bgColor: "bg-purple-500/10",
      agents: ["CTO", "Marketing", "Twitter", "Email", "Data", "Trends"]
    },
    CTO: {
      icon: LucideBrainCircuit,
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-500/10",
      agents: ["Code", "Data", "Data"]
    },
    Marketing: {
      icon: LucideMegaphone,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-500/10",
      agents: ["Twitter", "Email"]
    },
    Twitter: {
      icon: LucideWifi,
      color: "from-orange-500 to-red-600",
      bgColor: "bg-orange-500/10",
      agents: []
    },
    Email: {
      icon: LucideBarChart2,
      color: "from-pink-500 to-rose-600",
      bgColor: "bg-pink-500/10",
      agents: []
    },
    Data: {
      icon: LucideSearch,
      color: "from-teal-500 to-cyan-600",
      bgColor: "bg-teal-500/10",
      agents: []
    },
    Trends: {
      icon: LucideCheckCircle2,
      color: "from-violet-500 to-purple-600",
      bgColor: "bg-violet-500/10",
      agents: []
    }
  }

  const renderAgentNode = (agentName, role, isActive) => {
    const roleConfig = hierarchy[role]
    const Icon = roleConfig.icon

    return (
      <div
        key={agentName}
        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all hover:scale-105 ${
          isActive
            ? "border-blue-400 bg-white shadow-lg"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${roleConfig.color} flex items-center justify-center mb-2`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <div className="font-semibold text-sm text-gray-800">{agentName}</div>
          <div className="text-xs text-gray-500 capitalize">{role}</div>
        </div>
        {isActive && (
          <div className="mt-2 flex items-center gap-1 text-green-600 text-xs font-medium">
            <LucideCheckCircle2 className="w-3 h-3" />
            Activo
          </div>
        )}
      </div>
    )
  }

  const renderTree = (role, level = 0) => {
    const config = hierarchy[role]
    const spacing = level * 8

    return (
      <div key={role} className="flex flex-col items-center">
        {renderAgentNode(role, role, agents.some(a => a.name === role))}
        {config.agents.length > 0 && (
          <div className="flex gap-2 mb-2">
            {config.agents.map(subRole => renderTree(subRole, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-6 min-h-[400px]">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <LucideBrainCircuit className="w-6 h-6 text-blue-500" />
        Organizational Chart
      </h2>
      <div className="flex flex-col items-center gap-6">
        {Object.keys(hierarchy).map(role => renderTree(role))}
      </div>
    </div>
  )
}