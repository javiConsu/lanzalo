/**
 * NpsModal — Encuesta NPS post-onboarding
 * Trigger: 7 días desde registro o al completar el plan 14 días
 * Solo se muestra 1 vez por usuario
 */
import { useState } from 'react'
import { apiUrl } from '../api.js'

export default function NpsModal({ token, onClose }) {
  const [score, setScore] = useState(null)
  const [comment, setComment] = useState('')
  const [step, setStep] = useState(1) // 1=score, 2=comment (si score<8), 3=thanks
  const [loading, setLoading] = useState(false)

  const handleScore = (val) => {
    setScore(val)
    if (val >= 8) {
      submitNps(val, '')
    } else {
      setStep(2)
    }
  }

  const handleSubmitComment = (e) => {
    e.preventDefault()
    submitNps(score, comment)
  }

  const submitNps = async (val, text) => {
    setLoading(true)
    try {
      await fetch(apiUrl('/api/surveys/nps'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ score: val, comment: text }),
      })
    } catch {
      // silencioso
    } finally {
      setLoading(false)
      setStep(3)
      setTimeout(onClose, 2500)
    }
  }

  const scoreLabel = (val) => {
    if (val <= 3) return 'Muy improbable'
    if (val <= 6) return 'Poco probable'
    if (val <= 8) return 'Probable'
    return 'Muy probable'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">

        {step === 3 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-medium">¡Gracias por tu opinión!</p>
            <p className="text-gray-400 text-sm mt-1">Tu feedback nos ayuda a mejorar</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold text-base">Una pregunta rápida</h3>
                <p className="text-gray-500 text-xs mt-0.5">Solo te pedimos esto una vez</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {step === 1 && (
              <>
                <p className="text-gray-200 text-sm mb-5">
                  ¿Del 0 al 10, qué probabilidad hay de que recomiendes Lanzalo a un amigo o colega?
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      onClick={() => handleScore(n)}
                      disabled={loading}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                        score === n
                          ? 'bg-emerald-500 text-gray-950'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-600 px-1">
                  <span>Muy improbable</span>
                  <span>Muy probable</span>
                </div>
                {score !== null && (
                  <p className="text-center text-emerald-400 text-xs mt-2">{scoreLabel(score)}</p>
                )}
              </>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <p className="text-gray-200 text-sm">
                  ¿Qué deberíamos mejorar para que tu puntuación fuera más alta?
                </p>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="Cuéntanos qué echas en falta o qué mejorarías..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder-gray-600 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => submitNps(score, '')}
                    disabled={loading}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    Saltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-gray-950 text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
