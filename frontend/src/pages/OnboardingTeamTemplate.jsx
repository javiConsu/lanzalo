/**
 * Onboarding Paso 4/6: Seleccion de plantilla de equipo de agentes
 * 3 plantillas: Agencia de Marketing, Tienda Online, Startup Tech
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Users, Megaphone, ShoppingCart, Rocket, Check } from 'lucide-react';

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

const TEAM_TEMPLATES = [
  {
    id: 'marketing_agency',
    title: 'Agencia de Marketing',
    icon: Megaphone,
    color: '#00ff87',
    description: 'Equipo especializado en generar leads y cerrar ventas para servicios de marketing digital.',
    agents: [
      { name: 'Lead Hunter', role: 'Prospectacion', description: 'Busca clientes potenciales en LinkedIn, Instagram y Google' },
      { name: 'Content Creator', role: 'Contenido', description: 'Crea posts, emails y landing pages que convierten' },
      { name: 'Sales Closer', role: 'Ventas', description: 'Sigue leads, agenda calls y cierra contratos' },
      { name: 'Account Manager', role: 'Retencion', description: 'Onboarding de clientes y upselling de servicios' }
    ],
    focus: ['Lead generation', 'Content marketing', 'Sales automation', 'Client retention'],
    metrics: ['Leads/mes', 'Conversion rate', 'ARR por cliente', 'Churn rate']
  },
  {
    id: 'online_store',
    title: 'Tienda Online',
    icon: ShoppingCart,
    color: '#f59e0b',
    description: 'Equipo para e-commerce: desde sourcing de productos hasta atencion al cliente.',
    agents: [
      { name: 'Product Scout', role: 'Sourcing', description: 'Encuentra productos con alta demanda y margen' },
      { name: 'Store Manager', role: 'Operaciones', description: 'Gestiona inventario, precios y listings' },
      { name: 'Traffic Driver', role: 'Trafico', description: 'Ads en Meta, Google y TikTok rentables' },
      { name: 'Support Hero', role: 'Soporte', description: 'Responde dudas y gestiona devoluciones' }
    ],
    focus: ['Product sourcing', 'Conversion optimization', 'Paid ads', 'Customer support'],
    metrics: ['ROAS', 'AOV', 'CAC', 'Repeat customer rate']
  },
  {
    id: 'tech_startup',
    title: 'Startup Tech',
    icon: Rocket,
    color: '#8b5cf6',
    description: 'Equipo para SaaS o app: desarrollo, growth y fundraising.',
    agents: [
      { name: 'Product Owner', role: 'Producto', description: 'Define roadmap y prioriza features' },
      { name: 'Growth Engineer', role: 'Growth', description: 'Experimentos A/B, SEO y onboarding optimizado' },
      { name: 'Dev Advocate', role: 'Comunidad', description: 'Documentacion, tutorials y engagement' },
      { name: 'Fundraising Lead', role: 'Inversion', description: 'Pitch deck, investor outreach y due diligence' }
    ],
    focus: ['Product-market fit', 'User acquisition', 'Retention', 'Fundraising'],
    metrics: ['MRR', 'Churn', 'NPS', 'Burn rate']
  }
];

export default function OnboardingTeamTemplate({ token }) {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleSelect(template) {
    setSelectedTemplate(template);
  }

  async function handleContinue() {
    if (!selectedTemplate) return;

    setLoading(true);

    localStorage.setItem('lanzalo_team_template', JSON.stringify({
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.title,
      agents: selectedTemplate.agents,
      focus: selectedTemplate.focus,
      metrics: selectedTemplate.metrics,
      selectedAt: new Date().toISOString()
    }));

    const companyId = localStorage.getItem('lanzalo_selected_company');
    if (companyId) {
      navigate(`/onboarding/viability?company=${companyId}`);
    } else {
      navigate('/onboarding/viability');
    }
  }

  function handleSkip() {
    navigate('/onboarding/viability');
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">

        <ProgressBar step={4} total={6} />

        <button
          onClick={() => navigate('/onboarding/describe-idea')}
          className="flex items-center gap-2 text-[#484f58] hover:text-[#8b949e] mb-8 transition-colors text-sm font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="mb-8">
          <div className="text-xs font-mono text-[#484f58] uppercase tracking-widest mb-3">paso 4 de 6</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Configura tu equipo
          </h1>
          <p className="text-[#8b949e] text-sm max-w-lg">
            Elige una plantilla de agentes optimizada para tu tipo de negocio. Puedes personalizarla despues.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {TEAM_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate?.id === template.id;

            return (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                className={`relative bg-[#0d1117] border rounded-xl p-5 text-left transition-all group ${
                  isSelected
                    ? 'border-[#00ff87] bg-[#00ff87]/5'
                    : 'border-[#21262d] hover:border-[#30363d]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 rounded-full bg-[#00ff87] flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  </div>
                )}

                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${template.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: template.color }} />
                </div>

                <h3 className={`font-semibold text-base mb-2 ${isSelected ? 'text-[#00ff87]' : 'text-white'}`}>
                  {template.title}
                </h3>

                <p className="text-[#8b949e] text-xs leading-relaxed mb-4">
                  {template.description}
                </p>

                <div className="border-t border-[#21262d] pt-3">
                  <div className="flex items-center gap-1 text-[#484f58] text-[10px] font-mono mb-2">
                    <Users className="w-3 h-3" />
                    {template.agents.length} agentes
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.agents.slice(0, 2).map((agent, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]"
                      >
                        {agent.name}
                      </span>
                    ))}
                    {template.agents.length > 2 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]">
                        +{template.agents.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedTemplate && (
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-6 mb-8">
            <h4 className="text-white font-semibold text-sm mb-4">
              Agentes incluidos en "{selectedTemplate.title}"
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {selectedTemplate.agents.map((agent, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#161b22]">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${selectedTemplate.color}15` }}
                  >
                    <span className="text-xs font-mono font-bold" style={{ color: selectedTemplate.color }}>
                      {agent.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">{agent.name}</div>
                    <div className="text-[#484f58] text-xs font-mono">{agent.role}</div>
                    <div className="text-[#8b949e] text-xs mt-1">{agent.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#21262d]">
              <div className="flex flex-wrap gap-2">
                <span className="text-[#484f58] text-xs font-mono">Metricas clave:</span>
                {selectedTemplate.metrics.map((metric, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]"
                  >
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="text-[#484f58] hover:text-[#8b949e] text-sm font-mono transition-colors"
          >
            Saltar por ahora
          </button>

          <button
            onClick={handleContinue}
            disabled={!selectedTemplate || loading}
            className="flex items-center gap-2 px-8 py-3
                     bg-[#00ff87] hover:bg-[#00e67a] text-black font-bold rounded-lg
                     transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                     font-mono text-sm"
          >
            {loading ? 'Guardando...' : 'Continuar'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-center text-[#484f58] text-xs font-mono mt-6">
          Puedes anadir, editar o eliminar agentes desde el dashboard en cualquier momento.
        </p>
      </div>
    </div>
  );
}
