import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LiveFeed from '../components/LiveFeed.jsx'
import GameState from '../components/GameState.jsx'
import { apiUrl } from '../api.js'
import TrialBadge from '../components/TrialBadge.jsx'
import CreditsBadge from '../components/CreditsBadge.jsx'

export default function Dashboard({ user, onLogout }) {
  const location = useLocation()
  const [activeCompanyId, setActiveCompanyId] = useState(null)
  const [stats, setStats] = useState({
    ideas: 0,
    agents: 7,
    validations: 0,
    discoveries: 0
  })

  // Cargar primera empresa del usuario para el LiveFeed
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Cargar stats de la empresa
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.companies?.[0]) {
          setActiveCompanyId(d.companies[0].id)

          // Cargar stats de la empresa
          fetch(apiUrl(`/api/company/${d.companies[0].id}/stats`), {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(r => r.json())
            .then(statsData => {
              setStats({
                ideas: statsData.ideas_count || 0,
                agents: statsData.active_agents || 7,
                validations: statsData.validations_count || 0,
                discoveries: statsData.discoveries_count || 0
              })
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/chat'
    return location.pathname.startsWith(path)
  }

  const menuItems = [
    { path: '/chat', icon: '💬', label: 'Co-Founder Agent' },
    { path: '/ideas', icon: '💡', label: 'Ideas Validadas' },
    { path: '/backlog', icon: '📋', label: 'Backlog' },
    { path: '/metrics', icon: '📊', label: 'Métricas' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Sidebar Panel */}
      <div className="w-72 bg-gray-900/95 backdrop-blur-xl border-r border-gray-700/50 flex flex-col">
        {/* Header con gradiente */}
        <div className="p-6 bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-pink-900/30 border-b border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Lanzalo
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Co-Fundador IA</p>
            </div>
          </div>
        </div>

        {/* Trial + Créditos */}
        <div className="px-4 pt-3 flex flex-col gap-2">
          <TrialBadge user={user} />
          <CreditsBadge user={user} />
        </div>

        {/* Stats rápidas */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 hover:border-blue-500/50 transition-all">
            <div className="text-2xl mb-1">💡</div>
            <div className="text-lg font-bold text-white">{stats.ideas}</div>
            <div className="text-xs text-gray-400">Ideas</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 hover:border-purple-500/50 transition-all">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-lg font-bold text-white">{stats.validations}</div>
            <div className="text-xs text-gray-400">Validadas</div>
          </div>
        </div>

        {/* Menu principal */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 text-white'
                  : 'text-gray-400 hover:bg-gray-800/80 hover:text-white'
              }`}
            >
              <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${isActive(item.path) ? 'drop-shadow-md' : ''}`}>
                {item.icon}
              </span>
              <span className={`font-medium transition-all ${isActive(item.path) ? 'tracking-wide' : ''}`}>
                {item.label}
              </span>
              {isActive(item.path) && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-lg" />
              )}
            </Link>
          ))}
        </nav>

        {/* Área gamificación + Live Feed */}
        {activeCompanyId && (
          <div className="p-4 space-y-3">
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-3 border border-gray-700/50">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <span>⚡</span> Agentes Activos
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500" 
                       style={{ width: '100%' }}
                  />
                </div>
                <span className="text-sm font-bold text-green-400">{stats.agents}/7</span>
              </div>
            </div>
            <LiveFeed companyId={activeCompanyId} />
          </div>
        )}

        {/* Footer con usuario */}
        <div className="p-4 bg-gradient-to-t from-gray-900 to-transparent border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.email || 'Usuario'}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span>
                  {user?.is_admin ? 'Admin' : 'Pro Plan'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {user?.is_admin && (
                <a
                  href="/admin"
                  className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl transition-all text-sm font-medium flex items-center gap-2"
                >
                  <span>👑</span>
                  Admin Panel
                </a>
              )}
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-red-500/20 hover:from-red-600/30 hover:to-red-500/30 border border-red-500/30 text-red-300 rounded-xl transition-all text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-red-500/15"
              >
                <span>🚪</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}