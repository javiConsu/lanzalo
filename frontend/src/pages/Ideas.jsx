import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../api.js'

export default function Ideas() {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    difficulty: '',
    minScore: 70
  })
  const [launching, setLaunching] = useState(null)

  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    loadIdeas()
  }, [filters])

  const loadIdeas = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.category) params.append('category', filters.category)
      if (filters.difficulty) params.append('difficulty', filters.difficulty)
      params.append('minScore', filters.minScore)
      params.append('limit', 20)

      const res = await fetch(apiUrl(`/api/ideas?${params}`))
      const data = await res.json()
      setIdeas(data.ideas || [])
    } catch (error) {
      console.error('Error loading ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLaunchIdea = async (ideaId) => {
    if (!token) {
      alert('Debes iniciar sesión para lanzar una idea')
      navigate('/')
      return
    }

    setLaunching(ideaId)

    try {
      const res = await fetch(apiUrl(`/api/ideas/${ideaId}/launch`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()

      if (data.success) {
        alert(`¡Empresa creada! ${data.company.subdomain}\n\n${data.message}`)
        navigate('/chat')
      } else {
        alert('Error: ' + (data.error || 'No se pudo lanzar la idea'))
      }
    } catch (error) {
      console.error('Error launching idea:', error)
      alert('Error de conexión')
    } finally {
      setLaunching(null)
    }
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-900/50 text-green-300 border-green-700'
      case 'medium': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
      case 'hard': return 'bg-red-900/50 text-red-300 border-red-700'
      default: return 'bg-gray-700 text-gray-300'
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'saas': return '💻'
      case 'marketplace': return '🛒'
      case 'tool': return '🔧'
      case 'service': return '🤝'
      default: return '💡'
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 80) return 'text-blue-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-gray-400'
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          💡 Ideas Validadas con Demanda Real
        </h1>
        <p className="text-gray-400">
          {ideas.length} oportunidades descubiertas por Trend Scout Agent
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Category filter */}
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            <option value="saas">💻 SaaS</option>
            <option value="marketplace">🛒 Marketplace</option>
            <option value="tool">🔧 Tool</option>
            <option value="service">🤝 Service</option>
          </select>

          {/* Difficulty filter */}
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las dificultades</option>
            <option value="easy">⚡ Easy</option>
            <option value="medium">📊 Medium</option>
            <option value="hard">🔥 Hard</option>
          </select>

          {/* Score filter */}
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-sm">Score mínimo:</label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={filters.minScore}
              onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
              className="w-32"
            />
            <span className="text-white font-semibold w-8">{filters.minScore}</span>
          </div>

          <div className="flex-1" />

          <button
            onClick={loadIdeas}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Cargando ideas...</div>
          </div>
        ) : ideas.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
                <span className="text-4xl">💡</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Buscando oportunidades...</h2>
              <p className="text-gray-400 mb-4">
                Estamos analizando tendencias para encontrar ideas con demanda real.
              </p>
              <button
                onClick={() => setFilters({ category: '', difficulty: '', minScore: 0 })}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/25"
              >
                Ver todas las ideas
              </button>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <a
                  href="/onboarding/choose-path"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  ¿No encuentras tu idea? Explora nuestros recursos →
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all hover:shadow-xl"
              >
                {/* Score Badge */}
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-4xl font-bold ${getScoreColor(idea.score)}`}>
                    {idea.score}
                  </span>
                  <span className="text-4xl">
                    {getCategoryIcon(idea.category)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-3 min-h-[3rem]">
                  {idea.title}
                </h3>

                {/* Problem */}
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                  {idea.problem}
                </p>

                {/* Metadata */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Audiencia:</span>
                    <span className="text-gray-300">{idea.target_audience}</span>
                  </div>
                </div>

                {/* Evidence */}
                <div className="mb-4 p-3 bg-gray-900/50 rounded border border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Evidencia de demanda:</p>
                  <p className="text-sm text-gray-300 line-clamp-2">{idea.evidence}</p>
                </div>

                {/* Source */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <span>Fuente:</span>
                  <span className="text-gray-400">{idea.source}</span>
                  <span>•</span>
                  <span>{new Date(idea.discovered_at).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLaunchIdea(idea.id)}
                    disabled={launching === idea.id}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {launching === idea.id ? 'Lanzando...' : '🚀 Lanzar Idea'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {ideas.length > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
            <span>
              Mostrando <span className="text-white font-semibold">{ideas.length}</span> ideas
            </span>
            <span>•</span>
            <span>
              Score promedio: <span className="text-white font-semibold">
                {Math.round(ideas.reduce((sum, i) => sum + i.score, 0) / ideas.length)}
              </span>
            </span>
            <span>•</span>
            <span>
              Top categoría: <span className="text-white font-semibold capitalize">
                {ideas.reduce((acc, i) => {
                  acc[i.category] = (acc[i.category] || 0) + 1
                  return acc
                }, {})}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
