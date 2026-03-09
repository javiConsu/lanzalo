import { apiUrl } from '../api.js'
import { useState, useEffect, useCallback } from 'react'
import useCompanySelection from '../hooks/useCompanySelection.js'

// ─── Helpers ────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const AGENT_INFO = {
  ceo:       { name: 'Co-Founder', emoji: '🧠', color: '#10b981' },
  code:      { name: 'Code',      emoji: '💻', color: '#3b82f6' },
  marketing: { name: 'Marketing', emoji: '📣', color: '#ec4899' },
  email:     { name: 'Email',     emoji: '📧', color: '#f59e0b' },
  research:  { name: 'Research',  emoji: '🔍', color: '#8b5cf6' },
  data:      { name: 'Data',      emoji: '📊', color: '#06b6d4' },
  twitter:   { name: 'Twitter',   emoji: '🐦', color: '#6366f1' },
}

function getAgentInfo(task) {
  const tag = task.tag || task.agent_type || ''
  return AGENT_INFO[tag] || { name: tag || 'Agente', emoji: '🤖', color: '#6b7280' }
}

const STATUS_CONFIG = {
  todo:        { icon: '⏳', label: 'Pendiente', bg: 'bg-gray-700/50', text: 'text-gray-300', border: 'border-gray-600' },
  in_progress: { icon: '⚡', label: 'En progreso', bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' },
  completed:   { icon: '✅', label: 'Completada', bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700' },
  failed:      { icon: '❌', label: 'Fallida', bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700' },
}

const PRIORITY_CONFIG = {
  critical: { label: 'Crítica', text: 'text-red-400', dot: 'bg-red-400' },
  high:     { label: 'Alta', text: 'text-orange-400', dot: 'bg-orange-400' },
  medium:   { label: 'Media', text: 'text-blue-400', dot: 'bg-blue-400' },
  low:      { label: 'Baja', text: 'text-gray-500', dot: 'bg-gray-500' },
}

// ─── Main Component ─────────────────────────────────────────
export default function Backlog() {
  const { companies, selectedCompanyId: selectedCompany, selectCompany: setSelectedCompany } = useCompanySelection()
  const [activeTasks, setActiveTasks] = useState([])
  const [completedTasks, setCompletedTasks] = useState([])
  const [recentChat, setRecentChat] = useState([])
  const [loading, setLoading] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState({})
  const [tab, setTab] = useState('activas')

  const token = localStorage.getItem('token')

  // Fetch backlog data
  const fetchBacklog = useCallback(() => {
    if (!selectedCompany) return
    return fetch(apiUrl(`/api/user/companies/${selectedCompany}/backlog`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setActiveTasks(data.backlog || [])
        setCompletedTasks(data.completed || [])
        setRecentChat(data.recentChat || [])
      })
      .catch(console.error)
  }, [selectedCompany, token])

  useEffect(() => {
    setLoading(true)
    fetchBacklog()?.finally(() => setLoading(false))
  }, [fetchBacklog])

  // Poll every 10s
  useEffect(() => {
    if (!selectedCompany) return
    const interval = setInterval(fetchBacklog, 10000)
    return () => clearInterval(interval)
  }, [selectedCompany, fetchBacklog])

  // Feedback handler
  const handleTaskFeedback = useCallback(async (taskId, rating) => {
    setFeedbackSent(prev => ({ ...prev, [taskId]: rating }))
    try {
      await fetch(apiUrl(`/api/companies/${selectedCompany}/tasks/${taskId}/feedback`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating })
      })
    } catch (e) {
      setFeedbackSent(prev => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
    }
  }, [selectedCompany, token])

  if (companies.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">📋</span>
          <p className="text-gray-400 mt-3">No tienes empresas aún</p>
        </div>
      </div>
    )
  }

  const inProgressTasks = activeTasks.filter(t => t.status === 'in_progress')
  const pendingTasks = activeTasks.filter(t => t.status === 'todo')
  const doneTasks = completedTasks.filter(t => t.status === 'completed')
  const failedTasksList = completedTasks.filter(t => t.status === 'failed')

  const companyName = companies.find(c => c.id === selectedCompany)?.name || ''

  const tabs = [
    { id: 'activas', label: 'Activas', count: activeTasks.length, icon: '⚡' },
    { id: 'completadas', label: 'Completadas', count: doneTasks.length, icon: '✅' },
    { id: 'conversaciones', label: 'Conversaciones', count: recentChat.length, icon: '💬' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <h1 className="text-lg font-bold text-white">
              Cola de Tareas {companyName ? `— ${companyName}` : ''}
            </h1>
          </div>

          {companies.length > 1 && (
            <select
              value={selectedCompany || ''}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="text-sm px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Summary counters */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 text-center">
            <div className="text-xl font-bold text-blue-400">{inProgressTasks.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">En progreso</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 text-center">
            <div className="text-xl font-bold text-amber-400">{pendingTasks.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Pendientes</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 text-center">
            <div className="text-xl font-bold text-green-400">{doneTasks.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Completadas</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 text-center">
            <div className="text-xl font-bold text-red-400">{failedTasksList.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Fallidas</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800/60 rounded-xl border border-gray-700/50 p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full leading-none ${
                  tab === t.id ? 'bg-gray-600 text-gray-200' : 'bg-gray-700 text-gray-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── Tab: Activas ──────────────────────── */}
            {tab === 'activas' && (
              <div className="space-y-3 pt-4">
                {inProgressTasks.length > 0 && (
                  <div className="mb-2">
                    <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>⚡</span> En progreso
                    </h3>
                    <div className="space-y-2">
                      {inProgressTasks.map(task => (
                        <TaskCard key={task.id} task={task} feedbackSent={feedbackSent} onFeedback={handleTaskFeedback} />
                      ))}
                    </div>
                  </div>
                )}

                {pendingTasks.length > 0 && (
                  <div className="mb-2">
                    <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>⏳</span> Pendientes
                    </h3>
                    <div className="space-y-2">
                      {pendingTasks.map(task => (
                        <TaskCard key={task.id} task={task} feedbackSent={feedbackSent} onFeedback={handleTaskFeedback} />
                      ))}
                    </div>
                  </div>
                )}

                {activeTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <span className="text-4xl mb-3">🎉</span>
                    <p className="text-gray-400">Sin tareas activas</p>
                    <p className="text-xs text-gray-600 mt-1">Habla con tu Co-Founder para crear nuevas tareas</p>
                    <a href="/" className="mt-3 text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                      Ir al Chat
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* ─── Tab: Completadas ──────────────────── */}
            {tab === 'completadas' && (
              <div className="space-y-3 pt-4">
                {doneTasks.length > 0 && (
                  <div className="mb-2">
                    <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>✅</span> Completadas
                    </h3>
                    <div className="space-y-2">
                      {doneTasks.map(task => (
                        <TaskCard key={task.id} task={task} feedbackSent={feedbackSent} onFeedback={handleTaskFeedback} />
                      ))}
                    </div>
                  </div>
                )}

                {failedTasksList.length > 0 && (
                  <div className="mb-2">
                    <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>❌</span> Fallidas
                    </h3>
                    <div className="space-y-2">
                      {failedTasksList.map(task => (
                        <TaskCard key={task.id} task={task} feedbackSent={feedbackSent} onFeedback={handleTaskFeedback} />
                      ))}
                    </div>
                  </div>
                )}

                {doneTasks.length === 0 && failedTasksList.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <span className="text-4xl mb-3">📋</span>
                    <p className="text-gray-400">Sin tareas completadas todavía</p>
                    <p className="text-xs text-gray-600 mt-1">Cuando tus agentes terminen tareas aparecerán aquí</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Tab: Conversaciones ───────────────── */}
            {tab === 'conversaciones' && (
              <div className="pt-4">
                {recentChat.length > 0 ? (
                  <div className="space-y-1">
                    {recentChat.map((msg, i) => (
                      <div key={msg.id || i} className="bg-gray-800/60 rounded-xl border border-gray-700/40 px-4 py-3 hover:border-gray-600/60 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'user' ? 'bg-blue-500/15' : 'bg-emerald-500/15'
                          }`}>
                            <span className="text-sm">{msg.role === 'user' ? '👤' : '🧠'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-medium ${
                                msg.role === 'user' ? 'text-blue-400' : 'text-emerald-400'
                              }`}>
                                {msg.role === 'user' ? 'Tú' : 'Co-Founder'}
                              </span>
                              <span className="text-xs text-gray-600">{timeAgo(msg.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {msg.content?.substring(0, 500)}{msg.content?.length > 500 ? '...' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-3 text-center">
                      <a href="/" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                        Ver conversación completa →
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <span className="text-4xl mb-3">💬</span>
                    <p className="text-gray-400">Sin conversaciones aún</p>
                    <p className="text-xs text-gray-600 mt-1">Chatea con tu Co-Founder para empezar</p>
                    <a href="/" className="mt-3 text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                      Ir al Chat
                    </a>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Task Card Component ────────────────────────────────────
function TaskCard({ task, feedbackSent, onFeedback }) {
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const agent = getAgentInfo(task)
  const time = task.completed_at || task.started_at || task.created_at
  const isDone = task.status === 'completed' || task.status === 'failed'

  return (
    <div className={`bg-gray-800/60 rounded-xl border border-gray-700/40 p-4 hover:border-gray-600/60 transition-colors`}>
      <div className="flex items-start gap-3">
        {/* Agent avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{ backgroundColor: agent.color + '18' }}
        >
          {agent.emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + status */}
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="text-sm font-semibold text-white leading-snug">{task.title}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium border rounded-full flex-shrink-0 ${status.bg} ${status.text} ${status.border}`}>
              {status.icon} {status.label}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-gray-400 mb-2 leading-relaxed">{task.description}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Agent */}
            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-700/60 text-gray-400 flex items-center gap-1">
              <span style={{ color: agent.color }}>{agent.emoji}</span>
              {agent.name}
            </span>

            {/* Priority */}
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
              <span className={`text-xs ${priority.text}`}>{priority.label}</span>
            </span>

            {/* Time */}
            <span className="text-xs text-gray-600">{timeAgo(time)}</span>
          </div>

          {/* Error message */}
          {task.error_message && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-xs text-red-300">
              {task.error_message}
            </div>
          )}

          {/* Output preview for completed tasks */}
          {task.output && task.status === 'completed' && (
            <div className="mt-3 p-3 bg-green-900/15 border border-green-800/40 rounded-lg text-xs text-green-300 max-h-32 overflow-y-auto">
              {task.output.substring(0, 300)}{task.output.length > 300 ? '...' : ''}
            </div>
          )}

          {/* Feedback buttons */}
          {isDone && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-700/50">
              <span className="text-xs text-gray-500">¿Resultado útil?</span>
              {feedbackSent[task.id] ? (
                <span className="text-xs text-gray-400">
                  {feedbackSent[task.id] === 'positive' ? '👍 Gracias' : '👎 Anotado'}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => onFeedback(task.id, 'positive')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400 hover:bg-green-500/10 transition-all"
                  >
                    👍 Sí
                  </button>
                  <button
                    onClick={() => onFeedback(task.id, 'negative')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    👎 No
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
