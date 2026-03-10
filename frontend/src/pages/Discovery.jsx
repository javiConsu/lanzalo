/**
 * Strategic Discovery Page
 * 28-question deep analysis before building anything
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ArrowLeft, Loader2, TrendingUp, Target, DollarSign } from 'lucide-react';
import { apiUrl } from '../api.js';

const CATEGORIES = [
  {
    key: 'skills_advantages',
    title: 'Skills & Unfair Advantages',
    description: 'Lo que te hace único',
    icon: '🎯'
  },
  {
    key: 'network_distribution',
    title: 'Network & Distribution',
    description: 'A quién conoces y dónde tienes acceso',
    icon: '🌐'
  },
  {
    key: 'resources_constraints',
    title: 'Resources & Constraints',
    description: 'Tiempo, dinero, runway',
    icon: '⚡'
  },
  {
    key: 'past_experience',
    title: 'Past Experience',
    description: 'Fracasos, éxitos, lecciones',
    icon: '📚'
  },
  {
    key: 'goals_context',
    title: 'Goals & Context',
    description: 'Qué quieres lograr',
    icon: '🎯'
  }
];

export default function Discovery() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState(0);
  const [responses, setResponses] = useState({});
  const [allQuestions, setAllQuestions] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQuestions();
    checkStatus();
  }, []);

  async function loadQuestions() {
    try {
      const data = await api.get('/api/discovery/questions');
      setAllQuestions(data.questions);
      setLoading(false);
    } catch (err) {
      setError('Error cargando preguntas');
      setLoading(false);
    }
  }

  async function checkStatus() {
    try {
      const status = await api.get('/api/discovery/status');
      if (status.completed) {
        // Already completed, redirect to analysis
        navigate('/discovery/analysis');
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  }

  const currentQuestions = allQuestions.filter(
    q => q.category === CATEGORIES[currentCategory].key
  );

  const totalQuestions = allQuestions.length;
  const answeredQuestions = Object.keys(responses).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  const canGoNext = currentQuestions.every(q => responses[q.id]);
  const canSubmit = currentCategory === CATEGORIES.length - 1 && canGoNext;

  function handleChange(questionId, value) {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  }

  function goNext() {
    if (canGoNext) {
      if (canSubmit) {
        submitDiscovery();
      } else {
        setCurrentCategory(prev => prev + 1);
      }
    }
  }

  function goBack() {
    setCurrentCategory(prev => Math.max(0, prev - 1));
  }

  async function submitDiscovery() {
    setAnalyzing(true);
    setError(null);

    try {
      const result = await api.post('/api/discovery/submit', { responses });
      
      // Save analysis to local state or context
      sessionStorage.setItem('discoveryAnalysis', JSON.stringify(result.analysis));
      
      // Redirect to analysis page
      navigate('/discovery/analysis');
    } catch (err) {
      setError('Error analizando respuestas. Intenta de nuevo.');
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Analizando tu perfil...
          </h2>
          <p className="text-gray-400 mb-8">
            Estoy procesando tus respuestas con IA para identificar:
          </p>
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3 text-gray-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Tus unfair advantages</span>
            </div>
            <div className="flex items-start gap-3 text-gray-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Constraints y cómo mitigarlos</span>
            </div>
            <div className="flex items-start gap-3 text-gray-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>3-5 caminos ranked por probabilidad</span>
            </div>
            <div className="flex items-start gap-3 text-gray-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>90-day plan personalizado</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-8">
            Esto toma 60-90 segundos...
          </p>
        </div>
      </div>
    );
  }

  const category = CATEGORIES[currentCategory];

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Strategic Discovery
          </h1>
          <p className="text-gray-400">
            Antes de construir, necesito conocerte. 28 preguntas estratégicas.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">
              Pregunta {answeredQuestions} de {totalQuestions}
            </span>
            <span className="text-sm text-gray-400">
              {Math.round(progress)}% completo
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat.key}
              onClick={() => setCurrentCategory(idx)}
              disabled={idx > currentCategory}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap
                transition-colors flex-shrink-0
                ${idx === currentCategory 
                  ? 'bg-blue-600 text-white' 
                  : idx < currentCategory
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.title.split(' & ')[0]}</span>
              {idx < currentCategory && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
            </button>
          ))}
        </div>

        {/* Current Category */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-6">
            <span className="text-3xl">{category.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                {category.title}
              </h2>
              <p className="text-gray-400 text-sm">
                {category.description}
              </p>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {currentQuestions.map((question, idx) => (
              <div key={question.id}>
                <label className="block text-white font-medium mb-2">
                  {idx + 1}. {question.text}
                </label>

                {question.type === 'textarea' && (
                  <textarea
                    value={responses[question.id] || ''}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    placeholder={question.placeholder}
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3
                             text-white placeholder-gray-500 focus:border-blue-500 
                             focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                )}

                {question.type === 'text' && (
                  <input
                    type="text"
                    value={responses[question.id] || ''}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    placeholder={question.placeholder}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3
                             text-white placeholder-gray-500 focus:border-blue-500 
                             focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                )}

                {question.type === 'select' && (
                  <select
                    value={responses[question.id] || ''}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3
                             text-white focus:border-blue-500 focus:ring-1 
                             focus:ring-blue-500 outline-none"
                  >
                    <option value="">Selecciona...</option>
                    {question.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={goBack}
            disabled={currentCategory === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transition-colors
              ${currentCategory === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-800 text-white hover:bg-gray-700'
              }
            `}
          >
            <ArrowLeft className="w-5 h-5" />
            Atrás
          </button>

          <button
            onClick={goNext}
            disabled={!canGoNext}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transition-colors
              ${!canGoNext
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : canSubmit
                  ? 'bg-green-600 text-white hover:bg-green-500'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }
            `}
          >
            {canSubmit ? 'Analizar' : 'Siguiente'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Help Text */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Tus respuestas son privadas y se usan solo para análisis estratégico.
          </p>
          <p className="mt-1">
            Toma 15-20 minutos. Vale la pena.
          </p>
        </div>
      </div>
    </div>
  );
}
