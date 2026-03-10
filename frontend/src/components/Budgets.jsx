import { useState, useEffect } from 'react'
import {
  LucideCircleDollarSign,
  LucideChartBar,
  LucideActivity,
  LucideTrendingUp,
  LucideArrowUpRight
} from "lucide-react"

export function Budgets({ budgets }) {
  const budgetConfigs = {
    CEO: { total: 4, color: "from-purple-500 to-indigo-600", icon: LucideCircleDollarSign },
    CTO: { total: 8, color: "from-blue-500 to-cyan-600", icon: LucideActivity },
    Marketing: { total: 4, color: "from-green-500 to-emerald-600", icon: LucideTrendingUp },
    Twitter: { total: 2, color: "from-orange-500 to-red-600", icon: LucideChartBar },
    Email: { total: 2, color: "from-pink-500 to-rose-600", icon: LucideTrendingUp },
    Data: { total: 4, color: "from-teal-500 to-cyan-600", icon: LucideActivity },
    Trends: { total: 2, color: "from-violet-500 to-purple-600", icon: LucideArrowUpRight }
  }

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <LucideCircleDollarSign className="w-6 h-6 text-purple-500" />
        Budget Allocation
      </h2>
      <div className="space-y-4">
        {Object.entries(budgetConfigs).map(([role, config]) => {
          const budget = budgets.find(b => b.role === role)
          const usage = budget ? budget.used : 0
          const percentage = Math.min((usage / config.total) * 100, 100)

          return (
            <div
              key={role}
              className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center`}
                  >
                    <config.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 capitalize">{role}</div>
                    <div className="text-xs text-gray-500">
                      {usage} / ${config.total} (used)
                    </div>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${usage >= config.total ? 'text-red-500' : 'text-gray-800'}`}>
                  ${usage}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentage >= 100
                      ? "bg-red-500"
                      : percentage >= 80
                      ? "bg-orange-500"
                      : percentage >= 50
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {percentage >= 100 && (
                <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <LucideCircleAlert className="w-3 h-3" />
                  Budget exceeded! Agent paused.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}