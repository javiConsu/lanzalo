import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrgChart } from '../components/OrgChart'
import { Budgets } from '../components/Budgets'
import { Governance } from '../components/Governance'
import { Heartbeat } from '../components/Heartbeat'
import { Timeline } from '../components/Timeline'
import { apiUrl } from '../api.js'

export default function CompanyDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('org')
  const [company, setCompany] = useState(null)
  const [agents, setAgents] = useState([])
  const [budgets, setBudgets] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Cargar datos de la empresa actual
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.companies?.[0]) {
          setCompany(d.companies[0])
          loadCompanyData(d.companies[0].id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
      .finally(() => setLoading(false))
  }, [])

  const loadCompanyData = (companyId) => {
    const token = localStorage.getItem('token')

    // Cargar agentes
    fetch(apiUrl(`/api/company/${companyId}/agents`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setAgents(d.agents || [])
      })
      .catch(() => {})

    // Cargar budgets
    fetch(apiUrl(`/api/company/${companyId}/budgets`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setBudgets(d.budgets || [])
      })
      .catch(() => {})

    // Cargar events
    fetch(apiUrl(`/api/company/${companyId}/events`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setEvents(d.events || [])
      })
      .catch(() => {})
  }

  const handleGovernanceAction = (action, agentId) => {
    const token = localStorage.getItem('token')
    fetch(apiUrl(`/api/company/${company.id}/agents/${agentId}/${action}`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(r => r.json())
      .then(() => {
        loadCompanyData(company.id)
      })
      .catch(err => {
        console.error('Governance action failed:', err)
      })
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Company Dashboard</h1>
              <p className="text-gray-400 text-sm">Manage your AI agents</p>
            </div>
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <span>💬</span> Back to Chat
            </button>
          </div>
        </div>

        {/* Tabs */}
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

        {/* Tab content */}
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