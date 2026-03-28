import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, Component } from 'react'
import { useAuth, useClerk } from '@clerk/clerk-react'
import { apiUrl } from './api.js'
import PostHogProvider from './components/PostHogProvider'
import SupportWidget from './components/SupportWidget'
import NpsModal from './components/NpsModal'
import { ToastProvider } from './components/Toast'
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
import OnboardingTeamTemplate from './pages/OnboardingTeamTemplate'
import ViabilityAnalysis from './pages/ViabilityAnalysis'
import Plan14Days from './pages/Plan14Days'
import CofundadorDashboard from './pages/CofundadorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import CompanyDashboard from './pages/CompanyDashboard'
import Paywall from './components/Paywall'
import BusinessHub from './pages/BusinessHub'
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
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { signOut } = useClerk()

  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [loginMode, setLoginMode] = useState('register')
  const [showNps, setShowNps] = useState(false)

  // NPS check
  useEffect(() => {
    if (!token || !user) return
    fetch(apiUrl('/api/surveys/nps/check'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.show) setShowNps(true) })
      .catch(() => {})
  }, [token, user?.id])

  // Sincronizar con Clerk y cargar perfil de nuestra DB
  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      setToken(null)
      setUser(null)
      setLoading(false)
      return
    }

    const loadUser = async () => {
      setLoading(true)
      try {
        const clerkToken = await getToken()
        setToken(clerkToken)
        localStorage.setItem('token', clerkToken)

        // Sincronizar usuario con nuestra DB (crea si no existe, vincula clerk_user_id si ya existe)
        const syncRes = await fetch(apiUrl('/api/auth/sync'), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${clerkToken}` }
        })
        if (!syncRes.ok) {
          const syncErr = await syncRes.json().catch(() => ({}))
          console.error('[App] auth/sync failed', syncRes.status, syncErr)
          // No bloqueamos al usuario, pero logueamos para diagnóstico
        }

        // Cargar perfil completo de nuestra DB
        const profileRes = await fetch(apiUrl('/api/user/profile'), {
          headers: { 'Authorization': `Bearer ${clerkToken}` }
        })

        if (profileRes.ok) {
          const data = await profileRes.json()
          const u = data.user || data
          setUser(u)
          if (u?.id) {
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
          }
        }
      } catch (err) {
        console.error('[App] Error cargando usuario:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    // Refrescar token de Clerk cada 55 minutos (expira en 60)
    const interval = setInterval(async () => {
      try {
        const fresh = await getToken({ skipCache: true })
        setToken(fresh)
        localStorage.setItem('token', fresh)
      } catch (e) {}
    }, 55 * 60 * 1000)

    return () => clearInterval(interval)
  }, [isLoaded, isSignedIn])

  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem('token')
    localStorage.removeItem('lanzalo_user_id')
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

  if (!isLoaded || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9d1d9', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <div>Cargando...</div>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('ref')) {
      localStorage.setItem('pendingRef', urlParams.get('ref'))
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

    // Rutas protegidas: mostrar login
    const protectedPaths = ['/dashboard', '/onboarding', '/cofundador', '/chat', '/live', '/metrics']
    if (protectedPaths.some(p => window.location.pathname.startsWith(p))) {
      if (!showLogin) {
        setLoginMode('login')
        setShowLogin(true)
      }
    }


    if (showLogin) {
      return (
        <Login
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
      <ToastProvider>
        <Router>
          <PostHogProvider>
          <Routes>
            <Route path="/onboarding" element={<Navigate to="/onboarding/describe-idea" replace />} />
            <Route path="/onboarding/choose-path" element={<OnboardingChoosePath user={user} token={token} />} />
            <Route path="/onboarding/choose-idea" element={<OnboardingChooseIdea user={user} token={token} />} />
            <Route path="/onboarding/describe-idea" element={<OnboardingDescribeIdea user={user} token={token} />} />
            <Route path="/onboarding/founder-profile" element={<OnboardingFounderProfile user={user} token={token} />} />
            <Route path="/onboarding/idea-source" element={<OnboardingIdeaSource user={user} token={token} />} />
            <Route path="/onboarding/idea-browser" element={<OnboardingIdeaBrowser user={user} token={token} />} />
            <Route path="/onboarding/team-template" element={<OnboardingTeamTemplate user={user} token={token} />} />
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
          <SupportWidget token={token} />
          {showNps && <NpsModal token={token} onClose={() => setShowNps(false)} />}
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
