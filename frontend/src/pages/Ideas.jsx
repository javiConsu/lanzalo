import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../api.js'

/* ──────────────── Source config ──────────────── */
const SOURCE_CONFIG = {
  reddit:      { icon: '🟠', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  tiktok:      { icon: '🎵', color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/20' },
  youtube:     { icon: '🔴', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  'product hunt': { icon: '🟧', color: 'text-orange-300', bg: 'bg-orange-500/10 border-orange-500/20' },
  producthunt: { icon: '🟧', color: 'text-orange-300', bg: 'bg-orange-500/10 border-orange-500/20' },
  gumroad:     { icon: '💰', color: 'text-pink-300',   bg: 'bg-pink-500/10 border-pink-500/20' },
  hackernews:  { icon: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  twitter:     { icon: '🐦', color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/20' },
  'x':         { icon: '🐦', color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/20' },
  udemy:       { icon: '📚', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  default:     { icon: '🔍', color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20' }
}

function getSourceConfig(source) {
  if (!source) return SOURCE_CONFIG.default
  const key = source.toLowerCase().replace(/\s+/g, '')
  return SOURCE_CONFIG[key] || SOURCE_CONFIG[source.toLowerCase()] || SOURCE_CONFIG.default
}

/* ──────────────── Difficulty config ──────────────── */
const DIFFICULTY_CONFIG = {
  easy:       { label: 'Principiante', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  medium:     { label: 'Intermedio',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
  hard:       { label: 'Avanzado',     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25' },
  default:    { label: 'Intermedio',   color: 'text-gray-400',    bg: 'bg-gray-500/10 border-gray-500/25' }
}

/* ──────────────── Score ring ──────────────── */
function ScoreRing({ score }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  let color = '#6ee7b7' // emerald-300
  if (score >= 90) color = '#34d399'      // emerald-400
  else if (score >= 80) color = '#60a5fa' // blue-400
  else if (score >= 70) color = '#fbbf24' // amber-400
  else color = '#9ca3af'                  // gray-400

  return (
    <div className="relative w-[72px] h-[72px] flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white leading-none">{score}%</span>
        <span className="text-[9px] text-gray-500 leading-none mt-0.5">éxito</span>
      </div>
    </div>
  )
}

/* ──────────────── Evidence parser ──────────────── */
function parseEvidence(evidence) {
  if (!evidence) return []
  const badges = []
  const text = evidence.toLowerCase()

  // Extract numeric metrics
  const likesMatch = evidence.match(/([\d,.]+k?)\s*(likes?|upvotes?|votos?)/i)
  if (likesMatch) badges.push({ icon: '🔥', label: likesMatch[1] + ' likes' })

  const growthMatch = evidence.match(/([\d,.]+%?)\s*(growth|crecimiento)/i)
  if (growthMatch) badges.push({ icon: '📈', label: growthMatch[1] + ' growth' })

  const searchMatch = evidence.match(/([\d,.]+k?)\s*(búsquedas|searches)/i)
  if (searchMatch) badges.push({ icon: '🔍', label: searchMatch[1] + ' búsquedas' })

  // Detect qualitative signals
  if (text.includes('content gap') || text.includes('hueco') || text.includes('gap')) {
    badges.push({ icon: '🟢', label: 'Content Gap', special: true })
  }
  if (text.includes('trending') || text.includes('tendencia')) {
    badges.push({ icon: '📊', label: 'Trending', special: true })
  }
  if (text.includes('poca competencia') || text.includes('low competition')) {
    badges.push({ icon: '💎', label: 'Poca competencia' })
  }
  if (text.includes('recurrente') || text.includes('recurring') || text.includes('suscripción')) {
    badges.push({ icon: '🔄', label: 'Recurrente' })
  }

  return badges
}

/* ──────────────── Category config ──────────────── */
const CATEGORY_LABELS = {
  saas: 'SaaS',
  marketplace: 'Marketplace',
  tool: 'Herramienta',
  service: 'Servicio',
  course: 'Curso',
  community: 'Comunidad',
  app: 'App'
}

/* ──────────────── Idea Card ──────────────── */
function IdeaCard({ idea, onLaunch, launching }) {
  const sourceConfig = getSourceConfig(idea.source)
  const diffConfig = DIFFICULTY_CONFIG[idea.difficulty] || DIFFICULTY_CONFIG.default
  const evidenceBadges = useMemo(() => parseEvidence(idea.evidence), [idea.evidence])

  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all duration-200 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.08)] flex flex-col">
      {/* Top section — Score + Tags */}
      <div className="p-5 pb-0">
        <div className="flex items-start gap-4 mb-4">
          <ScoreRing score={idea.score || 0} />
          <div className="flex-1 min-w-0 pt-1">
            {/* Category + Source tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {idea.category && (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-gray-800 text-gray-400 border border-gray-700 rounded-md">
                  {CATEGORY_LABELS[idea.category] || idea.category}
                </span>
              )}
              <span className={`px-2 py-0.5 text-[10px] font-medium border rounded-md flex items-center gap-1 ${sourceConfig.bg}`}>
                <span className="text-[10px]">{sourceConfig.icon}</span>
                <span className={sourceConfig.color}>{idea.source || 'Trend Scout'}</span>
              </span>
            </div>
            {/* Evidence special badges */}
            <div className="flex flex-wrap gap-1.5">
              {evidenceBadges.filter(b => b.special).map((badge, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-md flex items-center gap-1">
                  <span className="text-[10px]">{badge.icon}</span> {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Title + Problem */}
      <div className="px-5 flex-1">
        <h3 className="text-base font-semibold text-white mb-2 leading-snug">
          {idea.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">
          {idea.problem}
        </p>

        {/* Evidence metrics row */}
        {evidenceBadges.filter(b => !b.special).length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mb-4">
            {evidenceBadges.filter(b => !b.special).map((badge, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[11px]">{badge.icon}</span> {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Audience */}
        {idea.target_audience && (
          <div className="flex items-start gap-2 text-xs mb-4">
            <span className="text-gray-600 flex-shrink-0 mt-px">🎯</span>
            <span className="text-gray-400 line-clamp-1">{idea.target_audience}</span>
          </div>
        )}
      </div>

      {/* Bottom section — Difficulty + Revenue + CTA */}
      <div className="px-5 pb-5 mt-auto">
        {/* Divider */}
        <div className="border-t border-gray-800 pt-4 mb-4">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-600 block mb-0.5">Dificultad</span>
              <span className={`font-semibold ${diffConfig.color}`}>{diffConfig.label}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-600 block mb-0.5">Potencial</span>
              <span className="font-semibold text-emerald-400">{idea.potential_revenue || '—'}</span>
            </div>
          </div>
        </div>

        {/* Source + Date */}
        <div className="flex items-center justify-between text-[11px] text-gray-600 mb-4">
          <span className="flex items-center gap-1">
            Fuente: <span className={`font-medium ${sourceConfig.color}`}>{idea.source || 'Trend Scout'}</span>
          </span>
          <span>{idea.discovered_at ? new Date(idea.discovered_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => onLaunch(idea.id)}
          disabled={launching === idea.id}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {launching === idea.id ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Lanzando...
            </>
          ) : (
            <>🚀 Lánzalo</>
          )}
        </button>
      </div>
    </div>
  )
}

/* ──────────────── Filter Pill ──────────────── */
function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
        active
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-gray-800/60 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  )
}

/* ──────────────── Main Ideas Page ──────────────── */
export default function Ideas() {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('score')
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    loadIdeas()
  }, [])

  const loadIdeas = async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/ideas?minScore=0&limit=50'))
      const data = await res.json()
      setIdeas(data.ideas || [])
    } catch (error) {
      console.error('Error loading ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  /* Derive categories from data */
  const categories = useMemo(() => {
    const cats = [...new Set(ideas.map(i => i.category).filter(Boolean))]
    return cats.sort()
  }, [ideas])

  /* Filtered + sorted ideas */
  const displayIdeas = useMemo(() => {
    let filtered = ideas
    if (activeCategory !== 'all') {
      filtered = filtered.filter(i => i.category === activeCategory)
    }
    const sorted = [...filtered]
    switch (sortBy) {
      case 'score':
        sorted.sort((a, b) => (b.score || 0) - (a.score || 0))
        break
      case 'recent':
        sorted.sort((a, b) => new Date(b.discovered_at) - new Date(a.discovered_at))
        break
      case 'revenue':
        sorted.sort((a, b) => {
          const parseRev = (r) => {
            if (!r) return 0
            const match = r.match(/\$?([\d,.]+)k?/i)
            return match ? parseFloat(match[1].replace(',', '')) : 0
          }
          return parseRev(b.potential_revenue) - parseRev(a.potential_revenue)
        })
        break
      default:
        break
    }
    return sorted
  }, [ideas, activeCategory, sortBy])

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

  /* Stats bar */
  const avgScore = ideas.length
    ? Math.round(ideas.reduce((sum, i) => sum + (i.score || 0), 0) / ideas.length)
    : 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white mb-1">
          💡 Descubre Ideas Validadas
        </h1>
        <p className="text-sm text-gray-500">
          Ideas de negocio validadas con datos reales. Lanza la que más te guste.
        </p>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex-shrink-0 px-6 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterPill
              label="Todas"
              active={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
            />
            {categories.map(cat => (
              <FilterPill
                key={cat}
                label={CATEGORY_LABELS[cat] || cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>

          <div className="flex-1" />

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-gray-800/60 border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-gray-700 appearance-none cursor-pointer"
            >
              <option value="score">Más probable éxito</option>
              <option value="recent">Más recientes</option>
              <option value="revenue">Mayor potencial</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Ideas Grid ── */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Cargando ideas...</span>
            </div>
          </div>
        ) : displayIdeas.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-40">💡</div>
              <p className="text-gray-400 mb-2">No hay ideas con estos filtros</p>
              <button
                onClick={() => { setActiveCategory('all'); setSortBy('score') }}
                className="text-emerald-400 hover:text-emerald-300 text-sm"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {displayIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onLaunch={handleLaunchIdea}
                launching={launching}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer stats ── */}
      {!loading && ideas.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-800 px-6 py-3">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <span>
              <span className="text-gray-300 font-medium">{displayIdeas.length}</span>
              {displayIdeas.length !== ideas.length && <span className="text-gray-600">/{ideas.length}</span>}
              {' '}ideas
            </span>
            <span className="text-gray-800">·</span>
            <span>
              Score medio: <span className="text-gray-300 font-medium">{avgScore}%</span>
            </span>
            <span className="text-gray-800">·</span>
            <span>
              Fuentes: <span className="text-gray-300 font-medium">{[...new Set(ideas.map(i => i.source).filter(Boolean))].length}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
