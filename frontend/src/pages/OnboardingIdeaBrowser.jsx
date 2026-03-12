/**
 * Onboarding Paso 2B: IdeaBrowser
 * El agente sugiere ideas validadas por el mercado adaptadas al perfil del founder.
 * MVP: 5 ideas curadas. Semana 2: agente de trends dinámico.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, TrendingUp, Clock, Zap, Loader2 } from 'lucide-react';
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

const DIFFICULTY_LABEL = { low: 'Baja', medium: 'Media', high: 'Alta' };
const COMPETITION_LABEL = { low: 'Baja', medium: 'Media', high: 'Alta' };

function IdeaCard({ idea, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(idea)}
      className={`w-full text-left bg-[#0d1117] border rounded-xl p-5 transition-all group ${
        selected
          ? 'border-[#00ff87] bg-[#00ff87]/5'
          : 'border-[#21262d] hover:border-[#30363d]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className={`font-bold text-sm leading-tight ${selected ? 'text-[#00ff87]' : 'text-white'}`}>
          {idea.title}
        </h3>
        <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all ${
          selected ? 'border-[#00ff87] bg-[#00ff87]' : 'border-[#30363d]'
        }`}>
          {selected && <div className="w-full h-full rounded-full bg-black scale-50 transform" />}
        </div>
      </div>

      {/* Fit score */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1 bg-[#21262d] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00ff87] rounded-full transition-all"
            style={{ width: `${idea.fitScore}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-[#00ff87]">{idea.fitScore}% fit</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#0a0e14] rounded-lg p-2 text-center">
          <TrendingUp className="w-3 h-3 text-[#484f58] mx-auto mb-0.5" />
          <div className="text-[10px] font-mono text-white truncate">{idea.trend}</div>
          <div className="text-[9px] font-mono text-[#484f58]">tendencia</div>
        </div>
        <div className="bg-[#0a0e14] rounded-lg p-2 text-center">
          <Clock className="w-3 h-3 text-[#484f58] mx-auto mb-0.5" />
          <div className="text-[10px] font-mono text-white truncate">{idea.timeToRevenue}</div>
          <div className="text-[9px] font-mono text-[#484f58]">a revenue</div>
        </div>
        <div className="bg-[#0a0e14] rounded-lg p-2 text-center">
          <Zap className="w-3 h-3 text-[#484f58] mx-auto mb-0.5" />
          <div className="text-[10px] font-mono text-white">{DIFFICULTY_LABEL[idea.technicalDifficulty]}</div>
          <div className="text-[9px] font-mono text-[#484f58]">dificultad</div>
        </div>
      </div>

      {/* Market size */}
      {idea.marketSize && (
        <div className="text-[10px] font-mono text-[#484f58] mb-2">
          Mercado: <span className="text-white">{idea.marketSize}</span>
        </div>
      )}

      {/* Fit reason */}
      {idea.fitReason && (
        <div className="text-[10px] font-mono text-[#3b82f6] mt-2 pt-2 border-t border-[#21262d]">
          ✓ {idea.fitReason}
        </div>
      )}
    </button>
  );
}

export default function OnboardingIdeaBrowser() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadIdeas();
  }, []);

  async function loadIdeas() {
    try {
      const data = await api.get('/api/onboarding/idea-suggestions');
      setIdeas(data.ideas || []);
    } catch (err) {
      console.error('Error loading ideas:', err);
      setError('Error cargando ideas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectAndContinue(idea) {
    setSelected(idea.id);
    // Pre-rellenar el formulario de idea con los datos de la idea seleccionada
    localStorage.setItem('lanzalo_prefill_idea', JSON.stringify(idea.prefillData || {}));
    // Ir a describe-idea con los datos pre-rellenados
    setTimeout(() => navigate('/onboarding/describe-idea'), 200);
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] px-4 py-12">
      <div className="max-w-2xl mx-auto">

        <ProgressBar step={2} total={6} />

        {/* Back */}
        <button
          onClick={() => navigate('/onboarding/idea-source')}
          className="flex items-center gap-2 text-[#484f58] hover:text-[#8b949e] mb-8 transition-colors text-sm font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-3">paso 2 de 6 · ideas validadas</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Ideas seleccionadas para tu perfil
          </h1>
          <p className="text-[#8b949e] text-sm">
            Ordenadas por fit con tu motivación, tiempo disponible y experiencia.
            Selecciona una para analizarla.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#00ff87] animate-spin mx-auto mb-3" />
              <p className="text-[#8b949e] text-sm font-mono">Analizando tu perfil...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm font-mono">{error}</p>
            <button
              onClick={loadIdeas}
              className="mt-2 text-[10px] font-mono text-red-400 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Ideas list */}
        {!loading && !error && (
          <div className="space-y-4">
            {ideas.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                selected={selected === idea.id}
                onSelect={handleSelectAndContinue}
              />
            ))}
          </div>
        )}

        {/* Alternative: go back to own idea */}
        {!loading && (
          <div className="mt-8 text-center">
            <p className="text-[#484f58] text-xs font-mono mb-2">
              ¿Prefieres usar tu propia idea?
            </p>
            <button
              onClick={() => navigate('/onboarding/describe-idea')}
              className="flex items-center gap-1.5 mx-auto text-sm font-mono text-[#8b949e] hover:text-white transition-colors"
            >
              Tengo una idea propia
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
