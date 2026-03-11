/**
 * Onboarding Paso 1/6: Perfil del Founder
 * 3 preguntas en secuencia: motivación, tiempo disponible, experiencia
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import api from '../lib/api';

function ProgressBar({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`h-1 rounded-full transition-all duration-300 ${i < step ? 'bg-[#00ff87] w-8' : 'bg-[#21262d] w-6'}`} />
          {i < total - 1 && <div className="w-1.5 h-1.5 rounded-full bg-[#21262d]" />}
        </div>
      ))}
      <span className="text-xs font-mono text-[#484f58] ml-2">{step}/{total}</span>
    </div>
  );
}

const QUESTIONS = [
  {
    id: 'motivation',
    title: '¿Por qué quieres lanzar algo?',
    options: [
      { value: 'extra_income', label: 'Generar ingresos extra', detail: 'Side project, sin dejar el trabajo' },
      { value: 'replace_job', label: 'Reemplazar mi trabajo actual', detail: 'Quiero vivir de esto' },
      { value: 'impact', label: 'Resolver un problema que me importa', detail: 'El impacto es lo primero' },
      { value: 'learning', label: 'Aprender y experimentar', detail: 'El proceso es el objetivo' },
      { value: 'startup', label: 'Construir algo grande', detail: 'Startup, levantar capital, escalar' },
    ]
  },
  {
    id: 'timeAvailable',
    title: '¿Cuántas horas por semana puedes dedicarle?',
    options: [
      { value: 'lt5', label: 'Menos de 5 horas', detail: 'Muy limitado, necesito algo automatizado' },
      { value: '5_15', label: '5 - 15 horas', detail: 'Comprometido pero con otras obligaciones' },
      { value: '15_30', label: '15 - 30 horas', detail: 'Esto es una prioridad real' },
      { value: 'gt30', label: '30+ horas', detail: 'All-in, enfocado al 100%' },
    ]
  },
  {
    id: 'experience',
    title: '¿Cuál es tu experiencia lanzando productos?',
    options: [
      { value: 'first_time', label: 'Primera vez', detail: 'No he lanzado nada antes' },
      { value: 'tried', label: 'He intentado algo', detail: 'No llegué a facturar' },
      { value: 'some_revenue', label: 'He facturado algo', detail: 'Cientos o miles de euros' },
      { value: 'experienced', label: 'Founder con experiencia', detail: 'Ventas, ARR, clientes reales' },
    ]
  }
];

export default function OnboardingFounderProfile() {
  const navigate = useNavigate();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({ motivation: null, timeAvailable: null, experience: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const currentQuestion = QUESTIONS[questionIndex];
  const currentAnswer = answers[currentQuestion.id];

  function selectOption(value) {
    const updated = { ...answers, [currentQuestion.id]: value };
    setAnswers(updated);

    // Auto-avanzar tras seleccionar
    if (questionIndex < QUESTIONS.length - 1) {
      setTimeout(() => setQuestionIndex(questionIndex + 1), 250);
    }
  }

  async function handleFinish() {
    if (!answers.motivation || !answers.timeAvailable || !answers.experience) return;

    setSaving(true);
    setError(null);

    try {
      await api.post('/api/onboarding/founder-profile', answers);
      navigate('/onboarding/idea-source');
    } catch (err) {
      console.error('Error saving founder profile:', err);
      setError('Error guardando tu perfil. Intenta de nuevo.');
      setSaving(false);
    }
  }

  const isLastQuestion = questionIndex === QUESTIONS.length - 1;
  const allAnswered = answers.motivation && answers.timeAvailable && answers.experience;

  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">

        <ProgressBar step={1} total={6} />

        {/* Back button (solo si no es la primera pregunta) */}
        {questionIndex > 0 && (
          <button
            onClick={() => setQuestionIndex(questionIndex - 1)}
            className="flex items-center gap-2 text-[#484f58] hover:text-[#8b949e] mb-8 transition-colors text-sm font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-3">
            paso 1 de 6 · pregunta {questionIndex + 1} de {QUESTIONS.length}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {currentQuestion.title}
          </h1>
        </div>

        {/* Opciones */}
        <div className="space-y-3 mb-8">
          {currentQuestion.options.map((option) => {
            const selected = answers[currentQuestion.id] === option.value;
            return (
              <button
                key={option.value}
                onClick={() => selectOption(option.value)}
                className={`w-full text-left bg-[#0d1117] border rounded-xl p-4 transition-all group ${
                  selected
                    ? 'border-[#00ff87] bg-[#00ff87]/5'
                    : 'border-[#21262d] hover:border-[#30363d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold text-sm mb-0.5 ${selected ? 'text-[#00ff87]' : 'text-white'}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-[#8b949e]">{option.detail}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-4 transition-all ${
                    selected ? 'border-[#00ff87] bg-[#00ff87]' : 'border-[#30363d]'
                  }`}>
                    {selected && (
                      <div className="w-full h-full rounded-full bg-black scale-50 transform" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < questionIndex ? 'w-6 bg-[#00ff87]' :
                i === questionIndex ? 'w-4 bg-[#00ff87]/50' :
                'w-3 bg-[#21262d]'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm font-mono">{error}</p>
          </div>
        )}

        {/* Botón continuar — solo en la última pregunta o si ya respondió la actual */}
        {isLastQuestion && currentAnswer && (
          <button
            onClick={handleFinish}
            disabled={!allAnswered || saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-4
                     bg-[#00ff87] hover:bg-[#00e67a] text-black font-bold rounded-lg
                     transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                     font-mono text-sm"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : (
              <>Continuar <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        )}

        {/* Indicador de navegación si no es la última pregunta */}
        {!isLastQuestion && (
          <p className="text-center text-[#484f58] text-xs font-mono">
            Selecciona una opción para continuar
          </p>
        )}
      </div>
    </div>
  );
}
