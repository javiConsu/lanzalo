import { apiUrl } from '../api.js'
import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Helpers ────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

// ─── Status configs ─────────────────────────────────────────
const CONTENT_STATUS = {
  draft:     { label: 'Borrador', icon: '📝', bg: 'bg-gray-700/50', text: 'text-gray-300', border: 'border-gray-600' },
  scheduled: { label: 'Programado', icon: '📅', bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-700' },
  posted:    { label: 'Publicado', icon: '✅', bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700' },
}

const EMAIL_STATUS = {
  draft:   { label: 'Borrador', icon: '📝', bg: 'bg-gray-700/50', text: 'text-gray-300', border: 'border-gray-600' },
  sent:    { label: 'Enviado', icon: '📨', bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' },
  bounced: { label: 'Rebotado', icon: '⚠️', bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700' },
  replied: { label: 'Respondido', icon: '💬', bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700' },
}

const CAMPAIGN_STATUS = {
  draft:     { label: 'Borrador', icon: '📝', bg: 'bg-gray-700/50', text: 'text-gray-300', border: 'border-gray-600' },
  active:    { label: 'Activa', icon: '🟢', bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700' },
  paused:    { label: 'Pausada', icon: '⏸️', bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-700' },
  completed: { label: 'Completada', icon: '✅', bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' },
}

const LEAD_STATUS = {
  new:             { label: 'Nuevo', dot: 'bg-gray-400' },
  contacted:       { label: 'Contactado', dot: 'bg-blue-400' },
  replied:         { label: 'Respondido', dot: 'bg-green-400' },
  interested:      { label: 'Interesado', dot: 'bg-emerald-400' },
  not_interested:  { label: 'No interesado', dot: 'bg-red-400' },
  bounced:         { label: 'Rebotado', dot: 'bg-orange-400' },
}

// ─── Main Component ─────────────────────────────────────────
export default function Marketing() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('contenido')

  const token = localStorage.getItem('token')

  // Check URL params for tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'emails') setTab('emails')
  }, [])

  // Load companies
  useEffect(() => {
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(d => {
        if (d.companies?.length > 0) {
          setCompanies(d.companies)
          setSelectedCompany(d.companies[0].id)
        }
      })
      .catch(console.error)
  }, [token])

  // Fetch marketing data
  const fetchMarketing = useCallback(() => {
    if (!selectedCompany) return
    return fetch(apiUrl(`/api/user/companies/${selectedCompany}/marketing`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(d => setData(d))
      .catch(console.error)
  }, [selectedCompany, token])

  useEffect(() => {
    setLoading(true)
    fetchMarketing()?.finally(() => setLoading(false))
  }, [fetchMarketing])

  // Poll every 15s
  useEffect(() => {
    if (!selectedCompany) return
    const interval = setInterval(fetchMarketing, 15000)
    return () => clearInterval(interval)
  }, [selectedCompany, fetchMarketing])

  if (companies.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">📣</span>
          <p className="text-gray-400 mt-3">No tienes empresas aún</p>
        </div>
      </div>
    )
  }

  const content = data?.content || { posts: [], metrics: { total: 0, published: 0, scheduled: 0, drafts: 0 } }
  const emails = data?.emails || { campaigns: [], metrics: { total: 0, sent: 0, replied: 0, bounced: 0 } }
  const emailPro = data?.emailPro || { subscription: null, campaigns: [], leads: { total: 0, statusCounts: {} } }
  const contentPieces = data?.contentPieces || []
  const gamma = data?.gamma || { enabled: false, totalGenerated: 0, creditsUsed: 0 }
  const ads = data?.ads || { tasks: [], campaigns: [], metrics: { total: 0, active: 0, completed: 0 } }
  const marketingTasks = data?.marketingTasks || []
  const brandCfg = data?.brandConfig || {}
  const hasBrandConfig = data?.hasBrandConfig || false

  const companyName = companies.find(c => c.id === selectedCompany)?.name || ''

  const tabs = [
    { id: 'marca', label: 'Marca', icon: '🎨' },
    { id: 'contenido', label: 'Contenido', icon: '📱', count: content.metrics.total },
    { id: 'emails', label: 'Emails', icon: '📧', count: emails.metrics.total, costExtra: true },
    { id: 'ads', label: 'Ads', icon: '📢', count: ads.metrics.total, costExtra: true },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ec489918' }}>
              <span className="text-lg">📣</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Marketing {companyName ? `— ${companyName}` : ''}
              </h1>
              <p className="text-xs text-gray-500">CMO · Contenido, Emails y Ads</p>
            </div>
          </div>

          {companies.length > 1 && (
            <select
              value={selectedCompany || ''}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="text-sm px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Summary counters */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-2.5 text-center">
            <div className="text-lg font-bold text-pink-400">{contentPieces.filter(p => p.status === 'ready' || p.status === 'posted').length + content.metrics.published}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Contenido</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-2.5 text-center">
            <div className="text-lg font-bold text-violet-400">{gamma.totalGenerated}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Gamma</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-2.5 text-center">
            <div className="text-lg font-bold text-blue-400">{emails.metrics.sent}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Emails</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-2.5 text-center">
            <div className="text-lg font-bold text-amber-400">{ads.metrics.total}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Campanas Ads</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-2.5 text-center">
            <div className="text-lg font-bold text-purple-400">{emailPro.leads.total || 0}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Leads</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800/60 rounded-xl border border-gray-700/50 p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.costExtra && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 leading-none">$</span>
              )}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full leading-none ${
                  tab === t.id ? 'bg-gray-600 text-gray-200' : 'bg-gray-700 text-gray-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── Tab: Marca ─────────────────────────── */}
            {tab === 'marca' && (
              <BrandTab
                brandConfig={brandCfg}
                hasBrandConfig={hasBrandConfig}
                companyId={selectedCompany}
                token={token}
                onRefresh={fetchMarketing}
              />
            )}

            {/* ─── Tab: Contenido ──────────────────────── */}
            {tab === 'contenido' && (
              <ContentTab 
                content={content} 
                contentPieces={contentPieces}
                gamma={gamma}
                companyId={selectedCompany}
                token={token}
                marketingTasks={marketingTasks}
                onRefresh={fetchMarketing}
              />
            )}

            {/* ─── Tab: Emails (Email Pro) ─────────────── */}
            {tab === 'emails' && (
              <EmailsTab 
                emails={emails} 
                emailPro={emailPro} 
                companyId={selectedCompany}
                token={token}
                onRefresh={fetchMarketing}
              />
            )}

            {/* ─── Tab: Ads ────────────────────────────── */}
            {tab === 'ads' && (
              <AdsTab 
                ads={ads}
                companyId={selectedCompany}
                token={token}
                onRefresh={fetchMarketing}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Type configs for content pieces ────────────────────────
const CONTENT_TYPE_CONFIG = {
  presentation: { label: 'Presentación', icon: '📊', color: 'text-violet-400', bg: 'bg-violet-900/30', border: 'border-violet-700' },
  carousel:     { label: 'Carrusel', icon: '🎠', color: 'text-pink-400', bg: 'bg-pink-900/30', border: 'border-pink-700' },
  document:     { label: 'Documento', icon: '📄', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-700' },
  webpage:      { label: 'Web', icon: '🌐', color: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-cyan-700' },
  social_post:  { label: 'Post Social', icon: '📱', color: 'text-pink-400', bg: 'bg-pink-900/30', border: 'border-pink-700' },
}

const PIECE_STATUS = {
  draft:      { label: 'Borrador', icon: '📝', bg: 'bg-gray-700/50', text: 'text-gray-300', border: 'border-gray-600' },
  generating: { label: 'Generando...', icon: '⏳', bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-700' },
  ready:      { label: 'Listo', icon: '✅', bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700' },
  posted:     { label: 'Publicado', icon: '🚀', bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' },
  failed:     { label: 'Error', icon: '❌', bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700' },
  scheduled:  { label: 'Programado', icon: '📅', bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-700' },
}

// ─── Contenido Tab ──────────────────────────────────────────
function ContentTab({ content, contentPieces, gamma, companyId, token, marketingTasks, onRefresh }) {
  const posts = content.posts || []
  const pieces = contentPieces || []
  const contentTasks = marketingTasks.filter(t => ['marketing', 'twitter'].includes(t.agent_tag))
  
  const [generating, setGenerating] = useState(false)
  const [genForm, setGenForm] = useState({ type: 'presentation', title: '', content: '' })
  const [showGenForm, setShowGenForm] = useState(false)
  const [pollingId, setPollingId] = useState(null)

  // Poll for Gamma generation status
  useEffect(() => {
    if (!pollingId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(apiUrl(`/api/companies/${companyId}/content/status/${pollingId}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.status === 'completed' || data.status === 'failed') {
          setPollingId(null)
          onRefresh()
        }
      } catch (e) { /* ignore */ }
    }, 4000)
    return () => clearInterval(interval)
  }, [pollingId, companyId, token, onRefresh])

  const handleGenerate = async () => {
    if (!genForm.title && !genForm.content) return
    setGenerating(true)
    try {
      const res = await fetch(apiUrl(`/api/companies/${companyId}/content/generate`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(genForm)
      })
      const data = await res.json()
      if (data.success) {
        setPollingId(data.generationId)
        setShowGenForm(false)
        setGenForm({ type: 'presentation', title: '', content: '' })
        onRefresh()
      } else {
        alert(data.error || data.message || 'Error generando contenido')
      }
    } catch (e) {
      alert('Error conectando con el servidor')
    } finally {
      setGenerating(false)
    }
  }

  const gammaPieces = pieces.filter(p => p.gamma_url || p.gamma_generation_id)
  const socialPieces = pieces.filter(p => p.type === 'social_post' && !p.gamma_generation_id)

  return (
    <div className="space-y-4 pt-4">
      {/* Gamma section */}
      <div className="bg-gradient-to-r from-violet-900/20 to-purple-900/10 border border-violet-700/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <span className="text-lg">✨</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Gamma AI
                {gamma.enabled ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">Conectado</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">No configurado</span>
                )}
              </h3>
              <p className="text-xs text-gray-500">Presentaciones, carruseles, documentos y webs con IA</p>
            </div>
          </div>
          {gamma.enabled && (
            <button
              onClick={() => setShowGenForm(!showGenForm)}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>✨</span> Generar
            </button>
          )}
        </div>

        {/* Generation form */}
        {showGenForm && gamma.enabled && (
          <div className="mt-3 space-y-3 bg-gray-800/40 rounded-xl p-4 border border-gray-700/40">
            <div className="flex gap-2">
              {['presentation', 'carousel', 'document', 'webpage'].map(t => {
                const cfg = CONTENT_TYPE_CONFIG[t]
                return (
                  <button
                    key={t}
                    onClick={() => setGenForm(prev => ({ ...prev, type: t }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      genForm.type === t
                        ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                        : 'text-gray-500 hover:text-gray-300 bg-gray-800/60 border border-gray-700/40'
                    }`}
                  >
                    <span>{cfg.icon}</span> {cfg.label}
                  </button>
                )
              })}
            </div>
            <input
              type="text"
              placeholder="Titulo (ej: Pitch Deck para inversores)"
              value={genForm.title}
              onChange={e => setGenForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <textarea
              placeholder="Contenido o tema (describe lo que quieres generar...)"
              value={genForm.content}
              onChange={e => setGenForm(prev => ({ ...prev, content: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowGenForm(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
              >Cancelar</button>
              <button
                onClick={handleGenerate}
                disabled={generating || (!genForm.title && !genForm.content)}
                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {generating ? (
                  <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
                ) : (
                  <><span>✨</span> Crear con Gamma</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Gamma status info when not configured */}
        {!gamma.enabled && (
          <div className="mt-2 text-xs text-gray-500">
            Configura tu API key de Gamma Pro en ajustes para generar presentaciones y carruseles.
          </div>
        )}

        {/* Polling indicator */}
        {pollingId && (
          <div className="mt-3 flex items-center gap-2 text-sm text-violet-300">
            <span className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            Generando contenido con Gamma...
          </div>
        )}
      </div>

      {/* Gamma-generated content */}
      {gammaPieces.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>✨</span> Contenido Gamma
          </h3>
          <div className="space-y-2">
            {gammaPieces.map(piece => {
              const typeCfg = CONTENT_TYPE_CONFIG[piece.type] || CONTENT_TYPE_CONFIG.presentation
              const statusCfg = PIECE_STATUS[piece.status] || PIECE_STATUS.draft
              return (
                <div key={piece.id} className="bg-gray-800/60 rounded-xl border border-gray-700/40 p-4 hover:border-gray-600/60 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-base ${typeCfg.color}`}>{typeCfg.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{piece.title || 'Sin titulo'}</p>
                        {piece.body && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{piece.body.substring(0, 100)}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium border rounded-full flex-shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className={`px-1.5 py-0.5 rounded ${typeCfg.bg} ${typeCfg.color} border ${typeCfg.border}`}>{typeCfg.label}</span>
                    {piece.gamma_url && (
                      <a 
                        href={piece.gamma_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                      >
                        <span>🔗</span> Abrir en Gamma
                      </a>
                    )}
                    {piece.gamma_credits_used > 0 && (
                      <span>{piece.gamma_credits_used} créditos</span>
                    )}
                    <span className="ml-auto">{piece.created_by === 'agent' ? '🤖 IA' : '👤 Manual'}</span>
                    <span>{timeAgo(piece.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total posts" value={content.metrics.total + socialPieces.length} icon="📱" color="text-pink-400" />
        <MetricCard label="Borradores" value={content.metrics.drafts + pieces.filter(p => p.status === 'draft').length} icon="📝" color="text-gray-400" />
        <MetricCard label="Engagement" value={
          posts.reduce((sum, p) => sum + (p.engagement_likes || 0) + (p.engagement_retweets || 0), 0) +
          pieces.reduce((sum, p) => sum + (p.engagement_likes || 0) + (p.engagement_shares || 0), 0)
        } icon="❤️" color="text-red-400" />
      </div>

      {/* Social posts (legacy tweets + new content_pieces posts) */}
      {(posts.length > 0 || socialPieces.length > 0) && (
        <div>
          <h3 className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>📱</span> Posts y contenido social
          </h3>
          <div className="space-y-2">
            {/* Agent-generated social posts */}
            {socialPieces.map(piece => {
              const statusCfg = PIECE_STATUS[piece.status] || PIECE_STATUS.draft
              return (
                <div key={piece.id} className="bg-gray-800/60 rounded-xl border border-gray-700/40 p-4 hover:border-gray-600/60 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm text-gray-200 leading-relaxed flex-1">
                      {piece.body?.substring(0, 200)}{piece.body?.length > 200 ? '...' : ''}
                    </p>
                    <span className={`px-2 py-0.5 text-xs font-medium border rounded-full flex-shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {piece.platform && <span className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{piece.platform}</span>}
                    <span>{piece.created_by === 'agent' ? '🤖 IA' : '👤'}</span>
                    <span>{timeAgo(piece.created_at)}</span>
                  </div>
                </div>
              )
            })}
            {/* Legacy tweet posts */}
            {posts.map(post => {
              const status = CONTENT_STATUS[post.status] || CONTENT_STATUS.draft
              return (
                <div key={post.id} className="bg-gray-800/60 rounded-xl border border-gray-700/40 p-4 hover:border-gray-600/60 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm text-gray-200 leading-relaxed flex-1">
                      {post.content?.substring(0, 200)}{post.content?.length > 200 ? '...' : ''}
                    </p>
                    <span className={`px-2 py-0.5 text-xs font-medium border rounded-full flex-shrink-0 ${status.bg} ${status.text} ${status.border}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {post.scheduled_for && <span className="flex items-center gap-1"><span>📅</span> {formatDate(post.scheduled_for)}</span>}
                    {post.posted_at && <span className="flex items-center gap-1"><span>✅</span> {formatDate(post.posted_at)}</span>}
                    {(post.engagement_likes > 0 || post.engagement_retweets > 0) && (
                      <span className="flex items-center gap-2">
                        <span>❤️ {post.engagement_likes || 0}</span>
                        <span>🔄 {post.engagement_retweets || 0}</span>
                      </span>
                    )}
                    <span>{timeAgo(post.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Marketing tasks */}
      {contentTasks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>⚡</span> Tareas de contenido
          </h3>
          <div className="space-y-2">
            {contentTasks.map(task => (
              <TaskMiniCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 && pieces.length === 0 && contentTasks.length === 0 && (
        <EmptyState
          icon="📱"
          title="Sin contenido todavia"
          subtitle={gamma.enabled ? 'Usa el boton Generar para crear presentaciones, carruseles y documentos con Gamma AI' : 'Tu CMO creara posts y contenido social cuando le des tareas'}
        />
      )}
    </div>
  )
}

// ─── Brand Tab (Marca) ──────────────────────────────────────
function BrandTab({ brandConfig, hasBrandConfig, companyId, token, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [desc, setDesc] = useState('')
  const [form, setForm] = useState({
    voice: {
      tono: brandConfig?.voice?.tono || 'profesional',
      personalidad: brandConfig?.voice?.personalidad || 'cercano',
      formalidad: brandConfig?.voice?.formalidad ?? 60,
      humor: brandConfig?.voice?.humor ?? 30,
      confianza: brandConfig?.voice?.confianza ?? 70,
      calidez: brandConfig?.voice?.calidez ?? 60,
    },
    visual: {
      colorPrimario: brandConfig?.visual?.colorPrimario || '#ec4899',
      colorSecundario: brandConfig?.visual?.colorSecundario || '#8b5cf6',
      colorFondo: brandConfig?.visual?.colorFondo || '#1a1a2e',
      estilo: brandConfig?.visual?.estilo || 'moderno',
      fontPreferida: brandConfig?.visual?.fontPreferida || '',
    },
    audiencia: {
      sector: brandConfig?.audiencia?.sector || '',
      tamano: brandConfig?.audiencia?.tamano || '',
      idioma: brandConfig?.audiencia?.idioma || 'es',
      painPoints: brandConfig?.audiencia?.painPoints || [],
    },
    vocabulario: {
      palabrasClave: brandConfig?.vocabulario?.palabrasClave || [],
      evitar: brandConfig?.vocabulario?.evitar || [],
      hashtags: brandConfig?.vocabulario?.hashtags || [],
    },
    dosAndDonts: {
      hacer: brandConfig?.dosAndDonts?.hacer || [],
      noHacer: brandConfig?.dosAndDonts?.noHacer || [],
    },
  })

  const [painInput, setPainInput] = useState('')
  const [kwInput, setKwInput] = useState('')
  const [avoidInput, setAvoidInput] = useState('')
  const [hashInput, setHashInput] = useState('')
  const [doInput, setDoInput] = useState('')
  const [dontInput, setDontInput] = useState('')

  useEffect(() => {
    if (brandConfig && Object.keys(brandConfig).length > 0) {
      setForm({
        voice: { ...form.voice, ...brandConfig.voice },
        visual: { ...form.visual, ...brandConfig.visual },
        audiencia: { ...form.audiencia, ...brandConfig.audiencia },
        vocabulario: { ...form.vocabulario, ...brandConfig.vocabulario },
        dosAndDonts: { ...form.dosAndDonts, ...brandConfig.dosAndDonts },
      })
    }
  }, [brandConfig])

  const handleAutoGenerate = async () => {
    if (!desc.trim()) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/brand/${companyId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: desc }),
      })
      if (res.ok) {
        onRefresh()
        setDesc('')
        setEditing(false)
      }
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/brand/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        onRefresh()
        setEditing(false)
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const addToArray = (path, value, setter) => {
    if (!value.trim()) return
    const keys = path.split('.')
    const newForm = { ...form }
    let obj = newForm
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
    obj[keys[keys.length - 1]] = [...(obj[keys[keys.length - 1]] || []), value.trim()]
    setForm(newForm)
    setter('')
  }

  const removeFromArray = (path, idx) => {
    const keys = path.split('.')
    const newForm = { ...form }
    let obj = newForm
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
    obj[keys[keys.length - 1]] = obj[keys[keys.length - 1]].filter((_, i) => i !== idx)
    setForm(newForm)
  }

  const Slider = ({ label, value, onChange }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{value}%</span>
      </div>
      <input
        type="range" min="0" max="100" value={value} onChange={e => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
      />
    </div>
  )

  const TagList = ({ items, path, input, setInput, placeholder, color = 'pink' }) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(items || []).map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-${color}-500/15 text-${color}-400 border border-${color}-500/25`}>
            {item}
            {editing && (
              <button onClick={() => removeFromArray(path, i)} className="hover:text-white ml-0.5">&times;</button>
            )}
          </span>
        ))}
      </div>
      {editing && (
        <div className="flex gap-2">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addToArray(path, input, setInput))}
            placeholder={placeholder}
            className="flex-1 text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
          <button onClick={() => addToArray(path, input, setInput)} className="text-xs px-2 py-1 bg-pink-600 hover:bg-pink-500 rounded text-white">+</button>
        </div>
      )}
    </div>
  )

  const colorMap = { pink: 'bg-pink-500/15 text-pink-400 border-pink-500/25', violet: 'bg-violet-500/15 text-violet-400 border-violet-500/25', amber: 'bg-amber-500/15 text-amber-400 border-amber-500/25', emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', red: 'bg-red-500/15 text-red-400 border-red-500/25' }

  // No brand config yet — show setup prompt
  if (!hasBrandConfig && !editing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center text-3xl">🎨</div>
        <h3 className="text-lg font-bold text-white">Configura tu marca</h3>
        <p className="text-sm text-gray-400 text-center max-w-md">
          Define el tono, colores y estilo de tu marca. Todos los agentes (CMO, Twitter, contenido web, Gamma)
          seguiran estas directrices automaticamente.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setEditing(true)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors">
            Configurar manualmente
          </button>
          <div className="flex gap-2">
            <input
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Describe tu marca en una frase..."
              className="text-sm px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white w-64 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              onClick={handleAutoGenerate} disabled={generating || !desc.trim()}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2"
            >
              {generating ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✨'}
              Generar con IA
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-3">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <h3 className="text-sm font-bold text-white">Guia de Marca</h3>
          {hasBrandConfig && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Activa</span>}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="text-xs px-3 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-1">
                {saving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                Guardar
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2 items-center">
                <input
                  value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Regenerar con una descripcion..."
                  className="text-xs px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white w-48 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
                <button
                  onClick={handleAutoGenerate} disabled={generating || !desc.trim()}
                  className="text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-1"
                >
                  {generating ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✨'}
                  IA
                </button>
              </div>
              <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300">Editar</button>
            </>
          )}
        </div>
      </div>

      {/* Voz */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">🗣️</span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Voz y Tono</h4>
        </div>
        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Tono</label>
              <input value={form.voice.tono} onChange={e => setForm({...form, voice: {...form.voice, tono: e.target.value}})}
                className="w-full text-xs px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-pink-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Personalidad</label>
              <input value={form.voice.personalidad} onChange={e => setForm({...form, voice: {...form.voice, personalidad: e.target.value}})}
                className="w-full text-xs px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-pink-500" />
            </div>
            <Slider label="Formalidad" value={form.voice.formalidad} onChange={v => setForm({...form, voice: {...form.voice, formalidad: v}})} />
            <Slider label="Humor" value={form.voice.humor} onChange={v => setForm({...form, voice: {...form.voice, humor: v}})} />
            <Slider label="Confianza" value={form.voice.confianza} onChange={v => setForm({...form, voice: {...form.voice, confianza: v}})} />
            <Slider label="Calidez" value={form.voice.calidez} onChange={v => setForm({...form, voice: {...form.voice, calidez: v}})} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-xs"><span className="text-gray-500">Tono:</span> <span className="text-white">{form.voice.tono}</span></div>
            <div className="text-xs"><span className="text-gray-500">Personalidad:</span> <span className="text-white">{form.voice.personalidad}</span></div>
            <div className="text-xs"><span className="text-gray-500">Formalidad:</span> <span className="text-white">{form.voice.formalidad}%</span></div>
            <div className="text-xs"><span className="text-gray-500">Humor:</span> <span className="text-white">{form.voice.humor}%</span></div>
            <div className="text-xs"><span className="text-gray-500">Confianza:</span> <span className="text-white">{form.voice.confianza}%</span></div>
            <div className="text-xs"><span className="text-gray-500">Calidez:</span> <span className="text-white">{form.voice.calidez}%</span></div>
          </div>
        )}
      </div>

      {/* Visual */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">🎨</span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Identidad Visual</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Primario</span>
            <div className="flex items-center gap-2">
              {editing ? (
                <input type="color" value={form.visual.colorPrimario} onChange={e => setForm({...form, visual: {...form.visual, colorPrimario: e.target.value}})}
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
              ) : (
                <div className="w-8 h-8 rounded-lg border border-gray-600" style={{ backgroundColor: form.visual.colorPrimario }} />
              )}
              <span className="text-xs text-gray-300 font-mono">{form.visual.colorPrimario}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Secundario</span>
            <div className="flex items-center gap-2">
              {editing ? (
                <input type="color" value={form.visual.colorSecundario} onChange={e => setForm({...form, visual: {...form.visual, colorSecundario: e.target.value}})}
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
              ) : (
                <div className="w-8 h-8 rounded-lg border border-gray-600" style={{ backgroundColor: form.visual.colorSecundario }} />
              )}
              <span className="text-xs text-gray-300 font-mono">{form.visual.colorSecundario}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Fondo</span>
            <div className="flex items-center gap-2">
              {editing ? (
                <input type="color" value={form.visual.colorFondo} onChange={e => setForm({...form, visual: {...form.visual, colorFondo: e.target.value}})}
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent" />
              ) : (
                <div className="w-8 h-8 rounded-lg border border-gray-600" style={{ backgroundColor: form.visual.colorFondo }} />
              )}
              <span className="text-xs text-gray-300 font-mono">{form.visual.colorFondo}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Estilo</span>
            {editing ? (
              <select value={form.visual.estilo} onChange={e => setForm({...form, visual: {...form.visual, estilo: e.target.value}})}
                className="w-full text-xs px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-pink-500">
                <option value="moderno">Moderno</option>
                <option value="minimalista">Minimalista</option>
                <option value="corporativo">Corporativo</option>
                <option value="creativo">Creativo</option>
                <option value="elegante">Elegante</option>
                <option value="juvenil">Juvenil</option>
              </select>
            ) : (
              <div className="text-xs text-white capitalize">{form.visual.estilo}</div>
            )}
          </div>
        </div>
        {editing && (
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Fuente preferida</label>
            <input value={form.visual.fontPreferida} onChange={e => setForm({...form, visual: {...form.visual, fontPreferida: e.target.value}})}
              placeholder="ej: Inter, Montserrat..." className="w-full text-xs px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-pink-500" />
          </div>
        )}
      </div>

      {/* Audiencia */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">🎯</span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Audiencia</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Sector</span>
            {editing ? (
              <input value={form.audiencia.sector} onChange={e => setForm({...form, audiencia: {...form.audiencia, sector: e.target.value}})}
                className="w-full text-xs px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-pink-500" />
            ) : (
              <div className="text-xs text-white">{form.audiencia.sector || '-'}</div>
            )}
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Tamano empresa</span>
            {editing ? (
              <input value={form.audiencia.tamano} onChange={e => setForm({...form, audiencia: {...form.audiencia, tamano: e.target.value}})}
                className="w-full text-xs px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-pink-500" />
            ) : (
              <div className="text-xs text-white">{form.audiencia.tamano || '-'}</div>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-gray-400">Pain Points</span>
          <TagList items={form.audiencia.painPoints} path="audiencia.painPoints" input={painInput} setInput={setPainInput} placeholder="Anadir pain point..." color="amber" />
        </div>
      </div>

      {/* Vocabulario */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">💬</span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Vocabulario</h4>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Palabras clave</span>
            <TagList items={form.vocabulario.palabrasClave} path="vocabulario.palabrasClave" input={kwInput} setInput={setKwInput} placeholder="Anadir palabra clave..." color="pink" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Evitar</span>
            <TagList items={form.vocabulario.evitar} path="vocabulario.evitar" input={avoidInput} setInput={setAvoidInput} placeholder="Palabra a evitar..." color="red" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Hashtags</span>
            <TagList items={form.vocabulario.hashtags} path="vocabulario.hashtags" input={hashInput} setInput={setHashInput} placeholder="#hashtag" color="violet" />
          </div>
        </div>
      </div>

      {/* Dos and Donts */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">📋</span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Directrices</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-emerald-400 font-medium">Hacer</span>
            <TagList items={form.dosAndDonts.hacer} path="dosAndDonts.hacer" input={doInput} setInput={setDoInput} placeholder="Buena practica..." color="emerald" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-red-400 font-medium">No hacer</span>
            <TagList items={form.dosAndDonts.noHacer} path="dosAndDonts.noHacer" input={dontInput} setInput={setDontInput} placeholder="Mala practica..." color="red" />
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="bg-gray-800/40 rounded-xl border border-gray-700/30 p-3 flex items-start gap-2">
        <span className="text-sm mt-0.5">💡</span>
        <p className="text-xs text-gray-400 leading-relaxed">
          Esta configuracion se aplica automaticamente a todos los agentes: CMO (posts/social), Twitter, contenido web y presentaciones Gamma.
          Cualquier cambio se refleja en la proxima generacion de contenido.
        </p>
      </div>
    </div>
  )
}

// ─── Emails Tab (Email Pro) ──────────────────────────────────
function EmailsTab({ emails, emailPro, companyId, token, onRefresh }) {
  const sub = emailPro?.subscription
  const hasEmailPro = sub && ['active', 'setting_up'].includes(sub.status)
  const [subscribing, setSubscribing] = useState(false)
  const [uploadingCSV, setUploadingCSV] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [subTab, setSubTab] = useState('campaigns') // campaigns | leads
  const fileInputRef = useRef(null)

  // If no Email Pro subscription, show the upsell
  if (!hasEmailPro) {
    return <EmailProUpsell companyId={companyId} token={token} subscribing={subscribing} setSubscribing={setSubscribing} />
  }

  const proCampaigns = emailPro.campaigns || []
  const leadsTotal = emailPro.leads?.total || 0
  const leadsStatus = emailPro.leads?.statusCounts || {}

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCSV(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(apiUrl(`/api/companies/${companyId}/email-pro/leads/upload`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      setUploadResult(data)
      if (data.success) onRefresh()
    } catch (err) {
      setUploadResult({ error: 'Error subiendo archivo' })
    } finally {
      setUploadingCSV(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Email Pro status bar */}
      <div className="bg-gradient-to-r from-amber-900/20 to-amber-800/10 border border-amber-700/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <span className="text-xl">📧</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Email Pro</h3>
                {sub.status === 'setting_up' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Configurando
                  </span>
                ) : sub.instantly_warmup_status === 'warming' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Calentando
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    Activo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {sub.instantly_account_email || 'Configurando email...'}
                {sub.instantly_domain ? ` · ${sub.instantly_domain}` : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-white">
              {sub.emails_sent_this_month || 0}
              <span className="text-gray-500 font-normal">/{sub.emails_per_month || 500}</span>
            </div>
            <div className="text-xs text-gray-500">emails este mes</div>
            {/* Usage bar */}
            <div className="w-24 h-1.5 bg-gray-700 rounded-full mt-1">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                style={{ width: `${Math.min(100, ((sub.emails_sent_this_month || 0) / (sub.emails_per_month || 500)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Enviados" value={emails.metrics.sent} icon="📨" color="text-blue-400" />
        <MetricCard label="Respondidos" value={emails.metrics.replied} icon="💬" color="text-green-400" />
        <MetricCard label="Rebotados" value={emails.metrics.bounced} icon="⚠️" color="text-red-400" />
        <MetricCard label="Leads" value={leadsTotal} icon="👥" color="text-purple-400" />
      </div>

      {/* Sub-tabs: Campaigns / Leads */}
      <div className="flex gap-1 bg-gray-800/40 rounded-lg p-0.5">
        <button
          onClick={() => setSubTab('campaigns')}
          className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
            subTab === 'campaigns' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Campanas ({proCampaigns.length})
        </button>
        <button
          onClick={() => setSubTab('leads')}
          className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
            subTab === 'leads' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Leads ({leadsTotal})
        </button>
      </div>

      {/* ─── Campaigns sub-tab ─── */}
      {subTab === 'campaigns' && (
        <div className="space-y-3">
          {proCampaigns.length > 0 ? (
            proCampaigns.map(campaign => {
              const status = CAMPAIGN_STATUS[campaign.status] || CAMPAIGN_STATUS.draft
              return (
                <div key={campaign.id} className="bg-gray-800/60 rounded-xl border border-gray-700/40 p-4 hover:border-gray-600/60 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{campaign.name}</p>
                      {campaign.target_audience && (
                        <p className="text-xs text-gray-500 mt-0.5">{campaign.target_audience}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium border rounded-full flex-shrink-0 ${status.bg} ${status.text} ${status.border}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  {/* Campaign stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <span>👥</span> {campaign.leads_count || 0} leads
                    </span>
                    <span className="flex items-center gap-1">
                      <span>📨</span> {campaign.emails_sent || 0} enviados
                    </span>
                    {(campaign.emails_opened || 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <span>👁️</span> {campaign.emails_opened} abiertos
                      </span>
                    )}
                    {(campaign.emails_replied || 0) > 0 && (
                      <span className="flex items-center gap-1 text-green-400">
                        <span>💬</span> {campaign.emails_replied} respuestas
                      </span>
                    )}
                    <span className="ml-auto">
                      {campaign.created_by === 'agent' ? '🤖 Creada por IA' : '👤 Manual'}
                    </span>
                    <span>{timeAgo(campaign.created_at)}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-36 text-center">
              <span className="text-3xl mb-2">🚀</span>
              <p className="text-sm text-gray-400">Sin campanas todavía</p>
              <p className="text-xs text-gray-600 mt-1">
                {sub.status === 'setting_up' 
                  ? 'Tu dominio se está configurando. El agente creará tu primera campaña pronto.'
                  : 'Habla con tu Co-Founder para lanzar campañas de cold email'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Leads sub-tab ─── */}
      {subTab === 'leads' && (
        <div className="space-y-3">
          {/* CSV Upload */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
            >
              {uploadingCSV ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>📄</span>
              )}
              Subir CSV de leads
            </button>
            <p className="text-xs text-gray-600">
              Columnas: email, nombre, empresa, telefono...
            </p>
          </div>

          {/* Upload result */}
          {uploadResult && (
            <div className={`rounded-lg p-3 text-sm ${
              uploadResult.success 
                ? 'bg-green-900/20 border border-green-700/40 text-green-300'
                : 'bg-red-900/20 border border-red-700/40 text-red-300'
            }`}>
              {uploadResult.success 
                ? `Importados ${uploadResult.imported} leads (${uploadResult.skipped} omitidos)`
                : uploadResult.error}
            </div>
          )}

          {/* Lead status summary */}
          {leadsTotal > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(leadsStatus).map(([status, count]) => {
                const cfg = LEAD_STATUS[status] || { label: status, dot: 'bg-gray-400' }
                return (
                  <span key={status} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/60 rounded-lg border border-gray-700/40 text-xs text-gray-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}: {count}
                  </span>
                )
              })}
            </div>
          )}

          {leadsTotal === 0 && (
            <div className="flex flex-col items-center justify-center h-36 text-center">
              <span className="text-3xl mb-2">👥</span>
              <p className="text-sm text-gray-400">Sin leads todavía</p>
              <p className="text-xs text-gray-600 mt-1">
                Sube un CSV con tus contactos o deja que el agente los busque automáticamente
              </p>
            </div>
          )}

          {/* Info about agent finding leads */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-lg mt-0.5">🤖</span>
            <div>
              <p className="text-sm text-gray-300 font-medium">Tu agente de Email busca leads</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Describe a tu Co-Founder el tipo de cliente ideal y el agente buscará y añadirá leads automáticamente.
                También puedes subir tu propia base de datos en CSV.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upsell for more emails */}
      {(sub.emails_sent_this_month || 0) > (sub.emails_per_month || 500) * 0.8 && (
        <div className="bg-amber-900/15 border border-amber-700/30 rounded-xl p-3 flex items-center gap-3">
          <span>⚡</span>
          <div className="flex-1">
            <p className="text-xs text-amber-300">
              Casi llegas al límite. Habla con tu Co-Founder o soporte para ampliar tu plan.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Email Pro Upsell (when not subscribed) ─────────────────
function EmailProUpsell({ companyId, token, subscribing, setSubscribing }) {
  const handleSubscribe = async () => {
    setSubscribing(true)
    try {
      const res = await fetch(apiUrl(`/api/companies/${companyId}/email-pro/subscribe`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url // Redirect to Stripe checkout
      } else {
        alert(data.error || 'Error activando Email Pro')
      }
    } catch (err) {
      alert('Error conectando con el servidor')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="pt-4">
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/10 px-6 py-5 border-b border-gray-700/30">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📧</span>
            <div>
              <h2 className="text-lg font-bold text-white">Email Pro</h2>
              <p className="text-sm text-gray-400">Cold email automatizado por IA</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-3xl font-bold text-white">$15</span>
            <span className="text-gray-400">/mes</span>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 py-5 space-y-3">
          {[
            { icon: '🌐', text: 'Dominio dedicado configurado automáticamente' },
            { icon: '🔥', text: 'Email calentado y listo para enviar (warmup automático)' },
            { icon: '📨', text: 'Hasta 500 emails fríos al mes' },
            { icon: '🤖', text: 'El agente busca leads y crea campañas por ti' },
            { icon: '💬', text: 'Gestión automática de respuestas con IA' },
            { icon: '📊', text: 'Estadísticas: aperturas, respuestas, rebotes' },
            { icon: '📄', text: 'Sube tu propia BBDD de contactos (CSV)' },
          ].map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base flex-shrink-0">{feature.icon}</span>
              <p className="text-sm text-gray-300">{feature.text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {subscribing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Activando...
              </>
            ) : (
              <>Activar Email Pro — $15/mes</>
            )}
          </button>
          <p className="text-xs text-gray-600 text-center mt-3">
            Cancela en cualquier momento. Sin compromiso.
          </p>
        </div>

        {/* More volume note */}
        <div className="px-6 pb-5 border-t border-gray-700/30 pt-4">
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <span>💡</span>
            Si necesitas más volumen, habla con tu Co-Founder o soporte para una propuesta personalizada.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Ads Tab ────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  google_ads:   { label: 'Google Ads', icon: '🌐', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  meta_ads:     { label: 'Meta Ads', icon: '🟦', color: 'text-sky-400', bg: 'bg-sky-900/30' },
  linkedin_ads: { label: 'LinkedIn Ads', icon: '💼', color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
  tiktok_ads:   { label: 'TikTok Ads', icon: '🎥', color: 'text-pink-400', bg: 'bg-pink-900/30' },
  general:      { label: 'General', icon: '📢', color: 'text-purple-400', bg: 'bg-purple-900/30' },
}

const AD_STATUS = {
  draft:     { label: 'Borrador', icon: '📝', bg: 'bg-gray-700/50', text: 'text-gray-300', border: 'border-gray-600' },
  ready:     { label: 'Lista', icon: '✅', bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700' },
  active:    { label: 'Activa', icon: '🟢', bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700' },
  paused:    { label: 'Pausada', icon: '⏸️', bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-700' },
  completed: { label: 'Completada', icon: '🏁', bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' },
}

function AdsTab({ ads, companyId, token, onRefresh }) {
  const tasks = ads.tasks || []
  const campaigns = ads.campaigns || []
  const metrics = ads.metrics || {}
  const [generating, setGenerating] = useState(false)
  const [showGenForm, setShowGenForm] = useState(false)
  const [adForm, setAdForm] = useState({ platform: 'google_ads', objective: 'leads', budget: '', audience_description: '' })
  const [expandedCampaign, setExpandedCampaign] = useState(null)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(apiUrl(`/api/companies/${companyId}/ads/generate`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(adForm)
      })
      const data = await res.json()
      if (data.success) {
        setShowGenForm(false)
        setAdForm({ platform: 'google_ads', objective: 'leads', budget: '', audience_description: '' })
        onRefresh()
      } else {
        alert(data.error || 'Error generando estrategia')
      }
    } catch (e) {
      alert('Error conectando con el servidor')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Cost warning */}
      <div className="bg-amber-900/15 border border-amber-700/40 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-lg mt-0.5">⚠️</span>
        <div>
          <p className="text-sm text-amber-300 font-medium">La publicidad puede suponer coste extra</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            El agente genera estrategia, copies y audiencias. El presupuesto en ads lo aplicas tu en la plataforma.
          </p>
        </div>
      </div>

      {/* Generate strategy button */}
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
          <span>📢</span> Ads Strategist
        </h3>
        <button
          onClick={() => setShowGenForm(!showGenForm)}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
        >
          <span>🎯</span> Nueva estrategia
        </button>
      </div>

      {/* Generation form */}
      {showGenForm && (
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/40 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Plataforma</label>
              <select
                value={adForm.platform}
                onChange={e => setAdForm(prev => ({ ...prev, platform: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="google_ads">Google Ads</option>
                <option value="meta_ads">Meta Ads (Facebook/Instagram)</option>
                <option value="linkedin_ads">LinkedIn Ads</option>
                <option value="tiktok_ads">TikTok Ads</option>
                <option value="general">General (mejor opcion)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Objetivo</label>
              <select
                value={adForm.objective}
                onChange={e => setAdForm(prev => ({ ...prev, objective: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="leads">Generacion de leads</option>
                <option value="traffic">Trafico web</option>
                <option value="awareness">Notoriedad de marca</option>
                <option value="conversions">Conversiones/Ventas</option>
                <option value="engagement">Engagement</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Presupuesto mensual (EUR)</label>
            <input
              type="number"
              placeholder="Ej: 300"
              value={adForm.budget}
              onChange={e => setAdForm(prev => ({ ...prev, budget: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Describe tu audiencia ideal</label>
            <textarea
              placeholder="Ej: Emprendedores de 25-45, interesados en SaaS, en España..."
              value={adForm.audience_description}
              onChange={e => setAdForm(prev => ({ ...prev, audience_description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowGenForm(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200">Cancelar</button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {generating ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
              ) : (
                <><span>🎯</span> Generar estrategia</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="Campanas" value={campaigns.length} icon="📢" color="text-purple-400" />
        <MetricCard label="Gasto total" value={`${(metrics.totalSpend || 0).toFixed(0)}€`} icon="💰" color="text-amber-400" />
        <MetricCard label="Clicks" value={metrics.totalClicks || 0} icon="👆" color="text-blue-400" />
        <MetricCard label="Conversiones" value={metrics.totalConversions || 0} icon="🎯" color="text-green-400" />
      </div>

      {/* Ad Campaigns */}
      {campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const platCfg = PLATFORM_CONFIG[campaign.platform] || PLATFORM_CONFIG.general
            const statusCfg = AD_STATUS[campaign.status] || AD_STATUS.draft
            const isExpanded = expandedCampaign === campaign.id
            const copies = typeof campaign.ad_copies === 'string' ? JSON.parse(campaign.ad_copies || '[]') : (campaign.ad_copies || [])
            const audience = typeof campaign.target_audience === 'string' ? JSON.parse(campaign.target_audience || '{}') : (campaign.target_audience || {})

            return (
              <div key={campaign.id} className="bg-gray-800/60 rounded-xl border border-gray-700/40 overflow-hidden hover:border-gray-600/60 transition-colors">
                <button
                  onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={platCfg.color}>{platCfg.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{campaign.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${platCfg.bg} ${platCfg.color}`}>{platCfg.label}</span>
                          {campaign.objective && <span className="text-[10px] text-gray-600">{campaign.objective}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium border rounded-full flex-shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                      <span className="text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {/* Quick stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {campaign.suggested_monthly_budget && (
                      <span>💰 {campaign.suggested_monthly_budget}€/mes</span>
                    )}
                    {copies.length > 0 && <span>📝 {copies.length} copys</span>}
                    <span className="ml-auto">{timeAgo(campaign.created_at)}</span>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-700/40 p-4 space-y-4">
                    {/* Audience */}
                    {(audience.demographics || audience.interests) && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">🎯 Audiencia</h4>
                        {audience.demographics && <p className="text-xs text-gray-300 mb-1">{audience.demographics}</p>}
                        {audience.interests?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {audience.interests.map((int, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-700/40">{int}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Keywords */}
                    {campaign.keywords?.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">🔍 Keywords</h4>
                        <div className="flex flex-wrap gap-1">
                          {campaign.keywords.map((kw, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-700/40">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ad Copies */}
                    {copies.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">📝 Ad Copies</h4>
                        <div className="space-y-2">
                          {copies.map((copy, i) => (
                            <div key={i} className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/30">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-bold text-white">{copy.headline}</p>
                                {copy.variant && <span className="text-[10px] text-gray-600">Variante {copy.variant}</span>}
                              </div>
                              <p className="text-xs text-gray-400">{copy.description}</p>
                              {copy.cta && <p className="text-[10px] text-purple-400 mt-1 font-medium">👉 {copy.cta}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Budget */}
                    {(campaign.suggested_daily_budget || campaign.suggested_monthly_budget) && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">💰 Presupuesto sugerido</h4>
                        <div className="flex gap-4 text-xs">
                          {campaign.suggested_daily_budget && <span className="text-gray-300">{campaign.suggested_daily_budget}€/dia</span>}
                          {campaign.suggested_monthly_budget && <span className="text-amber-400 font-medium">{campaign.suggested_monthly_budget}€/mes</span>}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {campaign.notes && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">💬 Notas del strategist</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{campaign.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Legacy ad tasks */}
      {tasks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>⚡</span> Tareas de Ads
          </h3>
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskMiniCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {campaigns.length === 0 && tasks.length === 0 && (
        <EmptyState
          icon="📢"
          title="Sin campanas de ads"
          subtitle="Pulsa 'Nueva estrategia' para que el Ads Strategist genere campanas con copies, audiencias y presupuestos"
        />
      )}
    </div>
  )
}

// ─── Shared Components ──────────────────────────────────────

function MetricCard({ label, value, icon, color }) {
  return (
    <div className="bg-gray-800/40 rounded-lg border border-gray-700/40 p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{icon} {label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}

const TASK_STATUS = {
  todo:        { icon: '⏳', label: 'Pendiente', bg: 'bg-gray-700/50', text: 'text-gray-300', border: 'border-gray-600' },
  in_progress: { icon: '⚡', label: 'En progreso', bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' },
  completed:   { icon: '✅', label: 'Completada', bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700' },
  failed:      { icon: '❌', label: 'Fallida', bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700' },
}

function TaskMiniCard({ task }) {
  const status = TASK_STATUS[task.status] || TASK_STATUS.todo
  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/40 p-3 hover:border-gray-600/60 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
          )}
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium border rounded-full flex-shrink-0 ${status.bg} ${status.text} ${status.border}`}>
          {status.icon} {status.label}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span style={{ color: '#ec4899' }}>📣</span> Marketing
        </span>
        <span>{timeAgo(task.completed_at || task.started_at || task.created_at)}</span>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-gray-400">{title}</p>
      <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
      <a href="/" className="mt-3 text-xs px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors">
        Hablar con Co-Founder
      </a>
    </div>
  )
}
