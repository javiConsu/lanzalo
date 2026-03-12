import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, Component } from 'react'
import { apiUrl } from './api.js'
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

// Error Boundary — si algo crashea, limpia token y muestra landing
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crash detectado:', error, errorInfo)
    // Limpiar token corrupto para evitar loops
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
          <h2 style={{ color: '#00ff87', marginBottom: '16px' }}>Algo salió mal</h2>
          <p style={{ marginBottom: '24px', color: '#8b949e' }}>Se ha limpiado la sesión. Recarga la página.</p>
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/' }}
            style={{ padding: '12px 32px', background: '#00ff87', color: '#0d1117', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '16px' }}
          >
            Recargar
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
      // Verificar token válido
      setLoading(true)
      fetch(apiUrl('/api/user/profile'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Token inválido')
          return res.json()
        })
        .then(data => {
          if (data.user) {
            setUser(data.user)
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

  // Check if we're on /admin path (before Router mounts)
  const isAdminPath = window.location.pathname === '/admin'

  // /admin has its own self-contained auth — always render it
  if (isAdminPath) {
    return (
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    )
  }

  // Loading user profile
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

  // Not authenticated: show landing or login
  if (!token) {
    // Preserve referral code through login flow
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('ref')) {
      localStorage.setItem('pendingRef', urlParams.get('ref'))
    }

    // Detect password reset token in URL
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

    // Preserve feedback deep-link params through login flow
    if (urlParams.get('feedback') && urlParams.get('company')) {
      localStorage.setItem('pendingFeedback', JSON.stringify({
        feedback: urlParams.get('feedback'),
        company: urlParams.get('company')
      }))
      // Auto-show login for feedback deep-links
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

  // Determine if user needs onboarding
  const needsOnboarding = user && user.onboardingCompleted === false

  // Authenticated: show app
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Recover Password Routes */}
          <Route path="/recover-password" element={<RecoverPassword />} />
          <Route path="/recover-password/confirm" element={<RecoverPasswordConfirm />} />

          {/* Onboarding MVP — nuevo flujo */}
          <Route path="/onboarding" element={<OnboardingSurvey user={user} token={token} />} />
          <Route path="/onboarding/choose-path" element={<OnboardingChoosePath user={user} token={token} />} />
          <Route path="/onboarding/choose-idea" element={<OnboardingChooseIdea user={user} token={token} />} />
          <Route path="/onboarding/describe-idea" element={<OnboardingDescribeIdea user={user} token={token} />} />
          <Route path="/onboarding/founder-profile" element={<OnboardingFounderProfile user={user} token={token} />} />

          {/* Onboarding legacy — compatibilidad */}
          <Route path="/onboarding/idea-source" element={<OnboardingIdeaSource user={user} token={token} />} />
          <Route path="/onboarding/idea-browser" element={<OnboardingIdeaBrowser user={user} token={token} />} />
          <Route path="/onboarding/viability" element={<ViabilityAnalysis user={user} token={token} />} />
          <Route path="/onboarding/plan" element={<Plan14Days user={user} token={token} />} />
          <Route path="/cofundador" element={<CofundadorDashboard user={user} token={token} />} />
          <Route path="/company/:companyId" element={<CompanyDashboard user={user} token={token} />} />

          {/* Co-Fundador Dashboard */}
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
      </Router>
    </ErrorBoundary>
  )
}

export default App
