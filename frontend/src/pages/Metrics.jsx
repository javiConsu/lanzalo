import { apiUrl } from '../api.js'
import { useState, useEffect } from 'react'
import useCompanySelection from '../hooks/useCompanySelection.js'

export default function Metrics() {
  const { companies, selectedCompanyId: selectedCompany, selectCompany: setSelectedCompany } = useCompanySelection()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)

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

  // Cargar métricas cuando cambia empresa
  useEffect(() => {
    if (selectedCompany) {
      loadMetrics()
    }
  }, [selectedCompany])

  const loadMetrics = async () => {
    setLoading(true)
    
    try {
      // Pedir al Data Agent que calcule métricas
      const res = await fetch(`/api/user/companies/${selectedCompany}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Calcular métricas',
          description: 'Calcular todas las métricas de la empresa',
          tag: 'data',
          priority: 'high'
        })
      })

      // Esperar un poco para que el agente procese
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Cargar métricas mock mientras tanto (en producción vendría del agente)
      const mockMetrics = {
        tasks: {
          total: 12,
          completed: 8,
          failed: 1,
          in_progress: 2,
          pending: 1
        },
        emails: {
          total: 5,
          sent: 3,
          opened: 2,
          clicked: 1
        },
        tweets: {
          total: 3,
          published: 0
        },
        features: {
          total: 4,
          list: ['Analytics', 'Blog', 'Contact form', 'SEO']
        }
      }

      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, total, icon, color = 'blue' }) => {
    const percentage = total ? Math.round((value / total) * 100) : 0

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
          <span className="text-2xl">{icon}</span>
        </div>
        
        <div className="flex items-end gap-2 mb-2">
          <span className={`text-3xl font-bold text-${color}-400`}>
            {value}
          </span>
          {total && (
            <span className="text-lg text-gray-500 mb-1">/ {total}</span>
          )}
        </div>

        {total && (
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className={`bg-${color}-500 h-2 rounded-full transition-all`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}

        {total && (
          <p className="text-xs text-gray-500">{percentage}% completado</p>
        )}
      </div>
    )
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">📊</span>
            <h1 className="text-lg font-bold text-white">Métricas</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadMetrics}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>

            {companies.length > 1 && (
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="text-sm px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && !metrics ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Calculando métricas...</div>
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Tareas Completadas"
                value={metrics.tasks.completed}
                total={metrics.tasks.total}
                icon="✅"
                color="green"
              />

              <StatCard
                title="Emails Enviados"
                value={metrics.emails.sent}
                total={metrics.emails.total}
                icon="📧"
                color="blue"
              />

              <StatCard
                title="Email Open Rate"
                value={`${metrics.emails.opened}/${metrics.emails.sent}`}
                icon="📬"
                color="purple"
              />

              <StatCard
                title="Tweets Generados"
                value={metrics.tweets.total}
                icon="🐦"
                color="cyan"
              />
            </div>

            {/* Features List */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Features Implementadas ({metrics.features.total})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {metrics.features.list.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-gray-300 bg-gray-700/50 px-3 py-2 rounded"
                  >
                    <span className="text-green-400">✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Breakdown */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Estado de Tareas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {metrics.tasks.completed}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Completadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {metrics.tasks.in_progress}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">En Progreso</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">
                    {metrics.tasks.pending}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Pendientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {metrics.tasks.failed}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Fallidas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {metrics.tasks.total}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Total</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-400 mb-2">No hay métricas disponibles</p>
              <button
                onClick={loadMetrics}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Calcular métricas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
