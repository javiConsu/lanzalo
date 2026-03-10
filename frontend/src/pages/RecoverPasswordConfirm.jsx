/**
 * Recover Password Confirm — Confirmar recuperación de contraseña
 * POST /api/auth/reset-password
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function RecoverPasswordConfirm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [token] = useState(searchParams.get('token'))

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (!token) {
      setMessage('Token de recuperación no encontrado')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/auth-reset-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      })

      const data = await res.json()

      if (data.success) {
        setMessage('Contraseña actualizada correctamente. Redirigiendo...')
        setTimeout(() => {
          navigate('/')
        }, 2000)
      } else {
        setMessage(data.error || 'Error al actualizar contraseña')
      }
    } catch (error) {
      console.error('Error actualizando contraseña:', error)
      setMessage('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Link inválido o expirado
            </h1>
            <p className="text-gray-400 mb-6">
              El link de recuperación no es válido o ha expirado.
            </p>
            <button
              onClick={() => navigate('/recover-password')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25"
            >
              Solicitar nuevo link
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Restablecer contraseña
            </h1>
            <p className="text-gray-400">
              Ingresa tu nueva contraseña
            </p>
          </div>

          {message && (
            <div className={`p-4 rounded-xl mb-6 ${
              message.includes('actualizada')
                ? 'bg-green-900/30 border border-green-500/30 text-green-300'
                : 'bg-red-900/30 border border-red-500/30 text-red-300'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Actualizando...' : 'Restablecer contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
