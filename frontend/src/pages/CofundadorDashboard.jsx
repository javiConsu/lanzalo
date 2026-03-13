/**
 * Paso 6/6: Dashboard Co-Fundador IA
 * Panel izq: tareas del día del plan
 * Panel central: chat con CEO Agent (streaming)
 * Panel der: entregables generados
 */

import { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../api.js';
import { CheckCircle, Circle, Bot, ArrowRight, FileText, Clock, ChevronRight } from 'lucide-react';
import { trackTaskAssigned, trackTaskCompleted } from '../lib/analytics/events';

function TaskItem({ task, onDelegate }) {
  const statusIcons = {
    done: <CheckCircle className="w-4 h-4 text-[#00ff87]" />,
    in_progress: <div className="w-4 h-4 rounded-full border-2 border-[#00ff87] border-t-transparent animate-spin" />,
    todo: <Circle className="w-4 h-4 text-[#484f58]" />
  };

  return (
    <div className={`p-3 rounded-lg border transition-all ${
      task.status === 'done'
        ? 'border-[#00ff87]/20 bg-[#00ff87]/5 opacity-60'
        : 'border-[#21262d] bg-[#0d1117] hover:border-[#30363d]'
    }`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {statusIcons[task.status] || statusIcons.todo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white leading-tight mb-0.5">{task.title}</div>
          {task.estimatedMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-[#484f58]" />
              <span className="text-[10px] font-mono text-[#484f58]">{task.estimatedMinutes} min</span>
            </div>
          )}
        </div>
      </div>
      {task.agentCanHelp && task.status === 'todo' && (
        <button
          onClick={() => onDelegate(task)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#00ff87]/10 hover:bg-[#00ff87]/20 border border-[#00ff87]/30 rounded text-[10px] font-mono text-[#00ff87] transition-colors"
        >
          <Bot className="w-3 h-3" />
          Delegar al agente
        </button>
      )}
    </div>
  );
}

function ArtifactItem({ artifact }) {
  const icons = {
    landing_page: '🌐',
    email_template: '📧',
    script: '📄',
    analysis: '📊',
    plan: '📋',
    twitter: '🐦',
    research: '🔬'
  };

  return (
    <div className="p-3 rounded-lg border border-[#21262d] bg-[#0d1117] hover:border-[#30363d] transition-colors">
      <div className="flex items-start gap-2">
        <span className="text-base flex-shrink-0">{icons[artifact.type] || '📄'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate">{artifact.title}</div>
          <div className="text-[10px] font-mono text-[#484f58] mt-0.5">
            {new Date(artifact.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CofundadorDashboard() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [todayTasks, setTodayTasks] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [plan, setPlan] = useState(null);
  const [currentDay, setCurrentDay] = useState(1);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');

  // Cargar empresas
  useEffect(() => {
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.companies?.length > 0) {
          setCompanies(data.companies);
          const saved = localStorage.getItem('lanzalo_selected_company');
          const initial = saved && data.companies.find(c => c.id === saved)
            ? saved
            : data.companies[0].id;
          setSelectedCompany(initial);
        }
      })
      .catch(console.error);
  }, [token]);

  // Cargar datos cuando cambia la empresa
  useEffect(() => {
    if (!selectedCompany) return;
    loadCompanyData(selectedCompany);
    loadChatHistory(selectedCompany);
  }, [selectedCompany]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket
  useEffect(() => {
    if (!selectedCompany) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onmessage = (event) => {
      const activity = JSON.parse(event.data);
      if (activity.type === 'task_completed' || activity.type === 'task_failed') {
        setAiThinking(false);
        loadChatHistory(selectedCompany);
        loadCompanyData(selectedCompany);
      }
    };
    return () => ws.close();
  }, [selectedCompany]);

  async function loadCompanyData(cid) {
    try {
      // Cargar plan de 14 días
      const planRes = await fetch(`/api/plans/${cid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const planData = await planRes.json();
      if (planData.plan) {
        setPlan(planData.plan);
        // Calcular día actual (día 1 siempre para MVP inicial)
        const day = parseInt(localStorage.getItem(`lanzalo_day_${cid}`) || '1');
        setCurrentDay(day);

        // Tareas del día actual
        const dayTasks = [];
        planData.plan.sprints?.forEach(sprint => {
          sprint.tasks?.forEach(task => {
            if (task.day === day) {
              dayTasks.push({ ...task, status: getTaskStatus(cid, task.id) });
            }
          });
        });
        setTodayTasks(dayTasks);
      }

      // Artefactos: usar mensajes del chat filtrados por tipo
      // Por ahora usar los mensajes de chat con action field
    } catch (err) {
      console.error('Error loading company data:', err);
    }
  }

  function getTaskStatus(cid, taskId) {
    const key = `lanzalo_task_${cid}_${taskId}`;
    return localStorage.getItem(key) || 'todo';
  }

  function setTaskStatus(cid, taskId, status) {
    const key = `lanzalo_task_${cid}_${taskId}`;
    localStorage.setItem(key, status);
  }

  async function loadChatHistory(cid) {
    try {
      const res = await fetch(`/api/user/companies/${cid}/chat/history?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data.messages || []);

      // Extraer artefactos de mensajes con action
      const arts = (data.messages || [])
        .filter(m => m.action && m.role === 'assistant')
        .map(m => ({
          id: m.id,
          title: m.action,
          type: inferArtifactType(m.action),
          created_at: m.created_at
        }))
        .reverse()
        .slice(0, 10);
      setArtifacts(arts);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  }

  function inferArtifactType(action) {
    if (!action) return 'research';
    const a = action.toLowerCase();
    if (a.includes('landing') || a.includes('web')) return 'landing_page';
    if (a.includes('email') || a.includes('correo')) return 'email_template';
    if (a.includes('tweet') || a.includes('twitter')) return 'twitter';
    if (a.includes('plan') || a.includes('14')) return 'plan';
    if (a.includes('análisis') || a.includes('analiz')) return 'analysis';
    if (a.includes('guión') || a.includes('script')) return 'script';
    return 'research';
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !selectedCompany) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setAiThinking(true);

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }]);

    try {
      const res = await fetch(`/api/user/companies/${selectedCompany}/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: { currentDay, pendingTasks: todayTasks.filter(t => t.status === 'todo').map(t => t.id) }
        })
      });
      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.message,
          action: data.action,
          task_id: data.taskId,
          created_at: new Date().toISOString()
        }]);
        setAiThinking(false);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Error procesando tu mensaje. Intenta de nuevo.',
        created_at: new Date().toISOString()
      }]);
      setAiThinking(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelegateTask(task) {
    if (!selectedCompany) return;

    setTaskStatus(selectedCompany, task.id, 'in_progress');
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'in_progress' } : t));
    setAiThinking(true);

    // Trackear tarea asignada al agente
    const userId = localStorage.getItem('lanzalo_user_id') || '';
    trackTaskAssigned({ agentId: selectedCompany, taskId: task.id, userId });

    const delegateMsg = `Ejecuta esta tarea por mí: "${task.title}". ${task.description || ''}`;
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: delegateMsg,
      created_at: new Date().toISOString()
    }]);

    try {
      const res = await fetch(`/api/user/companies/${selectedCompany}/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: delegateMsg })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.message,
          action: data.action,
          task_id: data.taskId,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (err) {
      console.error('Delegate error:', err);
    } finally {
      setAiThinking(false);
    }
  }

  function markTaskDone(task) {
    setTaskStatus(selectedCompany, task.id, 'done');
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done' } : t));
    // Trackear tarea completada
    const userId = localStorage.getItem('lanzalo_user_id') || '';
    trackTaskCompleted({ agentId: selectedCompany, taskId: task.id, userId });
  }

  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.name;

  return (
    <div className="min-h-screen bg-[#0a0e14] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#0d1117] border-b border-[#21262d] px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="text-sm font-mono font-bold text-[#00ff87]">LANZALO</div>
        {companies.length > 1 ? (
          <select
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-transparent border-none text-white text-sm font-semibold outline-none cursor-pointer"
          >
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <span className="text-sm font-semibold text-white">{selectedCompanyName}</span>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#00ff87] rounded-full animate-pulse" />
          <span className="text-[11px] font-mono text-[#00ff87]">Día {currentDay}/14</span>
        </div>
        <div className="w-24 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00ff87] rounded-full transition-all"
            style={{ width: `${(currentDay / 14) * 100}%` }}
          />
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex-1 flex min-h-0">

        {/* Panel izquierdo: Tareas del día */}
        <div className="w-64 flex-shrink-0 bg-[#0d1117] border-r border-[#21262d] flex flex-col">
          <div className="p-4 border-b border-[#21262d]">
            <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider mb-1">HOY — DÍA {currentDay}</div>
            <div className="text-sm font-bold text-white">
              {todayTasks.filter(t => t.status === 'done').length}/{todayTasks.length} tareas
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-[#484f58] text-xs font-mono">Sin tareas para hoy</div>
                {!plan && (
                  <a href="/onboarding/plan-14-dias" className="text-[10px] font-mono text-[#00ff87] mt-2 block">
                    Generar plan →
                  </a>
                )}
              </div>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} onClick={() => task.status !== 'done' && markTaskDone(task)}>
                  <TaskItem task={task} onDelegate={handleDelegateTask} />
                </div>
              ))
            )}
          </div>

          {/* Mañana (preview) */}
          {plan && currentDay < 14 && (
            <div className="p-3 border-t border-[#21262d]">
              <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider mb-2">
                MAÑANA — DÍA {currentDay + 1}
              </div>
              {plan.sprints?.flatMap(s => s.tasks || [])
                .filter(t => t.day === currentDay + 1)
                .slice(0, 2)
                .map(task => (
                  <div key={task.id} className="text-[10px] text-[#484f58] py-1 border-b border-[#21262d] last:border-0 flex items-center gap-1.5">
                    <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Panel central: Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && !aiThinking && (
              <div className="flex justify-start">
                <div className="max-w-lg bg-[#0d1117] border border-[#21262d] rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-[#00ff87]" />
                    <span className="text-xs font-mono text-[#00ff87]">Co-Fundador IA</span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">
                    Buenos días. Soy tu co-fundador IA. Hoy es tu Día {currentDay}.
                    {todayTasks.length > 0
                      ? ` Tienes ${todayTasks.length} tareas en el plan. ¿Por cuál empezamos?`
                      : ' ¿En qué puedo ayudarte hoy?'}
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-lg rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#00ff87] text-black'
                    : 'bg-[#0d1117] border border-[#21262d] text-white'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot className="w-3 h-3 text-[#00ff87]" />
                      <span className="text-[10px] font-mono text-[#00ff87]">Co-Fundador</span>
                    </div>
                  )}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  {msg.action && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] font-mono opacity-60 flex items-center gap-1">
                      <span>⚡</span> {msg.action}
                    </div>
                  )}
                  <div className="text-[10px] opacity-40 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {aiThinking && (
              <div className="flex justify-start">
                <div className="bg-[#0d1117] border border-[#21262d] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-[#00ff87] rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[#00ff87] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-1.5 h-1.5 bg-[#00ff87] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                    <span className="text-xs text-[#8b949e] font-mono">Analizando...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#21262d] p-4">
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta algo o pide ayuda con una tarea..."
                className="flex-1 bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#484f58] focus:border-[#00ff87] focus:ring-1 focus:ring-[#00ff87]/20 outline-none transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-[#00ff87] hover:bg-[#00e67a] text-black font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Panel derecho: Entregables */}
        <div className="w-56 flex-shrink-0 bg-[#0d1117] border-l border-[#21262d] flex flex-col hidden lg:flex">
          <div className="p-4 border-b border-[#21262d]">
            <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider">Entregables</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Análisis de viabilidad siempre disponible */}
            <a href="/onboarding/viabilidad" className="block p-3 rounded-lg border border-[#21262d] bg-[#0a0e14] hover:border-[#30363d] transition-colors">
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0">📊</span>
                <div>
                  <div className="text-xs font-semibold text-white">Análisis viabilidad</div>
                  <div className="text-[10px] font-mono text-[#484f58]">Ver completo</div>
                </div>
              </div>
            </a>

            {plan && (
              <a href={`/onboarding/plan-14-dias?company=${selectedCompany}`} className="block p-3 rounded-lg border border-[#21262d] bg-[#0a0e14] hover:border-[#30363d] transition-colors">
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">📋</span>
                  <div>
                    <div className="text-xs font-semibold text-white">Plan 14 días</div>
                    <div className="text-[10px] font-mono text-[#484f58]">{plan.totalTasks} tareas</div>
                  </div>
                </div>
              </a>
            )}

            {artifacts.map(artifact => (
              <ArtifactItem key={artifact.id} artifact={artifact} />
            ))}

            {artifacts.length === 0 && (
              <p className="text-[10px] font-mono text-[#484f58] text-center py-4">
                Los entregables generados por el agente aparecerán aquí
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
