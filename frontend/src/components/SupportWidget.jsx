/**
 * SupportWidget — Botón flotante de soporte en el dashboard
 * Permite a los usuarios reportar bugs, dar feedback o hacer preguntas
 * Los tickets van directamente al email del equipo CS
 */
import { useState } from 'react'
import { apiUrl } from '../api.js'

const CATEGORIES = [
  { value: 'login', label: 'Acceso / contraseña' },
  { value: 'payment', label: 'Pagos / suscripción' },
  { value: 'task', label: 'Tareas / agentes' },
  { value: 'content', label: 'Contenido generado' },
  { value: 'other', label: 'Otro' },
]

export default function SupportWidget({ token }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('bug')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || message.trim().length < 10) {
      setError('Describe el problema con al menos 10 caracteres')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/support/ticket'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          category,
          message: message.trim(),
          url: window.location.href,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSent(true)
        setMessage('')
        setCategory('')
        setType('bug')
        setTimeout(() => {
          setSent(false)
          setOpen(false)
        }, 3000)
      } else {
        setError(data.error || 'Error al enviar. Intenta de nuevo.')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setError('')
    setSent(false)
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg transition-all hover:shadow-emerald-500/10"
        title="Contactar soporte"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span className="hidden sm:inline">Soporte</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold text-base">Contactar soporte</h3>
                <p className="text-gray-500 text-xs mt-0.5">Nuestro equipo responde en menos de 24h</p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {sent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-medium">Incidencia registrada</p>
                <p className="text-gray-400 text-sm mt-1">Te contactaremos en breve</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Tipo de incidencia</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'bug', label: 'Algo no funciona' },
                      { value: 'question', label: 'Tengo una duda' },
                      { value: 'feedback', label: 'Sugerencia' },
                      { value: 'other', label: 'Otro' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                          type === opt.value
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categoría */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Área afectada (opcional)</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  >
                    <option value="">Seleccionar...</option>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Mensaje */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">
                    Describe el problema
                    <span className="text-gray-600 ml-1">(mínimo 10 caracteres)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Ej: Al hacer clic en 'Cambiar contraseña' aparece un error rojo..."
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder-gray-600 resize-none"
                    required
                    minLength={10}
                  />
                  <div className="text-right text-xs text-gray-600 mt-1">{message.length} caracteres</div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-xs px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || message.trim().length < 10}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-gray-950 font-semibold text-sm py-2.5 rounded-lg transition-colors"
                >
                  {loading ? 'Enviando...' : 'Enviar incidencia'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
