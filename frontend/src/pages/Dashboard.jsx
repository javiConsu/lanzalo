import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LiveFeed from '../components/LiveFeed.jsx'
import GameState from '../components/GameState.jsx'
import { apiUrl } from '../api.js'

export default function Dashboard({ user, onLogout }) {
  const location = useLocation()
  const [activeCompanyId, setActiveCompanyId] = useState(null)

  // Cargar primera empresa del usuario para el LiveFeed
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (d.companies?.[0]) setActiveCompanyId(d.companies[0].id) })
      .catch(() => {})
  }, [])

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/chat'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">🚀 Lanzalo</h1>
          <p className="text-sm text-gray-400 mt-1">Co-fundador IA</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/chat"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive('/') || isActive('/chat')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="text-xl">💬</span>
            <span className="font-medium">Co-Founder Agent</span>
          </Link>

          <Link
            to="/ideas"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive('/ideas')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="text-xl">💡</span>
            <span className="font-medium">Ideas Validadas</span>
          </Link>

          <Link
            to="/backlog"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive('/backlog')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="text-xl">📋</span>
            <span className="font-medium">Backlog</span>
          </Link>

          <Link
            to="/metrics"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive('/metrics')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="text-xl">📊</span>
            <span className="font-medium">Métricas</span>
          </Link>
        </nav>

        {/* Gamificación + Live Feed en sidebar */}
        {activeCompanyId && (
          <div className="p-3 border-t border-gray-700 space-y-2">
            <GameState companyId={activeCompanyId} />
            <LiveFeed companyId={activeCompanyId} />
          </div>
        )}

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email || 'Usuario'}
              </p>
              <p className="text-xs text-gray-400">
                {user?.is_admin ? 'Admin' : 'User'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
