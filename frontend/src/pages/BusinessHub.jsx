/**
 * Business Hub — Lista de negocios del usuario
 * Si tiene 0 negocios → redirige a onboarding
 * Si tiene 1+ → muestra grid con estado de cada uno
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../api.js'

export default function BusinessHub() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setCompanies(d.companies || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (companies.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
            <span className="text-4xl">🚀</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">¡Lanza tu primer negocio!</h2>
          <p className="text-gray-400 mb-6">
            Describe tu idea y nosotros nos encargamos del resto: web, marketing, emails, todo.
          </p>
          <button
            onClick={() => navigate('/onboarding/choose-path')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            Crear mi negocio 🔥
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Tus negocios</h2>
        <button
          onClick={() => navigate('/onboarding/choose-path')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2"
        >
          <span>+</span> Nuevo negocio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map(company => (
          <div
            key={company.id}
            onClick={() => navigate('/chat')}
            className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 hover:border-blue-500/50 cursor-pointer transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {company.name}
                </h3>
                {company.tagline && (
                  <p className="text-sm text-gray-400 mt-1">{company.tagline}</p>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                company.status === 'live' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {company.status === 'live' ? '🟢 Activo' : '🟡 En construcción'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              {company.subdomain && (
                <span>🌐 {company.subdomain}</span>
              )}
              <span>📋 {company.tasks_count || 0} tareas</span>
              {company.last_activity && (
                <span>⏰ {new Date(company.last_activity).toLocaleDateString('es-ES')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
