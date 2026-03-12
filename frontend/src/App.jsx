import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
        .then(res => res.json())
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
      <Router>
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    )
  }

  // Loading user profile
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#888' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
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
        <Login
          onLogin={handleLogin}
          initialMode="login"
          resetToken={resetToken}
          onBack={() => {
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
          initialMode={loginMode}
          onBack={() => setShowLogin(false)}
        />
      )
    }
    return <LandingPage onNavigateToLogin={handleNavigateToLogin} />
  }

  // Determine if user needs onboarding
  const needsOnboarding = user && user.onboardingCompleted === false

  // Authenticated: show app
  return (
    <Router>
      <Routes>
        {/* Recover Password Routes */}
        <Route path="/recover-password" element={<RecoverPassword />} />
        <Route path="/reset-password-confirm" element={<RecoverPasswordConfirm />} />

        {/* Onboarding MVP — nuevo flujo */}
        <Route path="/onboarding/perfil" element={<OnboardingFounderProfile />} />
        <Route path="/onboarding/idea-source" element={<OnboardingIdeaSource />} />
        <Route path="/onboarding/idea-browser" element={<OnboardingIdeaBrowser />} />
        <Route path="/onboarding/viabilidad" element={<ViabilityAnalysis />} />
        <Route path="/onboarding/plan-14-dias" element={<Plan14Days />} />

        {/* Onboarding legacy — compatibilidad */}
        <Route path="/onboarding/survey" element={<OnboardingSurvey />} />
        <Route path="/onboarding/choose-path" element={<OnboardingChoosePath />} />
        <Route path="/onboarding/choose-idea" element={<OnboardingChooseIdea />} />
        <Route path="/onboarding/describe-idea" element={<OnboardingDescribeIdea />} />
        <Route path="/discovery" element={<Discovery />} />
        <Route path="/discovery/analysis" element={<DiscoveryAnalysis />} />

        {/* Co-Fundador Dashboard */}
        <Route path="/co-fundador" element={<CofundadorDashboard />} />

        <Route path="/" element={
          needsOnboarding
            ? <Navigate to="/onboarding/perfil" replace />
            : <Dashboard user={user} onLogout={handleLogout} />
        }>
          <Route index element={user?.isTrialExpired ? <Paywall user={user} /> : <DashboardHome />} />
          <Route path="chat" element={user?.isTrialExpired ? <Paywall user={user} /> : <Chat />} />
          <Route path="agents" element={user?.isTrialExpired ? <Paywall user={user} /> : <AgentOffice />} />
          <Route path="ideas" element={<Ideas />} />
          <Route path="backlog" element={user?.isTrialExpired ? <Paywall user={user} /> : <Backlog />} />
          <Route path="marketing" element={user?.isTrialExpired ? <Paywall user={user} /> : <Marketing />} />
          <Route path="metrics" element={<Metrics />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/admin" element={user?.is_admin ? <AdminDashboard /> : <Navigate to="/" replace />} />
        <Route path="/company" element={<CompanyDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/live" element={user ? <LiveFeedPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
