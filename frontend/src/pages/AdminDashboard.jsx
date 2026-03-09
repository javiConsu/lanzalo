/**
 * Admin Dashboard — Stats + Soporte (tickets de feedback y bugs)
 */
import { useState, useEffect, useCallback } from 'react'
import { apiUrl } from '../api.js'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [tickets, setTickets] = useState([])
  const [ticketCounts, setTicketCounts] = useState({})
  const [activeTab, setActiveTab] = useState('pending')
  const [resolving, setResolving] = useState(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch(apiUrl('/api/admin/stats'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error)
  }, [])

  const loadTickets = useCallback(async (status = activeTab) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/support/tickets?status=${status}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setTickets(data.tickets || [])
      setTicketCounts(data.counts || {})
    } catch (e) {
      console.error('Error loading tickets:', e)
    }
  }, [activeTab, token])

  useEffect(() => { loadTickets() }, [activeTab])

  const handleResolve = async (ticketId, status) => {
    setResolving(ticketId)
    try {
      await fetch(apiUrl(`/api/admin/support/tickets/${ticketId}/resolve`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, adminNotes: '' })
      })
      await loadTickets()
    } catch (e) {
      console.error('Error resolving ticket:', e)
    } finally {
      setResolving(null)
    }
  }

  const tabStyle = (tab) =>
    `px-3 py-1.5 text-sm rounded-lg transition-colors ${
      activeTab === tab
        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">👑</span>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <a href="/" className="ml-auto text-sm text-gray-400 hover:text-white">← Volver al dashboard</a>
        </div>

        {/* Stats */}
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="text-gray-400 text-sm mb-1">Usuarios totales</div>
              <div className="text-2xl font-bold text-white">{stats.total_users || 0}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="text-gray-400 text-sm mb-1">Empresas activas</div>
              <div className="text-2xl font-bold text-white">{stats.total_companies || 0}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="text-gray-400 text-sm mb-1">Usuarios Pro</div>
              <div className="text-2xl font-bold text-white">{stats.pro_users || 0}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 mb-8">Cargando estadísticas...</div>
        )}

        {/* ═══ Soporte / Feedback Tickets ═══ */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎫</span>
                <h2 className="text-lg font-semibold text-white">Soporte & Feedback</h2>
              </div>
              <div className="flex gap-2">
                {['pending', 'approved', 'resolved', 'rejected'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={tabStyle(tab)}>
                    {tab === 'pending' ? 'Pendientes' : tab === 'approved' ? 'Aprobados' : tab === 'resolved' ? 'Resueltos' : 'Rechazados'}
                    {ticketCounts[tab] ? ` (${ticketCounts[tab]})` : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-700/50">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay tickets {activeTab === 'pending' ? 'pendientes' : `con estado "${activeTab}"`}
              </div>
            ) : tickets.map(ticket => (
              <div key={ticket.id} className="p-5 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Type badge */}
                  <div className={`mt-0.5 px-2 py-1 rounded text-xs font-medium ${
                    ticket.type === 'bug'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                      : 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
                  }`}>
                    {ticket.type === 'bug' ? '🐛 Bug' : '💡 Feedback'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{ticket.user_email || 'Usuario'}</span>
                      <span className="text-xs text-gray-500">{ticket.company_name}</span>
                      {ticket.user_plan === 'trial' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-full">trial</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.message}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(ticket.created_at).toLocaleString('es-ES')}
                      {ticket.credits_awarded > 0 && (
                        <span className="ml-2 text-emerald-400">+{ticket.credits_awarded} créditos otorgados</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {activeTab === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      {ticket.type === 'feedback' && (
                        <button
                          onClick={() => handleResolve(ticket.id, 'approved')}
                          disabled={resolving === ticket.id}
                          className="px-3 py-1.5 text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {resolving === ticket.id ? '...' : '✅ Aprobar (+créditos)'}
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(ticket.id, 'resolved')}
                        disabled={resolving === ticket.id}
                        className="px-3 py-1.5 text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {resolving === ticket.id ? '...' : ticket.type === 'bug' ? '🔧 Resuelto' : 'Resolver'}
                      </button>
                      <button
                        onClick={() => handleResolve(ticket.id, 'rejected')}
                        disabled={resolving === ticket.id}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        ✗
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
