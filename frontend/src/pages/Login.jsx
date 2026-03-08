import { apiUrl } from '../api.js'
import { useState } from 'react'

export default function Login({ onLogin, initialMode, onBack }) {
  const [mode, setMode] = useState(initialMode || 'login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [aboutMe, setAboutMe] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/onboarding/register'
      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register'
          ? { email, password, aboutMe, lookingFor }
          : { email, password }
        )
      })

      const data = await res.json()

      if (res.ok && data.token) {
        onLogin(data.token, data.user)
      } else if (data.error === 'Email already registered') {
        setMode('login')
        setError('Ya tienes cuenta. Inicia sesión.')
      } else {
        setError(data.error || 'Error. Intenta de nuevo.')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-white transition-colors mb-4 inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Volver
            </button>
          )}
          <h1 className="text-4xl font-bold text-white mb-2">🚀 Lanzalo</h1>
          <p className="text-gray-400">Tu co-fundador IA autónomo</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'login' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'register' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contraseña (mínimo 8 caracteres)"
              minLength={8}
              required
            />

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Cuéntanos de ti</label>
                  <textarea
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                    placeholder="Ej: Soy diseñador freelance en Barcelona, llevo 3 años queriendo lanzar algo propio..."
                    rows={2}
                    maxLength={500}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">¿Qué buscas en Lánzalo?</label>
                  <textarea
                    value={lookingFor}
                    onChange={(e) => setLookingFor(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                    placeholder="Ej: Quiero validar mi idea rápido sin perder meses programando..."
                    rows={2}
                    maxLength={500}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading
                ? 'Cargando...'
                : mode === 'login' ? 'Entrar' : 'Crear cuenta gratis (14 días)'}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-xs text-gray-500 text-center mt-4">
              14 días gratis • Sin tarjeta • $39/mes después
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
