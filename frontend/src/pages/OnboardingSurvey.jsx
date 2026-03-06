/**
 * Onboarding Survey (Optional)
 * Reward: 3 top validated ideas
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Gift, Loader2 } from 'lucide-react';
import api from '../lib/api';

const SURVEY_QUESTIONS = [
  {
    id: 'experience_level',
    question: '¿Cuál es tu nivel de experiencia como founder?',
    options: [
      { value: 'first_time', label: 'Primera vez' },
      { value: 'launched_before', label: 'He lanzado proyectos antes' },
      { value: 'experienced', label: 'Founder experimentado (2+ exits)' }
    ]
  },
  {
    id: 'primary_motivation',
    question: '¿Qué te motiva más?',
    options: [
      { value: 'freedom', label: 'Libertad financiera' },
      { value: 'impact', label: 'Impacto/cambiar industria' },
      { value: 'learning', label: 'Aprender y construir' },
      { value: 'scale', label: 'Construir empresa grande' }
    ]
  },
  {
    id: 'timeline',
    question: '¿Cuándo quieres ver resultados?',
    options: [
      { value: '3_months', label: '3 meses (necesito revenue rápido)' },
      { value: '6_months', label: '6 meses' },
      { value: '12_months', label: '12 meses' },
      { value: 'long_term', label: '2+ años (juego largo)' }
    ]
  },
  {
    id: 'biggest_challenge',
    question: '¿Cuál es tu mayor reto ahora?',
    options: [
      { value: 'ideas', label: 'Encontrar buenas ideas' },
      { value: 'validation', label: 'Validar si idea funciona' },
      { value: 'building', label: 'Construir el producto' },
      { value: 'marketing', label: 'Marketing y distribución' },
      { value: 'time', label: 'Falta de tiempo' }
    ]
  },
  {
    id: 'preferred_model',
    question: '¿Qué modelo de negocio te atrae?',
    options: [
      { value: 'saas', label: 'SaaS (subscripciones)' },
      { value: 'marketplace', label: 'Marketplace' },
      { value: 'ecommerce', label: 'E-commerce' },
      { value: 'service', label: 'Servicio/Agencia' },
      { value: 'content', label: 'Content/Educación' },
      { value: 'open', label: 'Lo que tenga mejor probabilidad' }
    ]
  },
  {
    id: 'found_via',
    question: '¿Cómo encontraste Lanzalo?',
    options: [
      { value: 'twitter', label: 'Twitter' },
      { value: 'reddit', label: 'Reddit' },
      { value: 'product_hunt', label: 'Product Hunt' },
      { value: 'friend', label: 'Recomendación' },
      { value: 'search', label: 'Búsqueda Google' },
      { value: 'other', label: 'Otro' }
    ]
  }
];

export default function OnboardingSurvey() {
  const navigate = useNavigate();
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const allAnswered = SURVEY_QUESTIONS.every(q => responses[q.id]);
  const progress = (Object.keys(responses).length / SURVEY_QUESTIONS.length) * 100;

  function handleChange(questionId, value) {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  }

  async function handleSubmit() {
    if (!allAnswered) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/api/onboarding/survey', { responses });
      
      // Redirect to next step (describe idea or choose idea)
      navigate('/onboarding/choose-path');
    } catch (err) {
      setError('Error guardando respuestas. Intenta de nuevo.');
      setSubmitting(false);
    }
  }

  function handleSkip() {
    navigate('/onboarding/choose-path');
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Cuéntanos sobre ti
          </h1>
          <p className="text-gray-400">
            Opcional pero recomendado — te regalamos 3 ideas validadas 🎁
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">
              {Object.keys(responses).length} de {SURVEY_QUESTIONS.length} respondidas
            </span>
            <span className="text-sm text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Reward Box */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 
                      border border-blue-500/50 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <Gift className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-white mb-2">
                Reward por completar
              </h3>
              <p className="text-gray-300 text-sm">
                Completa estas 6 preguntas y te regalamos acceso a las{' '}
                <strong className="text-blue-400">3 mejores ideas validadas</strong>{' '}
                de nuestro marketplace (score 80+)
              </p>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6 mb-8">
          {SURVEY_QUESTIONS.map((q, idx) => (
            <div key={q.id} className="bg-gray-800 rounded-lg p-6">
              <label className="block text-white font-medium mb-4">
                {idx + 1}. {q.question}
              </label>
              
              <div className="space-y-2">
                {q.options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleChange(q.id, opt.value)}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg border-2
                      transition-all
                      ${responses[q.id] === opt.value
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Saltar (sin reward)
          </button>

          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-lg font-medium
              transition-colors
              ${!allAnswered || submitting
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
              }
            `}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Tus respuestas son privadas y se usan solo para personalización.</p>
        </div>
      </div>
    </div>
  );
}
