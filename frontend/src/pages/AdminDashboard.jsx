/**
 * Admin Live Panel — Estilo Polsia/Clawport
 * 
 * Single-page dashboard with:
 * - Period filter (24h / 7d / 30d / Total)
 * - KPI cards (users, MRR, costs, profit)
 * - LLM cost breakdown by model + daily trend
 * - Infrastructure costs (all filtered by period)
 * - Tasks live feed
 * - Companies & users overview
 * - Recent activity (chats, feedback)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { apiUrl } from '../api.js'

// ─── Helpers ──────────────────────────────────────────────
const fmt = (n, decimals = 2) => {
  if (n === null || n === undefined || isNaN(n)) return '0'
  return parseFloat(n).toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })
}
const fmtInt = (n) => parseInt(n || 0).toLocaleString('en-US')
const fmtUSD = (n) => `$${fmt(n)}`
const fmtTokens = (n) => {
  const num = parseInt(n || 0)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}
const timeAgo = (date) => {
  if (!date) return ''
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
const statusColor = {
  completed: 'text-green-400',
  failed: 'text-red-400',
  in_progress: 'text-blue-400',
  todo: 'text-gray-400',
  blocked: 'text-yellow-400'
}
const statusIcon = {
  completed: '✓',
  failed: '✗',
  in_progress: '◉',
  todo: '○',
  blocked: '⊘'
}
const modelShortName = (model) => {
  if (!model) return '?'
  return model.replace('anthropic/', '').replace('openai/', '').replace('google/', '')
}

// Period labels
const PERIODS = [
  { id: '24h', label: '24h', long: 'Últimas 24 horas' },
  { id: '7d', label: '7d', long: 'Últimos 7 días' },
  { id: '30d', label: '30d', long: 'Últimos 30 días' },
  { id: 'total', label: 'Total', long: 'Acumulado total' }
]

/** Devuelve el coste LLM del periodo usando datos de OpenRouter API */
function getLLMCostForPeriod(llm, period) {
  const or = llm?.openrouter_real || {}
  switch (period) {
    case '24h': return or.usage_daily || llm?.cost_24h || 0
    case '7d': return or.usage_weekly || llm?.cost_7d || 0
    case '30d': return or.usage_monthly || llm?.cost_30d || 0
    case 'total': return or.usage_total || llm?.cost_total || 0
    default: return llm?.cost_30d || 0
  }
}

// ─── Sparkline (pure CSS) ────────────────────────────────
function MiniBar({ data, color = '#3b82f6', height = 32 }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => parseFloat(d.cost || 0)), 0.01)
  return (
    <div className="flex items-end gap-px" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
          style={{
            backgroundColor: color,
            height: `${Math.max((parseFloat(d.cost || 0) / max) * 100, 4)}%`,
            minWidth: 3
          }}
          title={`${d.date}: $${fmt(d.cost)}`}
        />
      ))}
    </div>
  )
}

