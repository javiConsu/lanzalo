import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { apiUrl } from './api.js'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardHome from './pages/DashboardHome'
import Chat from './pages/Chat'
import Ideas from './pages/Ideas'
import Backlog from './pages/Backlog'
import Metrics from './pages/Metrics'
import Discovery from './pages/Discovery'
import DiscoveryAnalysis from './pages/DiscoveryAnalysis'
import OnboardingSurvey from './pages/OnboardingSurvey'
import OnboardingChoosePath from './pages/OnboardingChoosePath'
import OnboardingChooseIdea from './pages/OnboardingChooseIdea'
import OnboardingDescribeIdea from './pages/OnboardingDescribeIdea'
import AdminDashboard from './pages/AdminDashboard'
import Paywall from './components/Paywall'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loginMode, setLoginMode] = useState('register')

  useEffect(() => {
    if (token) {
      // Verificar token válido
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

  // Not authenticated: show landing or login
  if (!token) {
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
        <Route path="/onboarding/survey" element={<OnboardingSurvey />} />
        <Route path="/onboarding/choose-path" element={<OnboardingChoosePath />} />
        <Route path="/onboarding/choose-idea" element={<OnboardingChooseIdea />} />
        <Route path="/onboarding/describe-idea" element={<OnboardingDescribeIdea />} />
        <Route path="/discovery" element={<Discovery />} />
        <Route path="/discovery/analysis" element={<DiscoveryAnalysis />} />
        
        <Route path="/" element={
          needsOnboarding 
            ? <Navigate to="/onboarding/survey" replace /> 
            : <Dashboard user={user} onLogout={handleLogout} />
        }>
          <Route index element={user?.isTrialExpired ? <Paywall user={user} /> : <DashboardHome />} />
          <Route path="chat" element={user?.isTrialExpired ? <Paywall user={user} /> : <Chat />} />
          <Route path="ideas" element={<Ideas />} />
          <Route path="backlog" element={user?.isTrialExpired ? <Paywall user={user} /> : <Backlog />} />
          <Route path="metrics" element={user?.isTrialExpired ? <Paywall user={user} /> : <Metrics />} />
        </Route>

        <Route path="/admin" element={user?.is_admin ? <AdminDashboard /> : <Navigate to="/" replace />} />
        <Route path="*" element={needsOnboarding ? <Navigate to="/onboarding/survey" replace /> : <Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
