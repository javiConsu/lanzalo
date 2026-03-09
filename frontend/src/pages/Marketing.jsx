import { apiUrl } from '../api.js'
import { useState, useEffect, useCallback } from 'react'

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

// ─── Main Component ─────────────────────────────────────────
export default function Marketing() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('contenido')

  const token = localStorage.getItem('token')

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
            <div className="text-xl font-bold text-purple-400">{marketingTasks.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tareas mkt</div>
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
                <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 leading-none">€</span>
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

            {/* ─── Tab: Emails ─────────────────────────── */}
            {tab === 'emails' && (
              <EmailsTab emails={emails} />
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

// ─── Emails Tab ─────────────────────────────────────────────
function EmailsTab({ emails }) {
  const campaigns = emails.campaigns || []

  return (
    <div className="space-y-4 pt-4">
      {/* Cost warning */}
      <div className="bg-amber-900/15 border border-amber-700/40 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-lg mt-0.5">⚠️</span>
        <div>
          <p className="text-sm text-amber-300 font-medium">Cold email puede suponer coste extra</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            El envío masivo de emails fríos puede conllevar costes adicionales según volumen y proveedor de envío.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Total" value={emails.metrics.total} icon="📧" color="text-blue-400" />
        <MetricCard label="Enviados" value={emails.metrics.sent} icon="📨" color="text-green-400" />
        <MetricCard label="Respondidos" value={emails.metrics.replied} icon="💬" color="text-emerald-400" />
        <MetricCard label="Rebotados" value={emails.metrics.bounced} icon="⚠️" color="text-red-400" />
      </div>

      {/* Campaigns list */}
      {campaigns.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>📧</span> Campañas de email
          </h3>
          <div className="space-y-2">
            {campaigns.map(email => {
              const status = EMAIL_STATUS[email.status] || EMAIL_STATUS.draft
              return (
                <div key={email.id} className="bg-gray-800/60 rounded-xl border border-gray-700/40 p-4 hover:border-gray-600/60 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      {email.campaign_name && (
                        <p className="text-xs text-amber-400 font-medium mb-1">{email.campaign_name}</p>
                      )}
                      <p className="text-sm font-medium text-white truncate">{email.subject || 'Sin asunto'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">→ {email.to_email}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium border rounded-full flex-shrink-0 ${status.bg} ${status.text} ${status.border}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {email.sent_at && (
                      <span className="flex items-center gap-1">
                        <span>📨</span> {formatDate(email.sent_at)}
                      </span>
                    )}
                    {email.replied_at && (
                      <span className="flex items-center gap-1">
                        <span>💬</span> Respondido {formatDate(email.replied_at)}
                      </span>
                    )}
                    {email.opened_at && (
                      <span className="flex items-center gap-1">
                        <span>👁️</span> Abierto
                      </span>
                    )}
                    {email.clicks > 0 && (
                      <span className="flex items-center gap-1">
                        <span>🔗</span> {email.clicks} clicks
                      </span>
                    )}
                    <span>{timeAgo(email.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="📧"
          title="Sin campañas de email"
          subtitle="Habla con tu Co-Founder para lanzar campañas de cold email"
        />
      )}
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