// ─── Period Selector ──────────────────────────────────────
function PeriodSelector({ value, onChange, size = 'normal' }) {
  const sizeClasses = size === 'small' 
    ? 'text-[10px] px-1.5 py-0.5' 
    : 'text-xs px-2.5 py-1'
  return (
    <div className="flex items-center gap-0.5 bg-gray-800/80 rounded-lg p-0.5">
      {PERIODS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          title={p.long}
          className={`${sizeClasses} rounded-md font-medium transition-all ${
            value === p.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────
function KPI({ label, value, sub, color = 'text-white', icon }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${color} tabular-nums`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────
function SectionHeader({ icon, title, badge, right }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{icon}</span>
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h2>
      {badge !== undefined && (
        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-gray-700/50 text-gray-400 rounded-full">{badge}</span>
      )}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  )
}

// ─── Infra Cost Row ──────────────────────────────────────
function InfraCostList({ infra, periodLabel }) {
  const services = [
    { name: 'Railway', data: infra.railway, color: 'bg-purple-500' },
    { name: 'Vercel', data: infra.vercel, color: 'bg-white' },
    { name: 'Neon (PG)', data: infra.neon, color: 'bg-green-500' },
    { name: 'OpenRouter', data: infra.openrouter, color: 'bg-orange-500' },
    { name: 'Instantly', data: infra.instantly, color: 'bg-yellow-500' },
    { name: 'Resend', data: infra.resend, color: 'bg-blue-500' },
    { name: 'Dominio', data: infra.domain, color: 'bg-gray-500' }
  ]

  return (
    <div className="space-y-2">
      {services.map(item => {
        const cost = typeof item.data === 'object' ? item.data?.cost : item.data
        const source = typeof item.data === 'object' ? item.data?.source : null
        const isReal = source && !source.includes('fallback') && !source.includes('estimate')
        return (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-gray-400">{item.name}</span>
              {source && (
                <span className={`text-[9px] px-1 py-0.5 rounded ${isReal ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {isReal ? 'API' : 'est.'}
                </span>
              )}
            </div>
            <span className="text-gray-300 tabular-nums">{fmtUSD(cost)}</span>
          </div>
        )
      })}
      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700 font-medium">
        <span className="text-gray-300">Total {periodLabel ? `(${periodLabel})` : ''}</span>
        <span className="text-red-400 tabular-nums">{fmtUSD(infra.total)}</span>
      </div>
    </div>
  )
}

// ─── Admin Login Screen ─────────────────────────────────
function AdminLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok || !data.token) throw new Error(data.message || data.error || 'Login fallido')
      if (data.user?.role !== 'admin') throw new Error('Acceso denegado. Solo administradores.')
      localStorage.setItem('token', data.token)
      onLogin(data.token)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-white mb-1">🔒 Admin Panel</div>
          <div className="text-gray-500 text-sm">Lanzalo.pro</div>
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="admin@ejemplo.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-blue-400 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            {submitting ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Admin Dashboard ────────────────────────────────
export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState('30d')
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const refreshRef = useRef(null)

  // Verify if current token belongs to an admin
  useEffect(() => {
    if (!token) {
      setAuthChecked(true)
      setIsAdmin(false)
      return
    }
    fetch(apiUrl('/api/user/profile'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user?.role === 'admin') {
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
        }
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setAuthChecked(true))
  }, [token])

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(apiUrl(`/api/admin/live?period=${period}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 401 || res.status === 403) {
        setIsAdmin(false)
        setAuthChecked(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdate(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, period])

  useEffect(() => {
    if (isAdmin && token) {
      fetchData()
      refreshRef.current = setInterval(fetchData, 30000)
      return () => clearInterval(refreshRef.current)
    }
  }, [isAdmin, token, fetchData])

  // Show login if not authenticated or not admin
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-500 text-sm">Verificando acceso...</div>
        </div>
      </div>
    )
  }

  if (!token || !isAdmin) {
    return <AdminLoginScreen onLogin={(newToken) => { setToken(newToken); setAuthChecked(false) }} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-500 text-sm">Cargando panel admin...</div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">Error: {error}</div>
          <button onClick={fetchData} className="text-blue-400 hover:text-blue-300 text-sm">Reintentar</button>
        </div>
      </div>
    )
  }

  const d = data || {}
  const users = d.users || {}
  const companies = d.companies || {}
  const revenue = d.revenue || {}
  const costs = d.costs || {}
  const llm = costs.llm || {}
  const infra = costs.infra || {}
  const profit = d.profit || {}
  const emailPro = d.emailProRevenue || {}
  const tasks = d.tasks || {}
  const activity = d.activity || {}

  const taskSummaryMap = {}
  ;(tasks.summary || []).forEach(t => { taskSummaryMap[t.status] = parseInt(t.count) })
  const totalTasks = Object.values(taskSummaryMap).reduce((a, b) => a + b, 0)

  // LLM cost for current period
  const llmCostForPeriod = getLLMCostForPeriod(llm, period)
  const periodLabel = PERIODS.find(p => p.id === period)?.label || '30d'

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'costs', label: 'Costes', icon: '💰' },
    { id: 'users', label: 'Usuarios', icon: '👥' },
    { id: 'activity', label: 'Actividad', icon: '⚡' }
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ─── Top Bar ─────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <span className="font-bold text-lg">Lanzalo</span>
            <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full font-medium">ADMIN</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 ml-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white font-medium'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Period selector (global) */}
          <div className="ml-auto flex items-center gap-3">
            <PeriodSelector value={period} onChange={setPeriod} />
            {lastUpdate && (
              <span className="text-xs text-gray-600">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live — auto-refresh 30s" />
            <a href="/" className="text-xs text-gray-500 hover:text-gray-300">← Dashboard</a>
          </div>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-4 py-6">

        {/* ─── OVERVIEW TAB ──────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <KPI label="Usuarios" value={fmtInt(users.total)} sub={`+${fmtInt(users.new_7d)} esta semana`} icon="👤" />
              <KPI label="Pro" value={fmtInt(users.pro)} sub={`${fmtInt(users.total - users.pro)} free`} color="text-purple-400" icon="⭐" />
              <KPI label="MRR" value={fmtUSD(revenue.mrr)} sub={`${fmtInt(revenue.proCount)} × $39`} color="text-green-400" icon="💵" />
              <KPI 
                label={`Costes (${periodLabel})`} 
                value={fmtUSD(infra.total)} 
                sub={`LLM: ${fmtUSD(llmCostForPeriod)}`} 
                color="text-red-400" 
                icon="🔥" 
              />
              <KPI label="Beneficio" value={fmtUSD(profit.amount)} sub={`Margen: ${profit.margin}%`} color={profit.amount >= 0 ? 'text-green-400' : 'text-red-400'} icon="📈" />
              <KPI label="Empresas" value={fmtInt(companies.total)} sub={`${fmtInt(companies.live)} live · ${fmtInt(companies.building)} building`} icon="🏢" />
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column (2/3) */}
              <div className="lg:col-span-2 space-y-6">
                {/* LLM Cost Trend */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                  <SectionHeader icon="📉" title="Coste LLM (14 días)" badge={fmtUSD(llmCostForPeriod) + ` /${periodLabel}`} />
                  <MiniBar data={llm.daily || []} color="#ef4444" height={48} />
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className={period === '24h' ? 'text-blue-400 font-medium' : ''}>24h: {fmtUSD(llm.cost_24h)}</span>
                    <span className={period === '7d' ? 'text-blue-400 font-medium' : ''}>7d: {fmtUSD(llm.cost_7d)}</span>
                    <span className={period === '30d' ? 'text-blue-400 font-medium' : ''}>30d: {fmtUSD(llm.cost_30d)}</span>
                    <span className={period === 'total' ? 'text-blue-400 font-medium' : ''}>Total: {fmtUSD(llm.cost_total)}</span>
                    <span className="ml-auto">{fmtTokens(period === 'total' ? llm.tokens_total : llm.tokens_30d)} tokens</span>
                  </div>
                </div>

                {/* Recent Tasks */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                  <SectionHeader icon="📋" title="Tareas recientes" badge={totalTasks} />
                  <div className="flex gap-3 mb-4 text-xs">
                    {['todo', 'in_progress', 'completed', 'failed'].map(s => (
                      <span key={s} className={`${statusColor[s]} tabular-nums`}>
                        {statusIcon[s]} {taskSummaryMap[s] || 0} {s}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(tasks.recent || []).map(task => (
                      <div key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
                        <span className={`text-sm ${statusColor[task.status]}`}>{statusIcon[task.status]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-300 truncate">{task.title}</div>
                          <div className="text-xs text-gray-600">{task.company_name} · {task.tag}</div>
                        </div>
                        <span className="text-xs text-gray-600 shrink-0">{timeAgo(task.created_at)}</span>
                      </div>
                    ))}
                    {(!tasks.recent || tasks.recent.length === 0) && (
                      <div className="text-gray-600 text-sm py-4 text-center">Sin tareas</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column (1/3) */}
              <div className="space-y-6">
                {/* Infrastructure Costs */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                  <SectionHeader icon="🏗️" title={`Infraestructura (${periodLabel})`} />
                  <InfraCostList infra={infra} periodLabel={periodLabel} />
                </div>

                {/* LLM by Model */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                  <SectionHeader icon="🤖" title={`Coste por modelo (${periodLabel})`} />
                  <div className="space-y-2">
                    {(llm.byModel || []).map((m, i) => {
                      const maxCost = Math.max(...(llm.byModel || []).map(x => parseFloat(x.cost || 0)), 0.01)
                      const pct = (parseFloat(m.cost || 0) / maxCost) * 100
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-400 truncate max-w-[140px]">{modelShortName(m.model)}</span>
                            <span className="text-gray-300 tabular-nums">{fmtUSD(m.cost)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-gray-600 mt-0.5">{fmtInt(m.calls)} calls · {fmtTokens(m.tokens)} tokens</div>
                        </div>
                      )
                    })}
                    {(!llm.byModel || llm.byModel.length === 0) && (
                      <div className="text-gray-600 text-sm py-2 text-center">Sin datos</div>
                    )}
                  </div>
                </div>

                {/* Top Cost Companies */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                  <SectionHeader icon="🏷️" title={`Top coste (${periodLabel})`} />
                  <div className="space-y-2">
                    {(activity.topCostCompanies || []).slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-300 truncate text-xs">{c.name || 'Sin nombre'}</div>
                          <div className="text-[10px] text-gray-600 truncate">{c.owner}</div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-xs text-red-400 tabular-nums">{fmtUSD(c.cost)}</div>
                          <div className="text-[10px] text-gray-600">{fmtInt(c.calls)} calls</div>
                        </div>
                      </div>
                    ))}
                    {(!activity.topCostCompanies || activity.topCostCompanies.length === 0) && (
                      <div className="text-gray-600 text-sm py-2 text-center">Sin datos</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── COSTS TAB ─────────────────────────── */}
        {activeTab === 'costs' && (
          <>
            {/* Cost KPIs — all 4 periods always visible, active one highlighted */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div onClick={() => setPeriod('24h')} className={`cursor-pointer rounded-xl p-4 border transition-colors ${period === '24h' ? 'bg-blue-600/10 border-blue-500/50' : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'}`}>
                <span className="text-xs font-medium text-gray-500 uppercase">LLM 24h</span>
                <div className={`text-2xl font-bold tabular-nums ${period === '24h' ? 'text-blue-400' : 'text-orange-400'}`}>{fmtUSD(llm.cost_24h)}</div>
              </div>
              <div onClick={() => setPeriod('7d')} className={`cursor-pointer rounded-xl p-4 border transition-colors ${period === '7d' ? 'bg-blue-600/10 border-blue-500/50' : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'}`}>
                <span className="text-xs font-medium text-gray-500 uppercase">LLM 7d</span>
                <div className={`text-2xl font-bold tabular-nums ${period === '7d' ? 'text-blue-400' : 'text-orange-400'}`}>{fmtUSD(llm.cost_7d)}</div>
              </div>
              <div onClick={() => setPeriod('30d')} className={`cursor-pointer rounded-xl p-4 border transition-colors ${period === '30d' ? 'bg-blue-600/10 border-blue-500/50' : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'}`}>
                <span className="text-xs font-medium text-gray-500 uppercase">LLM 30d</span>
                <div className={`text-2xl font-bold tabular-nums ${period === '30d' ? 'text-blue-400' : 'text-red-400'}`}>{fmtUSD(llm.cost_30d)}</div>
              </div>
              <div onClick={() => setPeriod('total')} className={`cursor-pointer rounded-xl p-4 border transition-colors ${period === 'total' ? 'bg-blue-600/10 border-blue-500/50' : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'}`}>
                <span className="text-xs font-medium text-gray-500 uppercase">LLM Total</span>
                <div className={`text-2xl font-bold tabular-nums ${period === 'total' ? 'text-blue-400' : 'text-red-400'}`}>{fmtUSD(llm.cost_total)}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
                <span className="text-xs font-medium text-gray-500 uppercase">Total Infra ({periodLabel})</span>
                <div className="text-2xl font-bold text-red-400 tabular-nums">{fmtUSD(infra.total)}</div>
                <div className="text-xs text-gray-500 mt-1">LLM + servicios</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily cost trend */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <SectionHeader icon="📊" title="Coste diario LLM (14d)" />
                <MiniBar data={llm.daily || []} color="#f97316" height={80} />
                <div className="grid grid-cols-7 gap-px mt-2">
                  {(llm.daily || []).slice(-7).map((d, i) => (
                    <div key={i} className="text-center">
                      <div className="text-[10px] text-gray-600">{new Date(d.date).toLocaleDateString('es', { weekday: 'narrow' })}</div>
                      <div className="text-xs text-gray-400 tabular-nums">${fmt(d.cost, 2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost by model detailed */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <SectionHeader icon="🤖" title={`Desglose por modelo (${periodLabel})`} />
                <div className="space-y-3">
                  {(llm.byModel || []).map((m, i) => {
                    const totalCost = (llm.byModel || []).reduce((a, x) => a + parseFloat(x.cost || 0), 0)
                    const pct = totalCost > 0 ? ((parseFloat(m.cost || 0) / totalCost) * 100).toFixed(1) : 0
                    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500']
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-sm ${colors[i % colors.length]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-300 truncate">{modelShortName(m.model)}</span>
                            <span className="text-sm text-gray-300 tabular-nums ml-2">{fmtUSD(m.cost)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-600">
                            <span>{pct}% del total</span>
                            <span>{fmtInt(m.calls)} llamadas · {fmtTokens(m.tokens)} tokens</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* P&L Summary */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <SectionHeader icon="💵" title="P&L Mensual" />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Ingresos (MRR)</span>
                    <span className="text-green-400 tabular-nums font-medium">+{fmtUSD(revenue.mrr)}</span>
                  </div>
                  <div className="border-t border-gray-800 pt-2 space-y-1">
                    {[
                      { name: 'Railway', data: infra.railway },
                      { name: 'Vercel', data: infra.vercel },
                      { name: 'Neon (PostgreSQL)', data: infra.neon },
                      { name: 'OpenRouter (LLMs)', data: infra.openrouter },
                      { name: 'Instantly (Email)', data: infra.instantly },
                      { name: 'Resend', data: infra.resend },
                      { name: 'Dominio', data: infra.domain }
                    ].map(item => {
                      const cost = typeof item.data === 'object' ? item.data?.cost : item.data
                      return (
                        <div key={item.name} className="flex justify-between text-xs">
                          <span className="text-gray-500">{item.name}</span>
                          <span className="text-red-400 tabular-nums">-{fmtUSD(cost)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-gray-300">Beneficio neto</span>
                    <span className={profit.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {profit.amount >= 0 ? '+' : ''}{fmtUSD(profit.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Margen</span>
                    <span className={`tabular-nums ${profit.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profit.margin}%
                    </span>
                  </div>
                  {profit.amount < 0 && (
                    <div className="text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 mt-2">
                      Break-even: {Math.ceil(costs.total / 39)} usuarios Pro necesarios
                    </div>
                  )}
                  {/* Data source info */}
                  {costs._sources && (
                    <div className="text-[10px] text-gray-700 mt-3 flex flex-wrap gap-x-3">
                      {Object.entries(costs._sources).filter(([k]) => k !== 'cache_ttl').map(([k, v]) => (
                        <span key={k}>{k}: <span className={v.includes('api') ? 'text-green-600' : 'text-yellow-600'}>{v}</span></span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Pro P&L */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <SectionHeader icon="📧" title="Email Pro — P&L" />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Suscripciones activas</span>
                    <span className="text-white tabular-nums font-medium">{emailPro.activeSubs || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Ingresos ({emailPro.activeSubs || 0} × {emailPro.pricePerSub || 15}€)</span>
                    <span className="text-green-400 tabular-nums font-medium">+€{fmt(emailPro.monthlyRevenue || 0)}</span>
                  </div>
                  <div className="border-t border-gray-800 pt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Instantly Growth plan</span>
                      <span className="text-red-400 tabular-nums">-{fmtUSD(emailPro.instantlyCost || 0)}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-gray-300">Margen Email Pro</span>
                    <span className={(emailPro.netMargin || 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {(emailPro.netMargin || 0) >= 0 ? '+' : ''}€{fmt(emailPro.netMargin || 0)}
                    </span>
                  </div>
                  {(emailPro.activeSubs || 0) === 0 && (
                    <div className="text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 mt-2">
                      Break-even: {Math.ceil((emailPro.instantlyCost || 49) / (emailPro.pricePerSub || 15))} suscripciones necesarias (~{Math.ceil((emailPro.instantlyCost || 49) / (emailPro.pricePerSub || 15)) * 15}€/mes)
                    </div>
                  )}
                </div>
              </div>

              {/* Cost per company */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <SectionHeader icon="🏷️" title={`Coste por empresa (${periodLabel})`} />
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(activity.topCostCompanies || []).map((c, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-800/50 last:border-0">
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-300 truncate">{c.name || 'Sin nombre'}</div>
                        <div className="text-[10px] text-gray-600 truncate">{c.owner}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-red-400 tabular-nums">{fmtUSD(c.cost)}</div>
                        <div className="text-[10px] text-gray-600">{fmtInt(c.calls)} API calls</div>
                      </div>
                    </div>
                  ))}
                  {(!activity.topCostCompanies || activity.topCostCompanies.length === 0) && (
                    <div className="text-gray-600 text-sm py-4 text-center">Sin datos de costes</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── USERS TAB ─────────────────────────── */}
        {activeTab === 'users' && (
          <UsersTab token={token} users={users} companies={companies} />
        )}

        {/* ─── ACTIVITY TAB ──────────────────────── */}
        {activeTab === 'activity' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Chats */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <SectionHeader icon="💬" title="Chat reciente" badge={(activity.recentChats || []).length} />
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {(activity.recentChats || []).map((msg, i) => (
                    <div key={i} className="border-b border-gray-800/50 pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          msg.role === 'assistant' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {msg.role === 'assistant' ? 'Co-Founder' : 'Usuario'}
                        </span>
                        <span className="text-xs text-gray-600">{msg.company_name}</span>
                        <span className="text-xs text-gray-700 ml-auto">{timeAgo(msg.created_at)}</span>
                      </div>
                      <div className="text-sm text-gray-400 line-clamp-2">{msg.content}</div>
                    </div>
                  ))}
                  {(!activity.recentChats || activity.recentChats.length === 0) && (
                    <div className="text-gray-600 text-sm py-4 text-center">Sin mensajes recientes</div>
                  )}
                </div>
              </div>

              {/* Recent Tasks */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <SectionHeader icon="📋" title="Todas las tareas" badge={totalTasks} />
                <div className="flex gap-3 mb-4 text-xs flex-wrap">
                  {Object.entries(taskSummaryMap).map(([status, count]) => (
                    <span key={status} className={`${statusColor[status] || 'text-gray-400'} tabular-nums`}>
                      {statusIcon[status] || '·'} {count} {status}
                    </span>
                  ))}
                </div>
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {(tasks.recent || []).map(task => (
                    <div key={task.id} className="flex items-start gap-3 py-2 border-b border-gray-800/50 last:border-0">
                      <span className={`text-sm mt-0.5 ${statusColor[task.status]}`}>{statusIcon[task.status]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-300">{task.title}</div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 mt-0.5">
                          <span>{task.company_name}</span>
                          <span>·</span>
                          <span>{task.tag}</span>
                          {task.assigned_to && <><span>·</span><span>{task.assigned_to}</span></>}
                          <span>·</span>
                          <span className={`font-medium ${
                            task.priority === 'critical' ? 'text-red-500' :
                            task.priority === 'high' ? 'text-orange-500' : 'text-gray-500'
                          }`}>{task.priority}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 shrink-0">{timeAgo(task.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Users Sub-Tab (separate fetch) ──────────────────────
function UsersTab({ token, users: userStats, companies: companyStats }) {
  const [usersList, setUsersList] = useState(null)
  const [companiesList, setCompaniesList] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, companiesRes] = await Promise.all([
          fetch(apiUrl('/api/admin/users'), { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(apiUrl('/api/admin/companies'), { headers: { 'Authorization': `Bearer ${token}` } })
        ])
        const usersData = await usersRes.json()
        const companiesData = await companiesRes.json()
        setUsersList(usersData.users || [])
        setCompaniesList(companiesData.companies || [])
      } catch (e) {
        console.error('Error loading users/companies:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (loading) {
    return <div className="text-gray-500 text-center py-12">Cargando...</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Users Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <SectionHeader icon="👤" title="Usuarios" badge={usersList?.length} />
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-900">
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-left py-2 pr-3">Email</th>
                <th className="text-left py-2 pr-3">Plan</th>
                <th className="text-right py-2 pr-3">Empresas</th>
                <th className="text-right py-2">Coste LLM</th>
              </tr>
            </thead>
            <tbody>
              {(usersList || []).map(u => (
                <tr key={u.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-3">
                    <div className="text-gray-300 truncate max-w-[200px]">{u.email}</div>
                    <div className="text-[10px] text-gray-600">{u.name || 'Sin nombre'} · {timeAgo(u.created_at)}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      u.plan === 'pro' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700/50 text-gray-500'
                    }`}>
                      {u.plan}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-400 tabular-nums">{u.companies_count}</td>
                  <td className="py-2 text-right text-red-400/80 tabular-nums text-xs">{fmtUSD(u.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!usersList || usersList.length === 0) && (
            <div className="text-gray-600 text-sm py-8 text-center">Sin usuarios</div>
          )}
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <SectionHeader icon="🏢" title="Empresas" badge={companiesList?.length} />
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-900">
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-left py-2 pr-3">Empresa</th>
                <th className="text-left py-2 pr-3">Estado</th>
                <th className="text-right py-2 pr-3">Tareas</th>
                <th className="text-right py-2">Coste</th>
              </tr>
            </thead>
            <tbody>
              {(companiesList || []).map(c => (
                <tr key={c.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-3">
                    <div className="text-gray-300 truncate max-w-[180px]">{c.name}</div>
                    <div className="text-[10px] text-gray-600 truncate">{c.owner_email}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      c.status === 'live' ? 'bg-green-500/20 text-green-400' :
                      c.status === 'building' ? 'bg-blue-500/20 text-blue-400' :
                      c.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-700/50 text-gray-500'
                    }`}>
                      {c.status || 'new'}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-400 tabular-nums">{c.tasks_count}</td>
                  <td className="py-2 text-right text-red-400/80 tabular-nums text-xs">{fmtUSD(c.llm_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!companiesList || companiesList.length === 0) && (
            <div className="text-gray-600 text-sm py-8 text-center">Sin empresas</div>
          )}
        </div>
      </div>
    </div>
  )
}
