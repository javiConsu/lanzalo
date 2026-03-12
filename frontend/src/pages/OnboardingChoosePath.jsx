/**
 * Onboarding — Paso 1 de 3: Elige tu camino
 * Minimalismo tecnico. IBM Plex Mono. Sin emoji.
 */

import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
  )
}

export default function OnboardingChoosePath() {
  const navigate = useNavigate();

  const paths = [
    {
      key: 'describe',
      label: '01',
      title: 'Tengo una idea',
      desc: 'Describela en 2 frases. El Co-Fundador IA la valida y arranca el build.',
      detail: '30 segundos. El camino mas rapido.',
      color: '#00ff87',
      recommended: true,
      onClick: () => navigate('/onboarding/describe-idea'),
    },
    {
      key: 'discovery',
      label: '02',
      title: 'Quiero explorar',
      desc: 'Strategic Discovery completo: 28 preguntas, unfair advantages, 3-5 paths con plan de 90 dias.',
      detail: '15-20 minutos. Muy profundo.',
      color: '#3b82f6',
      recommended: false,
      onClick: () => navigate('/discovery'),
    },
    {
      key: 'ideas',
      label: '03',
      title: 'Sin idea aun',
      desc: 'Explora 50+ ideas ya validadas con datos de demanda y competencia. 1-click launch.',
      detail: 'Ideas con evidencia de mercado.',
      color: '#f59e0b',
      recommended: false,
      onClick: () => navigate('/onboarding/choose-idea'),
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">

        <ProgressBar step={1} total={3} />

        {/* Header */}
        <div className="mb-10">
          <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-3">paso 1 de 3</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Como quieres empezar?
          </h1>
          <p className="text-[#8b949e] text-sm max-w-md">
            Elige tu camino. Puedes cambiar despues.
          </p>
        </div>

        {/* Paths */}
        <div className="grid md:grid-cols-3 gap-4">
          {paths.map((path) => (
            <button
              key={path.key}
              onClick={path.onClick}
              className="relative bg-[#0d1117] border border-[#21262d] hover:border-white/20 rounded-xl p-6 text-left transition-all group"
            >
              {path.recommended && (
                <div className="absolute -top-2.5 left-5">
                  <span className="bg-[#00ff87] text-black text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                    RECOMENDADO
                  </span>
                </div>
              )}

              <div className="font-mono text-3xl font-bold mb-4 tabular-nums" style={{ color: `${path.color}18` }}>
                {path.label}
              </div>

              <h2 className="text-base font-semibold text-white mb-2">{path.title}</h2>
              <p className="text-sm text-[#8b949e] leading-relaxed mb-4">{path.desc}</p>

              <div className="pt-4 border-t border-[#21262d] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#484f58]">{path.detail}</span>
                <ArrowRight
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform flex-shrink-0"
                  style={{ color: path.color }}
                />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-[#484f58] text-xs font-mono">
            Todos los caminos dan acceso completo a Lanzalo
          </p>
        </div>
      </div>
    </div>
  );
}
