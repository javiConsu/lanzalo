import { apiUrl } from '../api.js'
import { useState, useEffect } from 'react'

export default function Backlog() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  const token = localStorage.getItem('token')

  // Cargar empresas
  useEffect(() => {
    fetch(apiUrl('/api/user/companies', {
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
