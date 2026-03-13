/**
 * Onboarding Paso 5/6: Plan de 14 Días
 * Timeline visual agrupado por 4 sprints
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle, Loader2, Bot, Clock, XCircle } from 'lucide-react';
import api from '../lib/api';
import { trackTaskAssigned, trackVentureLaunched } from '../lib/analytics/events';

function LoadingPlan() {
  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="relative w-14 h-14 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-2 border-[#21262d]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00ff87] animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 font-mono">Generando tu plan...</h2>
        <p className="text-[#8b949e] text-sm">Personalizando las 14 tareas basadas en tu análisis.</p>
      </div>
    </div>
  );
}

const SPRINT_COLORS = {
  1: { accent: '#00ff87', bg: 'bg-[#00ff87]/10', border: 'border-[#00ff87]/20', text: 'text-[#00ff87]' },
  2: { accent: '#3b82f6', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/20', text: 'text-[#3b82f6]' },
  3: { accent: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  4: { accent: '#8b5cf6', bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
};

function TaskCard({ task, sprintColor }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-[#0a0e14] rounded-lg border border-[#21262d] hover:border-[#30363d] transition-colors">
      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 font-mono text-xs font-bold ${sprintColor.bg} ${sprintColor.text}`}>
        {task.day}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-0.5">
          <span className="text-sm font-semibold text-white leading-tight">{task.title}</span>
          {task.agentCanHelp && (
            <div className="flex-shrink-0 flex items-center gap-1 bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5">
              <Bot className="w-3 h-3 text-[#00ff87]" />
              <span className="text-[9px] font-mono text-[#00ff87]">IA</span>
            </div>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-[#8b949e] leading-relaxed mb-1">{task.description}</p>
        )}
        <div className="flex items-center gap-3">
          {task.estimatedMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#484f58]" />
              <span className="text-[10px] font-mono text-[#484f58]">{task.estimatedMinutes} min</span>
            </div>
          )}
          {task.expectedOutput && (
            <span className="text-[10px] font-mono text-[#484f58] truncate">→ {task.expectedOutput}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SprintCard({ sprint, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = SPRINT_COLORS[sprint.id] || SPRINT_COLORS[1];

  return (
    <div className={`bg-[#0d1117] border rounded-xl overflow-hidden ${colors.border}`}>
      {/* Sprint header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-[#161b22] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
            SPRINT {sprint.id}
          </div>
          <div>
            <div className="font-bold text-white text-sm">{sprint.name}</div>
            <div className="text-[10px] font-mono text-[#484f58]">Días {sprint.days} · {sprint.tasks?.length || 0} tareas</div>
          </div>
        </div>
        <div className={`text-[10px] font-mono ${colors.text}`}>
          {open ? '▲' : '▼'}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5">
          {sprint.objective && (
            <p className="text-xs text-[#8b949e] italic mb-4 pl-1 border-l-2" style={{ borderColor: colors.accent }}>
              {sprint.objective}
            </p>
          )}
          <div className="space-y-2">
            {sprint.tasks?.map((task) => (
              <TaskCard key={task.id} task={task} sprintColor={colors} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Plan14Days() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('loading'); // loading | result | error
  const [plan, setPlan] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const pollRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const cid = searchParams.get('company') || localStorage.getItem('lanzalo_selected_company');
    if (!cid) {
      navigate('/onboarding/viabilidad');
      return;
    }
    setCompanyId(cid);
    startPlanGeneration(cid);

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  async function startPlanGeneration(cid) {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      await api.post('/api/plans/generate-14-days', { companyId: cid });
    } catch (err) {
      console.error('Error starting plan generation:', err);
    }

    pollPlanStatus(cid, 0);
  }

  function pollPlanStatus(cid, attempts) {
    if (attempts > 60) {
      setPhase('error');
      return;
    }

    pollRef.current = setTimeout(async () => {
      try {
        const data = await api.get(`/api/plans/${cid}`);

        if (data.status === 'completed' && data.plan) {
          setPlan(data.plan);
          setPhase('result');
          // Trackear primera asignación de tareas (plan generado)
          const userId = localStorage.getItem('lanzalo_user_id') || '';
          const firstTaskId = data.plan?.sprints?.[0]?.tasks?.[0]?.id || 'plan-day-1';
          trackTaskAssigned({ agentId: cid, taskId: firstTaskId, userId });
        } else if (data.status === 'failed') {
          setPhase('error');
        } else {
          pollPlanStatus(cid, attempts + 1);
        }
      } catch (err) {
        pollPlanStatus(cid, attempts + 1);
      }
    }, 3000);
  }

  if (phase === 'loading') return <LoadingPlan />;

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error generando el plan</h2>
          <p className="text-[#8b949e] text-sm mb-6">Hubo un problema. Intenta de nuevo.</p>
          <button
            onClick={() => { startedRef.current = false; setPhase('loading'); startPlanGeneration(companyId); }}
            className="px-6 py-3 bg-[#00ff87] text-black font-bold rounded-lg font-mono text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-3">paso 5 de 6</div>
          <h1 className="text-2xl font-bold text-white mb-2">Tu plan de 14 días</h1>
          <p className="text-[#8b949e] text-sm">
            {plan?.totalTasks || 0} tareas específicas para validar, construir y vender.
            Las marcadas con <span className="text-[#00ff87] font-mono">IA</span> el agente puede hacerlas por ti.
          </p>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-white">4</div>
            <div className="text-[10px] font-mono text-[#484f58] mt-0.5">SPRINTS</div>
          </div>
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-[#00ff87]">{plan?.totalTasks || 0}</div>
            <div className="text-[10px] font-mono text-[#484f58] mt-0.5">TAREAS</div>
          </div>
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-[#3b82f6]">14</div>
            <div className="text-[10px] font-mono text-[#484f58] mt-0.5">DÍAS</div>
          </div>
        </div>

        {/* Sprints */}
        <div className="space-y-4 mb-8">
          {plan?.sprints?.map((sprint, i) => (
            <SprintCard key={sprint.id} sprint={sprint} defaultOpen={i === 0} />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            // Trackear venture lanzado al hacer clic en "Empezar Día 1"
            const userId = localStorage.getItem('lanzalo_user_id') || '';
            trackVentureLaunched({ ventureId: companyId, ideaType: plan?.ideaType || 'custom', userId });
            // Activar encuesta de activación en co-fundador (si no la ha respondido)
            if (!localStorage.getItem('lanzalo_activation_survey_done')) {
              localStorage.setItem('lanzalo_show_activation_survey', '1');
            }
            navigate('/co-fundador');
          }}
          className="w-full flex items-center justify-center gap-2 px-6 py-4
                   bg-[#00ff87] hover:bg-[#00e67a] text-black font-bold rounded-lg
                   transition-colors font-mono text-sm"
        >
          Empezar Día 1
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-[#484f58] text-xs font-mono mt-3">
          Tu co-fundador IA te espera con la primera tarea lista
        </p>
      </div>
    </div>
  );
}
