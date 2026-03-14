import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { apiUrl } from '../api.js'
import TrialBadge from '../components/TrialBadge.jsx'

const NAV_ITEMS = [
  { path: '/chat', label: 'Bender' },
  // { path: '/ideas', label: 'Ideas' },
  // { path: '/backlog', label: 'Backlog' },
  // { path: '/metrics', label: 'Métricas' },
  // { path: '/company', label: 'Control' },
  // { path: '/live', label: 'Live Feed' },
]

export default function Dashboard({ user, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const isActive = (path) => {
    if (path === '/chat') return location.pathname === '/' || location.pathname === '/chat'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] flex flex-col font-sans">
      {/* Header mínimo */}
      <header className="h-11 flex items-center justify-between px-4 border-b border-[#21262d] flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 border border-[#30363d] rounded flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-mono font-bold text-[#c9d1d9]">LZ</span>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Lanzalo</span>
        </div>

        {/* Derecha: trial + nav hamburger + user */}
        <div className="flex items-center gap-3">
          <TrialBadge user={user} />

          {/* Hamburger nav */}
          <div className="relative">
            <button
              onClick={() => { setMenuOpen(!menuOpen); setUserMenuOpen(false) }}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-[#30363d] rounded hover:border-[#8b949e] transition-colors"
            >
              <span className="text-xs font-mono text-[#8b949e]">≡</span>
            </button>
            {menuOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-[#161b22] border border-[#30363d] rounded shadow-2xl z-50 overflow-hidden">
                {NAV_ITEMS.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-2 text-xs transition-colors ${
                      isActive(item.path)
                        ? 'text-white bg-[#21262d]'
                        : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setMenuOpen(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#30363d] rounded hover:border-[#8b949e] transition-colors"
            >
              <span className="w-4 h-4 bg-[#21262d] rounded flex items-center justify-center font-mono text-[9px] text-[#8b949e]">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
              <span className="text-[10px] font-mono text-[#8b949e] hidden sm:inline max-w-[100px] truncate">
                {user?.email || 'usuario'}
              </span>
            </button>
            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-[#161b22] border border-[#30363d] rounded shadow-2xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-[#21262d]">
                  <p className="text-[10px] font-mono text-[#8b949e] truncate">{user?.email}</p>
                  <p className="text-[10px] font-mono text-[#484f58]">{user?.is_admin ? 'admin' : 'pro'}</p>
                </div>
                <Link
                  to="/dashboard/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-3 py-2 text-xs text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                >
                  ajustes
                </Link>
                {user?.is_admin && (
                  <a
                    href="/admin"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-3 py-2 text-xs text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                  >
                    admin
                  </a>
                )}
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 text-xs text-[#8b949e] hover:text-red-400 hover:bg-[#21262d] transition-colors border-t border-[#21262d]"
                >
                  salir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Click-fuera para cerrar menús */}
      {(menuOpen || userMenuOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setUserMenuOpen(false) }} />
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
