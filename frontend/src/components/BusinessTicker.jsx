/**
 * Business Ticker — Muestra última empresa creada estilo Twitter/X
 * Animación: 4-5 segundos por negocio con fade in/out
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../api.js'

export default function BusinessTicker({ user }) {
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentCompanyIndex, setCurrentCompanyIndex] = useState(0)
  const [opacity, setOpacity] = useState(0)

  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchLatestCompany()
  }, [])

  useEffect(() => {
    if (!company) return

    // Fade out
    setOpacity(0)

    const timeout = setTimeout(() => {
      setCurrentCompanyIndex((prev) => (prev + 1) % 3)
      setOpacity(1)
    }, 5000) // 5 segundos por negocio

    return () => clearTimeout(timeout)
  }, [company, currentCompanyIndex])

  const fetchLatestCompany = async () => {
    try {
      const res = await fetch(apiUrl('/api/companies/last'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setCompany(data.company)
      setOpacity(1)
    } catch (error) {
      console.error('Error cargando empresa:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  if (!company) {
    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl p-4 border border-gray-700/50">
        <div className="text-sm text-gray-400 mb-2">
          🚀 Tu último negocio
        </div>
        <div className="text-sm text-gray-500">
          Crea tu primer negocio en {user?.email}
        </div>
      </div>
    )
  }

  const categoryIcons = {
    saas: '💻',
    marketplace: '🛒',
    tool: '🔧',
    service: '🤝',
    content: '📝'
  }

  const handleClick = () => {
    navigate('/chat')
  }

  return (
    <div
      className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-700/50 cursor-pointer transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
      onClick={handleClick}
      style={{ transition: 'opacity 0.5s ease-in-out', opacity }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-white">
            {company.name?.[0]?.toUpperCase() || '🚀'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white line-clamp-1">
              {company.name}
            </span>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
              Creado hace 2h
            </span>
          </div>
          <div className="text-xs text-gray-400 mb-2">
            {company.subdomain}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-full">
              {categoryIcons[company.industry] || '🚀'}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(company.created_at).toLocaleDateString('es-ES', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-lg font-bold text-green-400">
            💡
          </div>
        </div>
      </div>
    </div>
  )
}
