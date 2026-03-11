/**
 * Onboarding Paso 2/6: Origen de la idea
 * 2 opciones: tengo idea → describe-idea | quiero inspiración → idea-browser
 */

import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Lightbulb, Sparkles } from 'lucide-react';

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

export default function OnboardingIdeaSource() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full">

        <ProgressBar step={2} total={6} />

        {/* Back */}
        <button
          onClick={() => navigate('/onboarding/perfil')}
          className="flex items-center gap-2 text-[#484f58] hover:text-[#8b949e] mb-8 transition-colors text-sm font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {/* Header */}
        <div className="mb-10">
          <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-3">paso 2 de 6</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            ¿Ya tienes una idea?
          </h1>
          <p className="text-[#8b949e] text-sm max-w-md">
            No importa si está a medio cocer. Lo que importa es el punto de partida.
          </p>
        </div>

        {/* Options */}
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Opción A: Tengo una idea */}
          <button
            onClick={() => navigate('/onboarding/describe-idea')}
            className="relative bg-[#0d1117] border border-[#21262d] hover:border-[#00ff87]/40 rounded-xl p-6 text-left transition-all group"
          >
            <div className="absolute -top-2.5 left-5">
              <span className="bg-[#00ff87] text-black text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                RECOMENDADO
              </span>
            </div>

            <div className="w-10 h-10 rounded-lg bg-[#00ff87]/10 flex items-center justify-center mb-4">
              <Lightbulb className="w-5 h-5 text-[#00ff87]" />
            </div>

            <h2 className="text-lg font-bold text-white mb-2">
              Tengo una idea
            </h2>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-6">
              Ya sé qué quiero construir. Describela en 4 campos y el co-fundador la analiza.
            </p>

            <div className="pt-4 border-t border-[#21262d] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#484f58]">30 segundos. Análisis real.</span>
              <ArrowRight className="w-4 h-4 text-[#00ff87] group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Opción B: Quiero inspiración */}
          <button
            onClick={() => navigate('/onboarding/idea-browser')}
            className="relative bg-[#0d1117] border border-[#21262d] hover:border-[#3b82f6]/40 rounded-xl p-6 text-left transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-[#3b82f6]" />
            </div>

            <h2 className="text-lg font-bold text-white mb-2">
              Quiero inspiración
            </h2>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-6">
              El agente de trends sugiere ideas validadas por el mercado adaptadas a tu perfil.
            </p>

            <div className="pt-4 border-t border-[#21262d] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#484f58]">Ideas con evidencia real.</span>
              <ArrowRight className="w-4 h-4 text-[#3b82f6] group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        <div className="mt-8 text-center">
          <p className="text-[#484f58] text-xs font-mono">
            Puedes cambiar tu idea en cualquier momento desde el dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
