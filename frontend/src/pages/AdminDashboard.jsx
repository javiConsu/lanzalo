/**
 * Admin Dashboard — Placeholder
 * TODO: Implementar panel completo con métricas y gestión de empresas
 */
import { useState, useEffect } from 'react'
import { apiUrl } from '../api.js'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch(apiUrl('/api/admin/stats'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">👑</span>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <a href="/" className="ml-auto text-sm text-gray-400 hover:text-white">← Volver al dashboard</a>
        </div>

        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="text-gray-400 text-sm mb-1">Usuarios totales</div>
              <div className="text-2xl font-bold text-white">{stats.total_users || 0}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="text-gray-400 text-sm mb-1">Empresas activas</div>
              <div className="text-2xl font-bold text-white">{stats.total_companies || 0}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="text-gray-400 text-sm mb-1">Usuarios Pro</div>
              <div className="text-2xl font-bold text-white">{stats.pro_users || 0}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">Cargando estadísticas...</div>
        )}
      </div>
    </div>
  )
}
