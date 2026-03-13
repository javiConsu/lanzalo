import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, Component } from 'react'
import { apiUrl } from './api.js'
import PostHogProvider from './components/PostHogProvider'
import { identifyLanzaloUser, trackSessionAndCheckActivation } from './lib/analytics/events'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardHome from './pages/DashboardHome'
import AgentOffice from './pages/AgentOffice'
import Ideas from './pages/Ideas'
import Backlog from './pages/Backlog'
import Marketing from './pages/Marketing'
import Discovery from './pages/Discovery'
import DiscoveryAnalysis from './pages/DiscoveryAnalysis'
import OnboardingSurvey from './pages/OnboardingSurvey'
import OnboardingChoosePath from './pages/OnboardingChoosePath'
import OnboardingChooseIdea from './pages/OnboardingChooseIdea'
import OnboardingDescribeIdea from './pages/OnboardingDescribeIdea'
import OnboardingFounderProfile from './pages/OnboardingFounderProfile'
import OnboardingIdeaSource from './pages/OnboardingIdeaSource'
import OnboardingIdeaBrowser from './pages/OnboardingIdeaBrowser'
import ViabilityAnalysis from './pages/ViabilityAnalysis'
import Plan14Days from './pages/Plan14Days'
import CofundadorDashboard from './pages/CofundadorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import CompanyDashboard from './pages/CompanyDashboard'
import Paywall from './components/Paywall'
import BusinessHub from './pages/BusinessHub'
import RecoverPassword from './pages/RecoverPassword'
import RecoverPasswordConfirm from './pages/RecoverPasswordConfirm'
import Settings from './pages/Settings'
import Chat from './pages/Chat'
import Metrics from './pages/Metrics'
import LiveFeedPage from './pages/LiveFeedPage'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crash:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c9d1d9', fontFamily: 'monospace', padding: '20px' }}>
          <h2 style={{ color: '#f85149', marginBottom: '16px' }}>Error en el dashboard</h2>
          <pre style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px', maxWidth: '90vw', width: '600px', overflow: 'auto', fontSize: '11px', color: '#f0883e', marginBottom: '16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.errorInfo?.componentStack?.slice(0, 800)}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/' }}
            style={{ padding: '12px 32px', background: '#00ff87', color: '#0d1117', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '16px' }}
          >
            Limpiar sesion y recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem('token'))
  const [showLogin, setShowLogin] = useState(false)
  const [loginMode, setLoginMode] = useState('register')

  useEffect(() => {
    if (token) {
      setLoading(true)
      fetch(apiUrl('/api/user/profile'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Token invalido')
          return res.json()
        })
        .then(data => {
          if (data.user) {
            setUser(data.user)
            // Identificar usuario en PostHog y trackear sesión
            const u = data.user
            localStorage.setItem('lanzalo_user_id', u.id)
            identifyLanzaloUser({
              userId: u.id,
              plan: u.plan || 'trial',
              fechaRegistro: u.created_at || '',
              tipoUsuario: u.is_agent ? 'agente_autonomo' : 'founder_humano',
            })
            trackSessionAndCheckActivation({
              userId: u.id,
              plan: u.plan || 'trial',
              fechaRegistro: u.created_at || '',
            })
          } else {
            localStorage.removeItem('token')
            setToken(null)
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
          setToken(null)
        })
        .finally(() => setLoading(false))
    }
  }, [token])

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)
    setShowLogin(false)
    if (userData?.id) {
      localStorage.setItem('lanzalo_user_id', userData.id)
      identifyLanzaloUser({
        userId: userData.id,
        plan: userData.plan || 'trial',
        fechaRegistro: userData.created_at || '',
        tipoUsuario: userData.is_agent ? 'agente_autonomo' : 'founder_humano',
      })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setShowLogin(false)
    window.location.href = '/'
  }

  const handleNavigateToLogin = (mode) => {
    setLoginMode(mode || 'register')
    setShowLogin(true)
  }

  const isAdminPath = window.location.pathname === '/admin'

  if (isAdminPath) {
    return (
      <ErrorBoundary>
        <Router>
          <PostHogProvider>
            <Routes>
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </PostHogProvider>
        </Router>
      </ErrorBoundary>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <div>Cargando...</div>
        </div>
      </div>
    )
  }

  if (!token) {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('ref')) {
      localStorage.setItem('pendingRef', urlParams.get('ref'))
    }

    const resetToken = urlParams.get('reset_token')
    if (resetToken) {
      return (
        <RecoverPasswordConfirm
          token={resetToken}
          onClose={() => {
            window.history.replaceState({}, '', window.location.pathname)
            setShowLogin(false)
          }}
        />
      )
    }

    if (urlParams.get('feedback') && urlParams.get('company')) {
      localStorage.setItem('pendingFeedback', JSON.stringify({
        feedback: urlParams.get('feedback'),
        company: urlParams.get('company')
      }))
      if (!showLogin) {
        setLoginMode('login')
        setShowLogin(true)
      }
    }

    if (showLogin) {
      return (
        <Login
          onLogin={handleLogin}
          mode={loginMode}
          onClose={() => setShowLogin(false)}
        />
      )
    }

    return <LandingPage onNavigateToLogin={handleNavigateToLogin} />
  }

  const needsOnboarding = user && user.onboardingCompleted === false

  return (
    <ErrorBoundary>
      <Router>
        <PostHogProvider>
        <Routes>
          <Route path="/recover-password" element={<RecoverPassword />} />
          <Route path="/recover-password/confirm" element={<RecoverPasswordConfirm />} />
          <Route path="/onboarding" element={<OnboardingSurvey user={user} token={token} />} />
          <Route path="/onboarding/choose-path" element={<OnboardingChoosePath user={user} token={token} />} />
          <Route path="/onboarding/choose-idea" element={<OnboardingChooseIdea user={user} token={token} />} />
          <Route path="/onboarding/describe-idea" element={<OnboardingDescribeIdea user={user} token={token} />} />
          <Route path="/onboarding/founder-profile" element={<OnboardingFounderProfile user={user} token={token} />} />
          <Route path="/onboarding/idea-source" element={<OnboardingIdeaSource user={user} token={token} />} />
          <Route path="/onboarding/idea-browser" element={<OnboardingIdeaBrowser user={user} token={token} />} />
          <Route path="/onboarding/viability" element={<ViabilityAnalysis user={user} token={token} />} />
          <Route path="/onboarding/plan" element={<Plan14Days user={user} token={token} />} />
          <Route path="/cofundador" element={<CofundadorDashboard user={user} token={token} />} />
          <Route path="/company/:companyId" element={<CompanyDashboard user={user} token={token} />} />
          <Route path="/paywall" element={<Paywall user={user} token={token} />} />
          <Route path="/dashboard" element={needsOnboarding ? <Navigate to="/onboarding" /> : <Dashboard user={user} token={token} onLogout={handleLogout} />}>
            <Route index element={needsOnboarding ? <Navigate to="/onboarding" /> : <DashboardHome user={user} token={token} />} />
            <Route path="agents" element={needsOnboarding ? <Navigate to="/onboarding" /> : <AgentOffice user={user} token={token} />} />
            <Route path="ideas" element={<Ideas user={user} token={token} />} />
            <Route path="backlog" element={needsOnboarding ? <Navigate to="/onboarding" /> : <Backlog user={user} token={token} />} />
            <Route path="marketing" element={needsOnboarding ? <Navigate to="/onboarding" /> : <Marketing user={user} token={token} />} />
            <Route path="discovery" element={<Discovery user={user} token={token} />} />
            <Route path="discovery/:analysisId" element={<DiscoveryAnalysis user={user} token={token} />} />
            <Route path="hub" element={<BusinessHub user={user} token={token} />} />
            <Route path="settings" element={<Settings user={user} token={token} />} />
          </Route>
          <Route path="/chat" element={needsOnboarding ? <Navigate to="/onboarding" /> : <Chat user={user} token={token} onLogout={handleLogout} />} />
          <Route path="/metrics" element={<Metrics user={user} token={token} />} />
          <Route path="/live" element={needsOnboarding ? <Navigate to="/onboarding" /> : <LiveFeedPage user={user} token={token} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
        </PostHogProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
