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
  const ads = data?.ads || { tasks: [], metrics: { total: 0, active: 0, completed: 0, budget: 0 } }
  const marketingTasks = data?.marketingTasks || []

  const companyName = companies.find(c => c.id === selectedCompany)?.name || ''

  const tabs = [
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
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 text-center">
            <div className="text-xl font-bold text-pink-400">{content.metrics.published}</div>
            <div className="text-xs text-gray-500 mt-0.5">Publicados</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 text-center">
            <div className="text-xl font-bold text-amber-400">{content.metrics.scheduled}</div>
            <div className="text-xs text-gray-500 mt-0.5">Programados</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 text-center">
            <div className="text-xl font-bold text-blue-400">{emails.metrics.sent}</div>
            <div className="text-xs text-gray-500 mt-0.5">Emails enviados</div>
          </div>
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 text-center">
            <div className="text-xl font-bold text-purple-400">{emailPro.leads.total || 0}</div>
            <div className="text-xs text-gray-500 mt-0.5">Leads</div>
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
            {/* ─── Tab: Contenido ──────────────────────── */}
            {tab === 'contenido' && (
              <ContentTab content={content} marketingTasks={marketingTasks} />
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
              <AdsTab ads={ads} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Contenido Tab ──────────────────────────────────────────
function ContentTab({ content, marketingTasks }) {
  const posts = content.posts || []
  const contentTasks = marketingTasks.filter(t =>
    ['marketing', 'twitter'].includes(t.agent_tag)
  )

  return (
    <div className="space-y-4 pt-4">
      {/* Engagement metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total posts" value={content.metrics.total} icon="📱" color="text-pink-400" />
        <MetricCard label="Borradores" value={content.metrics.drafts} icon="📝" color="text-gray-400" />
        <MetricCard label="Engagement" value={
          posts.reduce((sum, p) => sum + (p.engagement_likes || 0) + (p.engagement_retweets || 0), 0)
        } icon="❤️" color="text-red-400" />
      </div>

      {/* Posts */}
      {posts.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>📱</span> Posts y contenido social
          </h3>
          <div className="space-y-2">
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
                    {post.scheduled_for && (
                      <span className="flex items-center gap-1">
                        <span>📅</span> {formatDate(post.scheduled_for)}
                      </span>
                    )}
                    {post.posted_at && (
                      <span className="flex items-center gap-1">
                        <span>✅</span> {formatDate(post.posted_at)}
                      </span>
                    )}
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
      ) : null}

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

      {posts.length === 0 && contentTasks.length === 0 && (
        <EmptyState
          icon="📱"
          title="Sin contenido todavía"
          subtitle="Tu CMO creará posts y contenido social cuando le des tareas"
        />
      )}
    </div>
  )
}

// ─── Emails Tab (Email Pro) ─────────────────────────────────
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
function AdsTab({ ads }) {
  const tasks = ads.tasks || []

  return (
    <div className="space-y-4 pt-4">
      {/* Cost warning */}
      <div className="bg-amber-900/15 border border-amber-700/40 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-lg mt-0.5">⚠️</span>
        <div>
          <p className="text-sm text-amber-300 font-medium">La publicidad puede suponer coste extra</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Las campañas de ads requieren presupuesto publicitario adicional (Google Ads, Meta Ads, etc.).
            El agente puede crear y optimizar campañas, pero el gasto en anuncios es aparte.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Tareas ads" value={ads.metrics.total} icon="📢" color="text-purple-400" />
        <MetricCard label="Activas" value={ads.metrics.active} icon="⚡" color="text-green-400" />
        <MetricCard label="Completadas" value={ads.metrics.completed} icon="✅" color="text-gray-400" />
      </div>

      {/* Ad tasks */}
      {tasks.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>📢</span> Campañas y tareas de Ads
          </h3>
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskMiniCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="📢"
          title="Sin campañas de ads"
          subtitle="Tu CMO puede crear campañas de Google Ads, Meta Ads, etc."
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
