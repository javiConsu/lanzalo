/**
 * Onboarding Paso 4/6: Análisis de Viabilidad
 * Fase A: Loading con progress log animado
 * Fase B: Resultado con 6 secciones (veredicto, timing, cliente, competencia, canales, riesgos)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, AlertTriangle, XCircle, Clock, Users, Zap, TrendingUp, Shield, AlertCircle } from 'lucide-react';
import api from '../lib/api';

const LOG_STEPS = [
  { text: 'Perfil del founder procesado', delay: 800 },
  { text: 'Mercado objetivo identificado', delay: 2000 },
  { text: 'Analizando competencia...', delay: 3500 },
  { text: 'Estimando potencial de mercado...', delay: 6000 },
  { text: 'Evaluando canales de adquisición...', delay: 9000 },
  { text: 'Calculando riesgos y mitigaciones...', delay: 13000 },
  { text: 'Generando veredicto final...', delay: 18000 },
];

function LoadingPhase() {
  const [visibleLogs, setVisibleLogs] = useState([]);

  useEffect(() => {
    const timers = LOG_STEPS.map(({ text, delay }, i) =>
      setTimeout(() => {
        setVisibleLogs(prev => [...prev, { text, done: i < LOG_STEPS.length - 2 }]);
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          {/* Spinner animado */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-[#21262d]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00ff87] animate-spin" />
            <div className="absolute inset-2 rounded-full bg-[#00ff87]/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#00ff87]" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 font-mono">Analizando tu idea...</h2>
          <p className="text-[#8b949e] text-sm">El análisis tarda ~30 segundos. No cierres esta página.</p>
        </div>

        {/* Progress log */}
        <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 font-mono text-xs space-y-2">
          {visibleLogs.map((log, i) => (
            <div key={i} className="flex items-center gap-2">
              {log.done ? (
                <CheckCircle className="w-3.5 h-3.5 text-[#00ff87] flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-[#00ff87] animate-spin flex-shrink-0" />
              )}
              <span className={log.done ? 'text-[#8b949e]' : 'text-white'}>{log.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VerdictBadge({ verdict, confidenceScore }) {
  const configs = {
    go: {
      label: 'GO',
      color: '#00ff87',
      bg: 'bg-[#00ff87]/10',
      border: 'border-[#00ff87]/30',
      icon: <CheckCircle className="w-6 h-6" />,
      text: 'text-[#00ff87]'
    },
    caution: {
      label: 'CAUTION',
      color: '#f59e0b',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: <AlertTriangle className="w-6 h-6" />,
      text: 'text-amber-400'
    },
    no_go: {
      label: 'NO GO',
      color: '#ef4444',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: <XCircle className="w-6 h-6" />,
      text: 'text-red-400'
    }
  };

  const cfg = configs[verdict] || configs.caution;

  return (
    <div className={`flex items-center gap-4 p-6 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
      <div className={`${cfg.text}`}>{cfg.icon}</div>
      <div>
        <div className={`text-3xl font-bold font-mono ${cfg.text}`}>{cfg.label}</div>
        <div className="text-[#8b949e] text-sm mt-0.5">Confianza: <span className={`font-bold ${cfg.text}`}>{confidenceScore}%</span></div>
      </div>
    </div>
  );
}

function ScoreChip({ score }) {
  const colors = {
    good: 'text-[#00ff87] bg-[#00ff87]/10 border-[#00ff87]/20',
    regular: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    bad: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-[#00ff87] bg-[#00ff87]/10 border-[#00ff87]/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-[#8b949e] bg-[#21262d] border-[#30363d]'
  };
  const labels = {
    good: 'BUENO', regular: 'REGULAR', bad: 'MALO',
    high: 'ALTO', medium: 'MEDIO', low: 'BAJO'
  };
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${colors[score] || colors.regular}`}>
      {labels[score] || score?.toUpperCase()}
    </span>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[#8b949e]">{icon}</div>
        <h3 className="text-sm font-mono font-bold text-[#8b949e] uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ResultsPhase({ analysis, companyId }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e14] px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-3">análisis completo</div>
          <h1 className="text-2xl font-bold text-white mb-2">Resultado del análisis</h1>
          {analysis.summary && (
            <p className="text-[#8b949e] text-sm leading-relaxed">{analysis.summary}</p>
          )}
        </div>

        {/* 1. Veredicto */}
        <div className="mb-4">
          <VerdictBadge verdict={analysis.verdict} confidenceScore={analysis.confidenceScore} />
        </div>

        {/* 2. Timing */}
        {analysis.timing && (
          <div className="mb-4">
            <Section icon={<Clock className="w-4 h-4" />} title="Por qué ahora">
              <div className="flex items-start gap-3">
                <ScoreChip score={analysis.timing.score} />
                <p className="text-sm text-[#8b949e] leading-relaxed">{analysis.timing.reason}</p>
              </div>
            </Section>
          </div>
        )}

        {/* 3. Cliente y dolor */}
        {analysis.customer && (
          <div className="mb-4">
            <Section icon={<Users className="w-4 h-4" />} title="Cliente y dolor">
              <div className="space-y-2">
                {analysis.customer.segment && (
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-mono text-[#484f58]">Segmento principal</span>
                    <span className="text-sm text-white text-right">{analysis.customer.segment}</span>
                  </div>
                )}
                {analysis.customer.estimatedSize && (
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-mono text-[#484f58]">Mercado estimado</span>
                    <span className="text-sm text-white text-right">{analysis.customer.estimatedSize}</span>
                  </div>
                )}
                {analysis.customer.willingnessToPay && (
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-mono text-[#484f58]">Precio posible</span>
                    <span className="text-sm text-[#00ff87] font-mono text-right">{analysis.customer.willingnessToPay}</span>
                  </div>
                )}
                {analysis.customer.painLevel && (
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-mono text-[#484f58]">Nivel de dolor</span>
                    <ScoreChip score={analysis.customer.painLevel} />
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* 4. Competencia */}
        {analysis.competition && (
          <div className="mb-4">
            <Section icon={<TrendingUp className="w-4 h-4" />} title="Competencia">
              {analysis.competition.directCompetitors?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {analysis.competition.directCompetitors.map((comp, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 bg-[#0a0e14] rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{comp.name}</span>
                          {comp.price && <span className="text-xs font-mono text-[#484f58]">{comp.price}</span>}
                        </div>
                        {comp.weakness && <p className="text-xs text-[#8b949e] mt-0.5">{comp.weakness}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {analysis.competition.competitiveWindow && (
                <p className="text-xs text-[#8b949e] italic">{analysis.competition.competitiveWindow}</p>
              )}
            </Section>
          </div>
        )}

        {/* 5. Canales */}
        {analysis.channels?.length > 0 && (
          <div className="mb-4">
            <Section icon={<Zap className="w-4 h-4" />} title="Canales de adquisición">
              <div className="space-y-3">
                {analysis.channels.slice(0, 3).map((ch, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs font-mono text-[#484f58] w-4 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-white">{ch.name}</span>
                        {ch.estimatedCAC && (
                          <span className="text-[10px] font-mono text-[#00ff87] bg-[#00ff87]/10 px-1.5 py-0.5 rounded">
                            CAC {ch.estimatedCAC}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8b949e]">{ch.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* 6. Riesgos */}
        {analysis.risks?.length > 0 && (
          <div className="mb-8">
            <Section icon={<Shield className="w-4 h-4" />} title="Riesgos principales">
              <div className="space-y-3">
                {analysis.risks.map((risk, i) => (
                  <div key={i} className="p-3 bg-[#0a0e14] rounded-lg">
                    <div className="flex items-start gap-2 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-white">{risk.description}</span>
                    </div>
                    {risk.mitigation && (
                      <p className="text-xs text-[#8b949e] ml-5">
                        <span className="text-[#00ff87]">Mitigación:</span> {risk.mitigation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => navigate(`/onboarding/plan-14-dias?company=${companyId}`)}
          className="w-full flex items-center justify-center gap-2 px-6 py-4
                   bg-[#00ff87] hover:bg-[#00e67a] text-black font-bold rounded-lg
                   transition-colors font-mono text-sm"
        >
          Ver mi Plan de 14 Días
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-[#484f58] text-xs font-mono mt-3">
          Plan personalizado basado en este análisis
        </p>
      </div>
    </div>
  );
}

export default function ViabilityAnalysis() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading'); // loading | result | error
  const [analysis, setAnalysis] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const pollRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const cid = localStorage.getItem('lanzalo_pending_analysis') || localStorage.getItem('lanzalo_selected_company');
    if (!cid) {
      navigate('/onboarding/perfil');
      return;
    }
    setCompanyId(cid);
    startAnalysis(cid);

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  async function startAnalysis(cid) {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      // Iniciar análisis
      await api.post('/api/analysis/viability', { companyId: cid });
    } catch (err) {
      console.error('Error starting analysis:', err);
    }

    // Empezar polling
    pollStatus(cid, 0);
  }

  function pollStatus(cid, attempts) {
    if (attempts > 60) { // 60 * 3s = 3 minutos máx
      setPhase('error');
      return;
    }

    pollRef.current = setTimeout(async () => {
      try {
        const data = await api.get(`/api/analysis/viability/${cid}`);

        if (data.status === 'completed' && data.analysis) {
          setAnalysis(data.analysis);
          setPhase('result');
          localStorage.removeItem('lanzalo_pending_analysis');
        } else if (data.status === 'failed') {
          setPhase('error');
        } else {
          // Seguir polling
          pollStatus(cid, attempts + 1);
        }
      } catch (err) {
        console.error('Poll error:', err);
        pollStatus(cid, attempts + 1);
      }
    }, 3000);
  }

  if (phase === 'loading') return <LoadingPhase />;

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error en el análisis</h2>
          <p className="text-[#8b949e] text-sm mb-6">Hubo un problema generando el análisis. Intenta de nuevo.</p>
          <button
            onClick={() => {
              startedRef.current = false;
              setPhase('loading');
              startAnalysis(companyId);
            }}
            className="px-6 py-3 bg-[#00ff87] text-black font-bold rounded-lg font-mono text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return <ResultsPhase analysis={analysis} companyId={companyId} />;
}
