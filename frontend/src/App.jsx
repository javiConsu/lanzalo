import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Ideas from './pages/Ideas'
import Backlog from './pages/Backlog'
import Metrics from './pages/Metrics'
import Discovery from './pages/Discovery'
import DiscoveryAnalysis from './pages/DiscoveryAnalysis'
import OnboardingSurvey from './pages/OnboardingSurvey'
import OnboardingChoosePath from './pages/OnboardingChoosePath'
import OnboardingChooseIdea from './pages/OnboardingChooseIdea'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (token) {
      // Verificar token válido
      import { apiUrl } from '../api.js'
      fetch(apiUrl('/api/user/profile', {
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
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Router>
      <Routes>
        <Route path="/onboarding/survey" element={<OnboardingSurvey />} />
        <Route path="/onboarding/choose-path" element={<OnboardingChoosePath />} />
        <Route path="/onboarding/choose-idea" element={<OnboardingChooseIdea />} />
        <Route path="/discovery" element={<Discovery />} />
        <Route path="/discovery/analysis" element={<DiscoveryAnalysis />} />
        
        <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />}>
          <Route index element={<Chat />} />
          <Route path="chat" element={<Chat />} />
          <Route path="ideas" element={<Ideas />} />
          <Route path="backlog" element={<Backlog />} />
          <Route path="metrics" element={<Metrics />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
