/**
 * Recover Password — Solicitar recuperación de contraseña
 * POST /api/auth/reset-password-request
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function RecoverPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/auth-reset-password/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (data.success) {
        setMessage('Si el email existe, recibirás un link de recuperación en breve')
        setEmail('')
        setTimeout(() => {
          navigate('/')
        }, 5000)
      } else {
        setMessage(data.error || 'Error al enviar link de recuperación')
      }
    } catch (error) {
      console.error('Error enviando email:', error)
      setMessage('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <span className="text-3xl">🔑</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="text-gray-400">
              Ingresa tu email y recibirás un link para restablecer tu contraseña
            </p>
          </div>

          {message && (
            <div className={`p-4 rounded-xl mb-6 ${
              message.includes('recibirás')
                ? 'bg-green-900/30 border border-green-500/30 text-green-300'
                : 'bg-red-900/30 border border-red-500/30 text-red-300'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Volver a iniciar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
