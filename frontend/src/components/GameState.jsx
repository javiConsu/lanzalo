import { useState, useEffect } from 'react'
import { apiUrl } from '../api.js'

const LEVEL_COLORS = {
  1: 'from-gray-500 to-gray-600',
  2: 'from-blue-500 to-blue-600',
  3: 'from-purple-500 to-purple-600',
  4: 'from-yellow-500 to-orange-500',
  5: 'from-green-500 to-emerald-600'
}

export default function GameState({ companyId }) {
  const [state, setState] = useState(null)

  useEffect(() => {
    if (!companyId) return
    const token = localStorage.getItem('token')

    const load = () => {
      fetch(apiUrl(`/api/user/companies/${companyId}/gamestate`), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(setState)
        .catch(() => {})
    }

    load()
    const interval = setInterval(load, 30000) // Refresh cada 30s
    return () => clearInterval(interval)
  }, [companyId])

  if (!state) return null

  const { xp, level, tasksCompleted } = state
  const levelColor = LEVEL_COLORS[level?.level || 1]
  const progress = level?.progress || 0
  const nextLevel = level?.next

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-3">
      {/* Nivel actual */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{level?.icon || '💡'}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">{level?.name || 'Idea'}</span>
            <span className="text-xs text-gray-400">{xp} XP</span>
          </div>
          {/* Barra de progreso */}
          <div className="mt-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${levelColor} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {nextLevel && (
            <div className="flex justify-between mt-0.5">
              <span className="text-xs text-gray-600">Nivel {level.level}</span>
              <span className="text-xs text-gray-600">{nextLevel.name} →</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="flex gap-3 text-xs text-gray-500 border-t border-gray-700 pt-2">
        <span>⚡ {tasksCompleted} tareas</span>
        {state.achievementsCount > 0 && (
          <span>🏆 {state.achievementsCount} logros</span>
        )}
      </div>

      {/* Logros recientes */}
      {state.recentAchievements?.length > 0 && (
        <div className="mt-2 border-t border-gray-700 pt-2">
          <div className="flex flex-wrap gap-1">
            {state.recentAchievements.slice(0, 3).map(a => (
              <span key={a.achievement_key} title={a.title} className="text-base cursor-help">
                {a.icon}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
