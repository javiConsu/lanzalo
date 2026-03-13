/**
 * ActivationSurvey
 * Modal no-bloqueante que aparece 5s después del evento venture_launched.
 * 2 preguntas: frenos previos (multiple choice) + objetivo 14 días (texto libre).
 * Guarda respuestas en PostHog (survey_responded) y en BD local.
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { captureEvent } from '../../lib/posthog';
import { apiUrl } from '../../api';

const SURVEY_KEY = 'lanzalo_activation_survey_done';
const TRIGGER_KEY = 'lanzalo_show_activation_survey';
const DELAY_MS = 5000;

const Q1_OPTIONS = [
  { value: 'no_tiempo',    label: 'No tenía tiempo' },
  { value: 'no_sabia',     label: 'No sabía por dónde empezar' },
  { value: 'faltaba_equipo', label: 'Me faltaba equipo técnico' },
  { value: 'no_viable',    label: 'No estaba seguro si era viable' },
  { value: 'otro',         label: 'Otro' },
];

export default function ActivationSurvey() {
  const [visible, setVisible] = useState(false);
  const [q1, setQ1] = useState('');
  const [q1Other, setQ1Other] = useState('');
  const [q2, setQ2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // No mostrar si ya respondió
    if (localStorage.getItem(SURVEY_KEY)) return;
    // No mostrar si no fue triggereado por venture_launched
    if (!localStorage.getItem(TRIGGER_KEY)) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.removeItem(TRIGGER_KEY);
  };

  const handleSubmit = async () => {
    if (!q1) return;
    setSubmitting(true);

    const payload = {
      q1,
      q1_other: q1 === 'otro' ? q1Other : undefined,
      q2: q2.trim() || undefined,
    };

    // Capturar en PostHog
    captureEvent('survey_responded', {
      survey_type: 'activation',
      q1: payload.q1,
      q1_other: payload.q1_other,
      q2: payload.q2,
    });

    // Guardar en BD
    try {
      const token = localStorage.getItem('lanzalo_token');
      await fetch(apiUrl('/api/surveys/activation'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[ActivationSurvey] Error guardando:', err);
    }

    // Marcar como completado
    localStorage.setItem(SURVEY_KEY, '1');
    localStorage.removeItem(TRIGGER_KEY);
    setDone(true);

    setTimeout(() => setVisible(false), 1500);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] bg-[#161b22] border border-[#21262d] rounded-xl shadow-2xl p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-mono text-[#00ff87] mb-0.5">QUICK SURVEY</div>
          <div className="text-sm font-semibold text-white leading-tight">
            2 preguntas rápidas 👋
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#484f58] hover:text-white transition-colors flex-shrink-0 ml-2"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {done ? (
        <div className="text-center py-3">
          <div className="text-[#00ff87] font-mono text-sm">¡Gracias! 🚀</div>
          <div className="text-[#8b949e] text-xs mt-1">Esto nos ayuda a mejorar Lanzalo</div>
        </div>
      ) : (
        <>
          {/* Pregunta 1 */}
          <div className="mb-4">
            <p className="text-xs text-[#8b949e] mb-2 leading-tight">
              ¿Qué te frenó antes de intentar lanzar tu idea?
            </p>
            <div className="space-y-1.5">
              {Q1_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setQ1(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                    q1 === opt.value
                      ? 'bg-[#00ff87]/15 border border-[#00ff87]/50 text-[#00ff87]'
                      : 'bg-[#0d1117] border border-[#21262d] text-[#8b949e] hover:border-[#30363d] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {q1 === 'otro' && (
              <input
                type="text"
                value={q1Other}
                onChange={e => setQ1Other(e.target.value)}
                placeholder="¿Cuál?"
                className="mt-2 w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-xs text-white placeholder-[#484f58] focus:border-[#00ff87]/50 focus:outline-none"
              />
            )}
          </div>

          {/* Pregunta 2 */}
          <div className="mb-4">
            <p className="text-xs text-[#8b949e] mb-2 leading-tight">
              ¿Qué quieres haber conseguido con Lanzalo en los próximos 14 días?
            </p>
            <textarea
              value={q2}
              onChange={e => setQ2(e.target.value)}
              placeholder="Ej: mis primeras 5 ventas, validar si mi idea tiene mercado..."
              rows={2}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-xs text-white placeholder-[#484f58] focus:border-[#00ff87]/50 focus:outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!q1 || submitting}
            className="w-full py-2 bg-[#00ff87] hover:bg-[#00e67a] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs font-mono rounded-lg transition-colors"
          >
            {submitting ? 'Enviando...' : 'Enviar respuestas'}
          </button>
        </>
      )}
    </div>
  );
}
