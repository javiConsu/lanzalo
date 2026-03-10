/**
 * Discovery Analysis Results
 * Shows strategic analysis with unfair advantages, paths ranked, 90-day plan
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Target, AlertTriangle, Eye, DollarSign, 
  Clock, BarChart3, ArrowRight, CheckCircle2, XCircle, Loader2 
} from 'lucide-react';
import { apiUrl } from '../api.js';

export default function DiscoveryAnalysis() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalysis();
  }, []);

  async function loadAnalysis() {
    try {
      // Try session storage first (just submitted)
      const cached = sessionStorage.getItem('discoveryAnalysis');
      if (cached) {
        setAnalysis(JSON.parse(cached));
        setLoading(false);
        return;
      }

      // Otherwise fetch from API
      const data = await api.get('/api/discovery/analysis');
      setAnalysis(data.analysis);
      setLoading(false);
    } catch (err) {
      setError('No se encontró análisis. Completa el discovery primero.');
      setLoading(false);
    }
  }

  async function selectPath(path) {
    try {
      await api.post('/api/discovery/select-path', { pathName: path.name });
      setSelectedPath(path);
      
      // Wait 2s then redirect to onboarding with selected path
      setTimeout(() => {
        navigate('/onboarding/create-company', { 
          state: { fromDiscovery: true, selectedPath: path } 
        });
      }, 2000);
    } catch (err) {
      setError('Error seleccionando path');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{error}</h2>
          <button
            onClick={() => navigate('/discovery')}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            Completar Discovery
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const rankedPaths = [...analysis.paths].sort((a, b) => b.rankingScore - a.rankingScore);
  const topPath = rankedPaths[0];

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Tu Análisis Estratégico
          </h1>
          <p className="text-gray-400">
            Basado en tus respuestas, aquí está tu roadmap personalizado
          </p>
        </div>

        {/* Unfair Advantages */}
        <section className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-bold text-white">
              Tus Unfair Advantages
            </h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Lo que te hace 10x vs otros
          </p>
          <div className="space-y-4">
            {analysis.unfairAdvantages.map((adv, idx) => (
              <div key={idx} className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">
                  {idx + 1}. {adv.advantage}
                </h3>
                <p className="text-gray-400 text-sm mb-2">
                  <strong className="text-gray-300">Por qué es leverage:</strong> {adv.leverage}
                </p>
                <p className="text-gray-400 text-sm">
                  <strong className="text-gray-300">Cómo usarlo:</strong> {adv.examples.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Constraints */}
        <section className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold text-white">
              Constraints (lo que te limita)
            </h2>
          </div>
          <div className="space-y-3">
            {analysis.constraints.map((con, idx) => {
              const color = con.severity === 'critical' ? 'red' :
                           con.severity === 'high' ? 'yellow' : 'green';
              return (
                <div key={idx} className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 bg-${color}-500 flex-shrink-0`} />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">
                        {con.constraint}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        <strong className="text-gray-300">Cómo mitigar:</strong> {con.mitigation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Blind Spots */}
        {analysis.blindSpots && analysis.blindSpots.length > 0 && (
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-bold text-white">
                Blind Spots (lo que no ves)
              </h2>
            </div>
            <div className="space-y-3">
              {analysis.blindSpots.map((bs, idx) => (
                <div key={idx} className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-1">
                    {idx + 1}. {bs.blindSpot}
                  </h3>
                  <p className="text-gray-400 text-sm mb-1">
                    <strong className="text-gray-300">Riesgo:</strong> {bs.risk}
                  </p>
                  <p className="text-gray-400 text-sm">
                    <strong className="text-gray-300">Qué hacer:</strong> {bs.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ranked Paths */}
        <section className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white">
              {rankedPaths.length} Caminos Ranked
            </h2>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            Ordenados por: (probabilidad × 0.6) + (velocidad × 0.4)
          </p>
          
          <div className="space-y-4">
            {rankedPaths.map((path, idx) => (
              <div 
                key={idx}
                className={`
                  bg-gray-900 rounded-lg p-6 border-2 transition-all
                  ${idx === 0 
                    ? 'border-green-500 shadow-lg shadow-green-500/20' 
                    : 'border-gray-700'
                  }
                  ${selectedPath?.name === path.name
                    ? 'ring-2 ring-blue-500'
                    : ''
                  }
                `}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">
                        Path {idx + 1}: {path.name}
                      </h3>
                      {idx === 0 && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 
                                       text-xs font-semibold rounded-full">
                          RECOMENDADO
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-3">
                      {path.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-2xl font-bold text-white">
                      {Math.round(path.rankingScore)}
                    </div>
                    <div className="text-xs text-gray-500">Score</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Probabilidad</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500"
                          style={{ width: `${path.probabilityScore}%` }}
                        />
                      </div>
                      <span className="text-sm text-white font-medium">
                        {path.probabilityScore}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Velocidad</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500"
                          style={{ width: `${path.speedScore}%` }}
                        />
                      </div>
                      <span className="text-sm text-white font-medium">
                        {path.speedScore}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Revenue model:</span>
                    <span className="text-white ml-2">{path.revenueModel}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Speed to revenue:</span>
                    <span className="text-white ml-2">{path.speedToRevenue}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Target 12 meses:</span>
                    <span className="text-white ml-2">{path.targetRevenue12mo}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Ceiling:</span>
                    <span className="text-white ml-2">{path.ceilingRevenue}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-300 mb-2">
                    Por qué match:
                  </div>
                  <p className="text-sm text-gray-400">{path.whyMatch}</p>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-300 mb-2">
                    Primeras 3 acciones:
                  </div>
                  <ol className="space-y-1 text-sm text-gray-400">
                    {path.firstThreeActions.map((action, i) => (
                      <li key={i}>{i + 1}. {action}</li>
                    ))}
                  </ol>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-300 mb-1">
                    Biggest risk:
                  </div>
                  <p className="text-sm text-yellow-400">{path.biggestRisk}</p>
                </div>

                <button
                  onClick={() => selectPath(path)}
                  disabled={selectedPath !== null}
                  className={`
                    w-full flex items-center justify-center gap-2 px-6 py-3 
                    rounded-lg font-medium transition-colors
                    ${selectedPath?.name === path.name
                      ? 'bg-green-600 text-white'
                      : selectedPath
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : idx === 0
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                    }
                  `}
                >
                  {selectedPath?.name === path.name ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Seleccionado
                    </>
                  ) : (
                    <>
                      Seleccionar este camino
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 90-Day Plan */}
        <section className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-bold text-white">
              90-Day Plan (Path Recomendado)
            </h2>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            {topPath.name}
          </p>

          <div className="space-y-4">
            {Object.entries(analysis.recommendation.plan90days).map(([week, action]) => (
              <div key={week} className="bg-gray-900 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-400 mb-2">
                  {week.replace('_', '-').replace('week', 'Semanas ')}
                </div>
                <p className="text-gray-300 text-sm">{action}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-blue-900/30 border border-blue-500 rounded-lg p-4">
            <div className="text-sm font-semibold text-blue-400 mb-2">
              🎯 Acción más importante ESTA SEMANA:
            </div>
            <p className="text-white font-medium">
              {analysis.recommendation.singleMostImportantAction}
            </p>
          </div>
        </section>

        {/* Red Flags */}
        <section className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-white">
              Red Flags (NO hagas esto)
            </h2>
          </div>
          <ul className="space-y-2">
            {analysis.redFlags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-300">
                <span className="text-red-500 mt-0.5">❌</span>
                <span className="text-sm">{flag}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Bottom CTA */}
        {selectedPath && (
          <div className="mt-8 text-center">
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Path seleccionado: {selectedPath.name}
              </h3>
              <p className="text-gray-400 mb-4">
                Redirigiendo a crear tu negocio...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
