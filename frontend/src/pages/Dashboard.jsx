/**
 * Dashboard layout — Barra superior compacta + contenido principal
 * Inspirado en Polsia (todo en un vistazo) + Clawport (navegación limpia)
 */
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { apiUrl } from '../api.js'

export default function Dashboard({ user, onLogout }) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const navItems = [
    { path: '/', icon: '🏠', label: 'Dashboard' },
    { path: '/chat', icon: '💬', label: 'Chat' },
    { path: '/ideas', icon: '💡', label: 'Ideas' },
    { path: '/backlog', icon: '📋', label: 'Backlog' },
    { path: '/metrics', icon: '📊', label: 'Métricas' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top Bar */}
      <header className="h-14 bg-gray-900/95 border-b border-gray-800 flex items-center px-4 gap-4 flex-shrink-0 z-10">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <span className="text-base">🚀</span>
          </div>
          <span className="text-base font-bold text-white hidden sm:inline">Lánzalo</span>
        </Link>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive(item.path)
                  ? 'bg-emerald-500/15 text-emerald-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span className="text-xs">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto text-gray-400 hover:text-white p-1"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          {/* Trial badge */}
          {user?.plan === 'trial' && user?.trialEndsAt && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
              Trial · {Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / 86400000))}d
            </span>
          )}

          {/* Admin link */}
          {user?.is_admin && (
            <a
              href="/admin"
              className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 hover:bg-purple-500/25 transition-colors"
            >
              👑 Admin
            </a>
          )}

          {/* User menu */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
            <div className="w-7 h-7 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <button
              onClick={onLogout}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="md:hidden bg-gray-900 border-b border-gray-800 px-4 py-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                isActive(item.path)
                  ? 'bg-emerald-500/15 text-emerald-400 font-medium'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500">{user?.email}</span>
            <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-300">
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
