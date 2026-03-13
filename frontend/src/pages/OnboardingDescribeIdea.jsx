/**
 * Onboarding Paso 3/6: Formulario de idea + cliente potencial
 * 4 campos: descripción, cliente objetivo, problema/dolor, ventaja (opcional)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { trackAgentCreated } from '../lib/analytics/events';

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

export default function OnboardingDescribeIdea() {
  const navigate = useNavigate();

  // Pre-rellenar si viene del IdeaBrowser
  const prefill = (() => {
    try { return JSON.parse(localStorage.getItem('lanzalo_prefill_idea') || '{}'); }
    catch { return {}; }
  })();

  const [projectName, setProjectName] = useState(prefill.title || '');
  const [description, setDescription] = useState(prefill.description || '');
  const [targetCustomer, setTargetCustomer] = useState(prefill.targetCustomer || '');
  const [problem, setProblem] = useState(prefill.problem || '');
  const [unfairAdvantage, setUnfairAdvantage] = useState('');
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = description.trim() && targetCustomer.trim() && problem.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setLaunching(true);
    setError(null);

    try {
      const result = await api.post('/api/onboarding/create-company', {
        source: 'user_idea',
        name: projectName.trim() || null,
        description: description.trim(),
        targetCustomer: targetCustomer.trim(),
        problem: problem.trim(),
        unfairAdvantage: unfairAdvantage.trim() || null
      });

      if (result.success && result.company) {
        // Guardar companyId para el análisis de viabilidad
        localStorage.setItem('lanzalo_selected_company', result.company.id);
        localStorage.setItem('lanzalo_pending_analysis', result.company.id);
        // Limpiar prefill del IdeaBrowser
        localStorage.removeItem('lanzalo_prefill_idea');
        // Trackear creación de agente/venture
        const userId = localStorage.getItem('lanzalo_user_id') || '';
        trackAgentCreated({ agentId: result.company.id, agentType: 'co-founder', userId });
        // Ir a la pantalla de análisis
        navigate('/onboarding/viabilidad');
      } else if (result.code === 'NO_SLOTS') {
        setError(`Has alcanzado el límite de negocios (${result.used}/${result.slots}). Compra un hueco extra desde tu panel.`);
        setLaunching(false);
      } else {
        setError(result.error || 'Error creando la empresa');
        setLaunching(false);
      }
    } catch (err) {
      console.error('Error creating company:', err);
      if (err?.response?.code === 'NO_SLOTS' || err?.code === 'NO_SLOTS') {
        setError('Has alcanzado el límite de negocios de tu plan. Compra un hueco extra desde tu panel.');
      } else {
        setError('Error al crear la empresa. Intenta de nuevo.');
      }
      setLaunching(false);
    }
  }

  if (launching) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 text-[#00ff87] animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3 font-mono">
            Procesando tu idea...
          </h2>
          <p className="text-[#8b949e] text-sm">
            El análisis tarda ~30 segundos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">

        <ProgressBar step={3} total={6} />

        {/* Back button */}
        <button
          onClick={() => navigate('/onboarding/idea-source')}
          className="flex items-center gap-2 text-[#484f58] hover:text-[#8b949e] mb-8 transition-colors text-sm font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-3">paso 3 de 6</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Cuéntame tu idea
          </h1>
          <p className="text-[#8b949e] text-sm">
            Cuanto más específico seas, mejor será el análisis. No hace falta que sea perfecta.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Nombre preliminar */}
          <div>
            <label className="block text-xs font-mono text-[#8b949e] uppercase tracking-wider mb-2">
              ¿Cómo quieres llamar a tu proyecto?
              <span className="text-[#484f58] ml-2">(opcional — tu co-founder te propondrá nombres)</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ej: RestauFlow, InventaFácil, GestiBar..."
              className="w-full bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] rounded-lg px-4 py-3
                       text-white placeholder-[#484f58] focus:border-[#00ff87]
                       focus:ring-1 focus:ring-[#00ff87]/20 outline-none text-sm transition-colors"
              maxLength={60}
            />
            <p className="text-[10px] font-mono text-[#484f58] mt-1">
              No te preocupes si no tienes nombre — tu co-founder IA te propondrá 3 opciones al principio.
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-mono text-[#8b949e] uppercase tracking-wider mb-2">
              ¿Qué quieres construir? <span className="text-[#00ff87]">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Una app de gestión de inventario para restaurantes pequeños que no pueden pagar Oracle ni SAP."
              rows={3}
              className="w-full bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] rounded-lg px-4 py-3
                       text-white placeholder-[#484f58] focus:border-[#00ff87]
                       focus:ring-1 focus:ring-[#00ff87]/20 outline-none resize-none text-sm transition-colors"
              required
              maxLength={280}
            />
            <div className="text-right text-xs font-mono text-[#484f58] mt-1">{description.length}/280</div>
          </div>

          {/* Cliente objetivo */}
          <div>
            <label className="block text-xs font-mono text-[#8b949e] uppercase tracking-wider mb-2">
              ¿A quién va dirigido exactamente? <span className="text-[#00ff87]">*</span>
            </label>
            <textarea
              value={targetCustomer}
              onChange={(e) => setTargetCustomer(e.target.value)}
              placeholder="Ej: Dueños de restaurantes de 1-3 locales en España y México, entre 30-50 años, sin equipo técnico."
              rows={2}
              className="w-full bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] rounded-lg px-4 py-3
                       text-white placeholder-[#484f58] focus:border-[#00ff87]
                       focus:ring-1 focus:ring-[#00ff87]/20 outline-none resize-none text-sm transition-colors"
              required
              maxLength={280}
            />
            <div className="text-right text-xs font-mono text-[#484f58] mt-1">{targetCustomer.length}/280</div>
          </div>

          {/* Problema */}
          <div>
            <label className="block text-xs font-mono text-[#8b949e] uppercase tracking-wider mb-2">
              ¿Qué problema resuelve? ¿Por qué es un dolor ahora? <span className="text-[#00ff87]">*</span>
            </label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Ej: Llevan el inventario en Excel y siempre se quedan sin productos en fin de semana. Les cuesta €500/mes en mermas."
              rows={3}
              className="w-full bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] rounded-lg px-4 py-3
                       text-white placeholder-[#484f58] focus:border-[#00ff87]
                       focus:ring-1 focus:ring-[#00ff87]/20 outline-none resize-none text-sm transition-colors"
              required
              maxLength={280}
            />
            <div className="text-right text-xs font-mono text-[#484f58] mt-1">{problem.length}/280</div>
          </div>

          {/* Ventaja */}
          <div>
            <label className="block text-xs font-mono text-[#8b949e] uppercase tracking-wider mb-2">
              ¿Por qué tú? ¿Qué sabes/tienes que otros no?
              <span className="text-[#484f58] ml-2">(opcional)</span>
            </label>
            <textarea
              value={unfairAdvantage}
              onChange={(e) => setUnfairAdvantage(e.target.value)}
              placeholder="Ej: Trabajé 5 años en cadena de restaurantes. Conozco el problema desde dentro y tengo 20 contactos directos."
              rows={2}
              className="w-full bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] rounded-lg px-4 py-3
                       text-white placeholder-[#484f58] focus:border-[#00ff87]
                       focus:ring-1 focus:ring-[#00ff87]/20 outline-none resize-none text-sm transition-colors"
              maxLength={280}
            />
            <p className="text-[10px] font-mono text-[#484f58] mt-1">
              Los founders con ventaja específica tienen 3x más probabilidad de éxito.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm font-mono">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-6 py-4
                     bg-[#00ff87] hover:bg-[#00e67a] text-black font-bold rounded-lg
                     transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                     font-mono text-sm"
          >
            Analizar mi idea
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[#484f58] text-xs font-mono">
            El análisis tarda ~30 segundos.
          </p>
        </form>
      </div>
    </div>
  );
}
