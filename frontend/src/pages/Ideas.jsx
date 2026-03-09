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
  easy:    { label: 'Principiante', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  medium:  { label: 'Intermedio',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
  hard:    { label: 'Avanzado',     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25' },
  default: { label: 'Intermedio',   color: 'text-gray-400',    bg: 'bg-gray-500/10 border-gray-500/25' }
}

/* ──────────────── Category labels ──────────────── */
const CATEGORY_LABELS = {
  saas: 'SaaS', marketplace: 'Marketplace', tool: 'Herramienta',
  service: 'Servicio', course: 'Curso', community: 'Comunidad',
  app: 'App', template: 'Template', content: 'Contenido'
}

/* ──────────────── Tab config ──────────────── */
const TABS = [
  { id: 'para_ti',   label: 'Para tu negocio', icon: '🎯', desc: 'Ideas relacionadas con tu proyecto actual' },
  { id: 'intereses', label: 'Tus intereses',    icon: '💡', desc: 'Basadas en tu perfil y experiencia' },
  { id: 'descubre',  label: 'Descubre',         icon: '🔮', desc: 'Nuevas oportunidades fuera de tu nicho' },
]

/* ──────────────── Score ring ──────────────── */
function ScoreRing({ score, size = 72 }) {
  const radius = size === 72 ? 28 : 20
  const viewBox = size === 72 ? 64 : 48
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  let color = '#9ca3af'
  if (score >= 90) color = '#34d399'
  else if (score >= 80) color = '#60a5fa'
  else if (score >= 70) color = '#fbbf24'

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <circle cx={viewBox/2} cy={viewBox/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
        <circle
          cx={viewBox/2} cy={viewBox/2} r={radius} fill="none"
          stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${size === 72 ? 'text-lg' : 'text-sm'} font-bold text-white leading-none`}>{score}%</span>
        <span className="text-[8px] text-gray-500 leading-none mt-0.5">éxito</span>
      </div>
    </div>
  )
}

/* ──────────────── Evidence parser ──────────────── */
function parseEvidence(evidence) {
  if (!evidence) return []
  const badges = []
  const text = evidence.toLowerCase()

  const likesMatch = evidence.match(/([\d,.]+k?)\s*(likes?|upvotes?|votos?)/i)
  if (likesMatch) badges.push({ icon: '🔥', label: likesMatch[1] + ' likes' })
  const growthMatch = evidence.match(/([\d,.]+%?)\s*(growth|crecimiento)/i)
  if (growthMatch) badges.push({ icon: '📈', label: growthMatch[1] + ' growth' })
  const searchMatch = evidence.match(/([\d,.]+k?)\s*(búsquedas|searches)/i)
  if (searchMatch) badges.push({ icon: '🔍', label: searchMatch[1] + ' búsquedas' })

  if (text.includes('content gap') || text.includes('hueco') || text.includes('gap'))
    badges.push({ icon: '🟢', label: 'Content Gap', special: true })
  if (text.includes('trending') || text.includes('tendencia'))
    badges.push({ icon: '📊', label: 'Trending', special: true })
  if (text.includes('poca competencia') || text.includes('low competition'))
    badges.push({ icon: '💎', label: 'Poca competencia' })
  if (text.includes('recurrente') || text.includes('recurring') || text.includes('suscripción'))
    badges.push({ icon: '🔄', label: 'Recurrente' })

  return badges
}

/* ──────────────── Locked Card ──────────────── */
function LockedIdeaCard({ idea }) {
  const sourceConfig = getSourceConfig(idea.source)
  const diffConfig = DIFFICULTY_CONFIG[idea.difficulty] || DIFFICULTY_CONFIG.default

  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden relative group">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-gray-950/40 z-10 flex flex-col items-center justify-center rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center mb-3">
          <span className="text-xl">🔒</span>
        </div>
        <p className="text-sm text-gray-400 font-medium">Idea bloqueada</p>
        <p className="text-xs text-gray-600 mt-1">Hazte Pro para desbloquear</p>
      </div>

      {/* Blurred content underneath */}
      <div className="p-5 opacity-60 select-none">
        <div className="flex items-start gap-4 mb-4">
          <ScoreRing score={idea.score || 0} />
          <div className="flex-1 pt-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {idea.category && (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-gray-800 text-gray-500 border border-gray-700 rounded-md">
                  {CATEGORY_LABELS[idea.category] || idea.category}
                </span>
              )}
              {idea.source && (
                <span className={`px-2 py-0.5 text-[10px] font-medium border rounded-md flex items-center gap-1 ${sourceConfig.bg}`}>
                  <span className="text-[10px]">{sourceConfig.icon}</span>
                  <span className={sourceConfig.color}>{idea.source}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-800/60 rounded w-full mb-1" />
        <div className="h-3 bg-gray-800/60 rounded w-2/3 mb-4" />
        <div className="border-t border-gray-800 pt-4 flex justify-between text-xs">
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
    </div>
  )
}

/* ──────────────── Analysis Panel ──────────────── */
function AnalysisPanel({ ideaId, onClose }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')

  useEffect(() => {
    loadAnalysis()
  }, [ideaId])

  const loadAnalysis = async () => {
    setLoading(true)
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const res = await fetch(apiUrl(`/api/ideas/${ideaId}/analysis`), { headers })
      const data = await res.json()
      setAnalysis(data.analysis || null)
    } catch (e) {
      console.error('Error loading analysis:', e)
    } finally {
      setLoading(false)
    }
  }

  const metrics = analysis?.metrics
  const parsedMetrics = typeof metrics === 'string' ? JSON.parse(metrics) : (metrics || {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-gray-900 border-l border-gray-800 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold text-white">Análisis detallado</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg">&times;</button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Generando análisis con IA...</span>
            </div>
          ) : !analysis ? (
            <p className="text-gray-500 text-sm text-center py-16">No se pudo generar el análisis</p>
          ) : (
            <div className="space-y-6">
              {/* Why it works */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Por qué va a funcionar</h4>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis.why_it_works}</p>
              </div>

              {/* Metrics grid */}
              {Object.keys(parsedMetrics).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">Métricas clave</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {parsedMetrics.demand_signals && (
                      <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Señales de demanda</span>
                        <span className="text-sm text-white font-medium">{parsedMetrics.demand_signals}</span>
                      </div>
                    )}
                    {parsedMetrics.monthly_searches && (
                      <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Búsquedas/mes</span>
                        <span className="text-sm text-white font-medium">{parsedMetrics.monthly_searches}</span>
                      </div>
                    )}
                    {parsedMetrics.growth_trend && (
                      <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Tendencia</span>
                        <span className="text-sm text-white font-medium">{parsedMetrics.growth_trend}</span>
                      </div>
                    )}
                    {parsedMetrics.competition_count && (
                      <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Competidores</span>
                        <span className="text-sm text-white font-medium">{parsedMetrics.competition_count}</span>
                      </div>
                    )}
                    {parsedMetrics.entry_barrier && (
                      <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Barrera de entrada</span>
                        <span className="text-sm text-white font-medium capitalize">{parsedMetrics.entry_barrier}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Market size */}
              {analysis.market_size && (
                <div>
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Tamaño de mercado</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{analysis.market_size}</p>
                </div>
              )}

              {/* Time to MVP */}
              {analysis.time_to_mvp && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Tiempo al MVP</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{analysis.time_to_mvp}</p>
                </div>
              )}

              {/* Monetization */}
              {analysis.monetization_strategy && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Estrategia de monetización</h4>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis.monetization_strategy}</p>
                </div>
              )}

              {/* Risks */}
              {analysis.risk_factors && (
                <div>
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Riesgos</h4>
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{analysis.risk_factors}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ──────────────── Idea Card (unlocked) ──────────────── */
function IdeaCard({ idea, onLaunch, onDismiss, onAnalysis, launching }) {
  const sourceConfig = getSourceConfig(idea.source)
  const diffConfig = DIFFICULTY_CONFIG[idea.difficulty] || DIFFICULTY_CONFIG.default
  const evidenceBadges = useMemo(() => parseEvidence(idea.evidence), [idea.evidence])

  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all duration-200 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.08)] flex flex-col group">
      {/* Top — Score + Tags */}
      <div className="p-5 pb-0">
        <div className="flex items-start gap-4 mb-4">
          <ScoreRing score={idea.score || 0} />
          <div className="flex-1 min-w-0 pt-1">
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
            <div className="flex flex-wrap gap-1.5">
              {evidenceBadges.filter(b => b.special).map((badge, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-md flex items-center gap-1">
                  <span className="text-[10px]">{badge.icon}</span> {badge.label}
                </span>
              ))}
            </div>
          </div>
          {/* Dismiss button */}
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(idea.id) }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-400 text-xs p-1"
            title="No me interesa"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Title + Problem */}
      <div className="px-5 flex-1">
        <h3 className="text-base font-semibold text-white mb-2 leading-snug">{idea.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">{idea.problem}</p>

        {evidenceBadges.filter(b => !b.special).length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mb-4">
            {evidenceBadges.filter(b => !b.special).map((badge, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[11px]">{badge.icon}</span> {badge.label}
              </span>
            ))}
          </div>
        )}

        {idea.target_audience && (
          <div className="flex items-start gap-2 text-xs mb-4">
            <span className="text-gray-600 flex-shrink-0 mt-px">🎯</span>
            <span className="text-gray-400 line-clamp-1">{idea.target_audience}</span>
          </div>
        )}
      </div>

      {/* Bottom — Metrics + Actions */}
      <div className="px-5 pb-5 mt-auto">
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

        <div className="flex items-center justify-between text-[11px] text-gray-600 mb-4">
          <span className="flex items-center gap-1">
            Fuente: <span className={`font-medium ${sourceConfig.color}`}>{idea.source || 'Trend Scout'}</span>
          </span>
          <span>{idea.discovered_at ? new Date(idea.discovered_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onAnalysis(idea.id)}
            className="flex-shrink-0 px-3 py-3 rounded-xl text-xs font-medium border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-all"
            title="Ver análisis detallado"
          >
            📊 Análisis
          </button>
          <button
            onClick={() => onLaunch(idea.id)}
            disabled={launching === idea.id}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {launching === idea.id ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Lanzando...</>
            ) : (
              <>🚀 Lánzalo</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ──────────────── Tab Button ──────────────── */
function TabButton({ tab, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-gray-800/40 text-gray-400 border border-transparent hover:border-gray-800 hover:text-gray-300'
      }`}
    >
      <span className="text-sm">{tab.icon}</span>
      <span className="hidden sm:inline">{tab.label}</span>
      {count > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

/* ──────────────── Main Ideas Page ──────────────── */
export default function Ideas() {
  const [ideas, setIdeas] = useState([])
  const [counts, setCounts] = useState({ para_ti: 0, intereses: 0, descubre: 0, total: 0 })
  const [isFree, setIsFree] = useState(false)
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(null)
  const [activeTab, setActiveTab] = useState('para_ti')
  const [sortBy, setSortBy] = useState('score')
  const [analysisId, setAnalysisId] = useState(null)
  const [slotsModal, setSlotsModal] = useState(null) // { slots, used }
  const [buyingSlot, setBuyingSlot] = useState(false)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => { loadIdeas() }, [])

  const loadIdeas = async () => {
    setLoading(true)
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const res = await fetch(apiUrl('/api/ideas?limit=100'), { headers })
      const data = await res.json()
      setIdeas(data.ideas || [])
      setCounts(data.counts || { para_ti: 0, intereses: 0, descubre: 0, total: 0 })
      setIsFree(data.isFree || false)

      // Auto-select first tab with content
      if (data.counts?.para_ti > 0) setActiveTab('para_ti')
      else if (data.counts?.intereses > 0) setActiveTab('intereses')
      else setActiveTab('descubre')
    } catch (error) {
      console.error('Error loading ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  /* Filtered + sorted ideas */
  const displayIdeas = useMemo(() => {
    let filtered = ideas.filter(i => (i.tab || 'descubre') === activeTab)
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
          const parseRev = (r) => { const m = (r||'').match(/\$?([\d,.]+)/); return m ? parseFloat(m[1].replace(',','')) : 0 }
          return parseRev(b.potential_revenue) - parseRev(a.potential_revenue)
        })
        break
    }
    return sorted
  }, [ideas, activeTab, sortBy])

  const handleLaunch = async (ideaId) => {
    if (!token) { navigate('/'); return }
    setLaunching(ideaId)
    try {
      const res = await fetch(apiUrl(`/api/ideas/${ideaId}/launch`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (data.code === 'NO_SLOTS') {
        setSlotsModal({ slots: data.slots, used: data.used })
      } else if (data.success) {
        navigate('/chat')
      } else {
        alert('Error: ' + (data.error || 'No se pudo lanzar'))
      }
    } catch (e) { alert('Error de conexión') }
    finally { setLaunching(null) }
  }

  const handleBuySlot = async () => {
    setBuyingSlot(true)
    try {
      const res = await fetch(apiUrl('/api/credits/purchase-slot'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        alert(data.error)
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setBuyingSlot(false)
    }
  }

  const handleDismiss = async (ideaId) => {
    if (!token) return
    try {
      await fetch(apiUrl(`/api/ideas/${ideaId}/interact`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' })
      })
      // Remove from local state
      setIdeas(prev => prev.filter(i => i.id !== ideaId))
    } catch (e) { console.error('Dismiss error:', e) }
  }

  const avgScore = ideas.length
    ? Math.round(ideas.reduce((sum, i) => sum + (i.score || 0), 0) / ideas.length)
    : 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-white mb-1">💡 Descubre Ideas Validadas</h1>
        <p className="text-sm text-gray-500">Ideas de negocio validadas con datos reales. Lanza la que más te guste.</p>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-6 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              count={counts[tab.id] || 0}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}

          <div className="flex-1" />

          {/* Sort */}
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

        {/* Tab description */}
        <p className="text-xs text-gray-600 mt-2">
          {TABS.find(t => t.id === activeTab)?.desc}
        </p>
      </div>

      {/* Ideas Grid */}
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
              <div className="text-4xl mb-3 opacity-40">{TABS.find(t => t.id === activeTab)?.icon}</div>
              <p className="text-gray-400 mb-1">No hay ideas en esta categoría</p>
              <p className="text-gray-600 text-xs">Prueba otra pestaña o espera al próximo escaneo semanal</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {displayIdeas.map((idea) => (
              idea.locked ? (
                <LockedIdeaCard key={idea.id} idea={idea} />
              ) : (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onLaunch={handleLaunch}
                  onDismiss={handleDismiss}
                  onAnalysis={setAnalysisId}
                  launching={launching}
                />
              )
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {!loading && counts.total > 0 && (
        <div className="flex-shrink-0 border-t border-gray-800 px-6 py-3">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <span><span className="text-gray-300 font-medium">{counts.total}</span> ideas</span>
            <span className="text-gray-800">·</span>
            <span>Score medio: <span className="text-gray-300 font-medium">{avgScore}%</span></span>
            <span className="text-gray-800">·</span>
            <span>7 fuentes activas</span>
            {isFree && (
              <>
                <span className="text-gray-800">·</span>
                <span className="text-amber-400">🔒 Plan Free — 3 ideas visibles</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Analysis slide-over */}
      {analysisId && (
        <AnalysisPanel ideaId={analysisId} onClose={() => setAnalysisId(null)} />
      )}

      {/* No Slots Modal */}
      {slotsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSlotsModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🏢</div>
              <h3 className="text-lg font-bold text-white mb-2">Sin huecos disponibles</h3>
              <p className="text-sm text-gray-400">
                Tienes <span className="text-white font-semibold">{slotsModal.used}</span> de <span className="text-white font-semibold">{slotsModal.slots}</span> negocio{slotsModal.slots !== 1 ? 's' : ''} ocupado{slotsModal.used !== 1 ? 's' : ''}.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Para lanzar una nueva idea necesitas un hueco adicional.
              </p>
            </div>

            <button
              onClick={handleBuySlot}
              disabled={buyingSlot}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
            >
              {buyingSlot ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</>
              ) : (
                <>🚀 Comprar hueco extra — 39€/mes</>
              )}
            </button>

            <button
              onClick={() => setSlotsModal(null)}
              className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
