import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { OrgChart } from '../components/OrgChart'
import { Budgets } from '../components/Budgets'
import { Governance } from '../components/Governance'
import { Heartbeat } from '../components/Heartbeat'
import { Timeline } from '../components/Timeline'
import { apiUrl } from '../api.js'

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const { companyId } = useParams()
  const [activeTab, setActiveTab] = useState('org')
  const [company, setCompany] = useState(null)
  const [agents, setAgents] = useState([])
  const [budgets, setBudgets] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || !companyId) {
      setLoading(false)
      return
    }

    loadCompanyData(companyId)
  }, [companyId])

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  })

  const loadCompanyData = async (targetCompanyId) => {
    const token = localStorage.getItem('token')
    if (!token || !targetCompanyId) return

    setLoading(true)
    setError(null)

    try {
      const [companyRes, agentsRes, budgetsRes, eventsRes] = await Promise.all([
        fetch(apiUrl(`/api/user/companies/${targetCompanyId}`), { headers: authHeaders() }),
        fetch(apiUrl(`/api/company/${targetCompanyId}/agents`), { headers: authHeaders() }),
        fetch(apiUrl(`/api/company/${targetCompanyId}/budgets`), { headers: authHeaders() }),
        fetch(apiUrl(`/api/company/${targetCompanyId}/events`), { headers: authHeaders() })
      ])

      const [companyData, agentsData, budgetsData, eventsData] = await Promise.all([
        companyRes.ok ? companyRes.json() : Promise.resolve(null),
        agentsRes.ok ? agentsRes.json() : Promise.resolve({ agents: [] }),
        budgetsRes.ok ? budgetsRes.json() : Promise.resolve({ budgets: [] }),
        eventsRes.ok ? eventsRes.json() : Promise.resolve({ events: [] })
      ])

      setCompany(companyData?.company || null)
      setAgents(Array.isArray(agentsData?.agents) ? agentsData.agents : [])
      setBudgets(Array.isArray(budgetsData?.budgets) ? budgetsData.budgets : [])
      setEvents(Array.isArray(eventsData?.events) ? eventsData.events : [])
    } catch (err) {
      console.error('Company dashboard load failed:', err)
      setError('No se pudo cargar el dashboard operativo')
    } finally {
      setLoading(false)
    }
  }

  const handleGovernanceAction = async (action, agentId) => {
    try {
      await fetch(apiUrl(`/api/company/${companyId}/agents/${agentId}/${action}`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({})
      })
      await loadCompanyData(companyId)
    } catch (err) {
      console.error('Governance action failed:', err)
      setError(`No se pudo ejecutar ${action} sobre ${agentId}`)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-200">
          <h2 className="text-lg font-semibold mb-2">Dashboard operativo no disponible</h2>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">No company found</p>
      </div>
    )
  }

  const tabs = [
    { id: 'org', label: 'Org Chart', icon: '📊' },
    { id: 'budgets', label: 'Budgets', icon: '💰' },
    { id: 'governance', label: 'Governance', icon: '⚙️' },
    { id: 'heartbeat', label: 'Heartbeat', icon: '💓' },
    { id: 'timeline', label: 'Timeline', icon: '📅' }
  ]

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{company.name} · Dashboard operativo</h1>
              <p className="text-gray-400 text-sm">Estados reales de agentes, presupuesto y gobernanza</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadCompanyData(companyId)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-all"
              >
                Refresh
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all"
              >
                Volver
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 border-b border-gray-700/50 bg-gray-900/50">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300 border-b-2 border-transparent'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'org' && <OrgChart agents={agents} />}
          {activeTab === 'budgets' && <Budgets budgets={budgets} />}
          {activeTab === 'governance' && (
            <Governance
              agents={agents}
              events={events}
              onAction={handleGovernanceAction}
            />
          )}
          {activeTab === 'heartbeat' && <Heartbeat agents={agents} />}
          {activeTab === 'timeline' && <Timeline events={events} />}
        </div>
      </div>
    </div>
  )
}
