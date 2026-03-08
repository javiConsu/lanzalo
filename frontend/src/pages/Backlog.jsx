import { apiUrl } from '../api.js'
import { useState, useEffect, useCallback } from 'react'

export default function Backlog() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState({})

  const token = localStorage.getItem('token')

  // Cargar empresas
  useEffect(() => {
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.companies?.length > 0) {
          setCompanies(data.companies)
          setSelectedCompany(data.companies[0].id)
        }
      })
      .catch(console.error)
  }, [token])

  // Cargar backlog
  useEffect(() => {
    if (selectedCompany) {
      setLoading(true)
      fetch(`/api/user/companies/${selectedCompany}/backlog`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setTasks(data.backlog || [])
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [selectedCompany, token])

  // Polling para actualizar cada 10s
  useEffect(() => {
    if (!selectedCompany) return

    const interval = setInterval(() => {
      fetch(`/api/user/companies/${selectedCompany}/backlog`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setTasks(data.backlog || []))
        .catch(console.error)
    }, 10000)

    return () => clearInterval(interval)
  }, [selectedCompany, token])

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-900/50 text-green-300 border-green-700'
      case 'failed': return 'bg-red-900/50 text-red-300 border-red-700'
      case 'in_progress': return 'bg-blue-900/50 text-blue-300 border-blue-700'
      case 'blocked': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
      default: return 'bg-gray-700 text-gray-300 border-gray-600'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-400'
      case 'high': return 'text-orange-400'
      case 'medium': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  // Feedback handler for tasks
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

  const getAgentIcon = (agentId) => {
    const icons = {
      'code-agent': '💻',
      'research-agent': '🔍',
      'browser-agent': '🌐',
      'twitter-agent': '🐦',
      'email-agent': '📧',
      'data-agent': '📊'
    }
    return icons[agentId] || '🤖'
  }

  if (companies.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">No tienes empresas aún</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <select
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="text-sm text-gray-400">
            {tasks.length} tareas pendientes
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Cargando...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-400 mb-2">No hay tareas en el backlog</p>
              <p className="text-sm text-gray-500">Chatea con CEO Agent para crear tareas</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <div
                key={task.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Agent icon */}
                  <div className="text-3xl">
                    {getAgentIcon(task.assigned_to)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {task.title}
                      </h3>

                      <div className="flex items-center gap-2">
                        {/* Priority */}
                        <span className={`text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                          {task.priority?.toUpperCase()}
                        </span>

                        {/* Status */}
                        <span className={`px-3 py-1 text-xs font-medium border rounded-full ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mb-3">
                      {task.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Tag: {task.tag}</span>
                      <span>•</span>
                      <span>Asignado a: {task.assigned_to}</span>
                      {task.created_at && (
                        <>
                          <span>•</span>
                          <span>Creado: {new Date(task.created_at).toLocaleString()}</span>
                        </>
                      )}
                    </div>

                    {task.error_message && (
                      <div className="mt-3 p-3 bg-red-900/20 border border-red-800 rounded text-sm text-red-300">
                        Error: {task.error_message}
                      </div>
                    )}

                    {task.output && task.status === 'completed' && (
                      <div className="mt-3 p-3 bg-green-900/20 border border-green-800 rounded text-sm text-green-300">
                        ✅ Completado
                      </div>
                    )}

                    {/* Feedback buttons for completed/failed tasks */}
                    {(task.status === 'completed' || task.status === 'failed') && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-700">
                        <span className="text-xs text-gray-500">¿Resultado útil?</span>
                        <button
                          onClick={() => handleTaskFeedback(task.id, 'positive')}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                            feedbackSent[task.id] === 'positive'
                              ? 'bg-green-900/40 text-green-400 border border-green-700'
                              : 'text-gray-500 hover:text-green-400 hover:bg-green-900/20'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={feedbackSent[task.id] === 'positive' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
                          </svg>
                          Sí
                        </button>
                        <button
                          onClick={() => handleTaskFeedback(task.id, 'negative')}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                            feedbackSent[task.id] === 'negative'
                              ? 'bg-red-900/40 text-red-400 border border-red-700'
                              : 'text-gray-500 hover:text-red-400 hover:bg-red-900/20'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={feedbackSent[task.id] === 'negative' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
                          </svg>
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
