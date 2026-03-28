import { useState, useEffect, useRef } from 'react'

// Simulated live agent activity log
const AGENT_LOGS = [
  { agent: 'CEO', action: 'Analizando competidores en el nicho de fitness...', status: 'working' },
  { agent: 'Marketing', action: 'Generando 5 variantes de copy para ads de Meta...', status: 'working' },
  { agent: 'Codigo', action: 'Desplegando landing page en Vercel...', status: 'done' },
  { agent: 'Email', action: 'Configurando secuencia de bienvenida (7 emails)...', status: 'working' },
  { agent: 'Analytics', action: 'Conectando Google Analytics + configurando eventos...', status: 'done' },
  { agent: 'CEO', action: 'Detectada oportunidad: nicho sin competencia directa', status: 'done' },
  { agent: 'Finanzas', action: 'Proyeccion Q1: break-even en semana 6...', status: 'working' },
  { agent: 'Twitter/X', action: 'Publicando hilo sobre el problema que resuelves...', status: 'done' },
  { agent: 'Investigacion', action: 'Scrapeando 230 reviews de competidores...', status: 'working' },
  { agent: 'Marketing', action: 'Calendario editorial: 30 posts para LinkedIn listos', status: 'done' },
  { agent: 'Codigo', action: 'Implementando pasarela de pago con Stripe...', status: 'working' },
  { agent: 'Trend Scout', action: 'Tendencia detectada: +340% busquedas esta semana', status: 'done' },
]

const AGENT_COLORS = {
  CEO: '#00ff87',
  Marketing: '#3b82f6',
  Codigo: '#a855f7',
  Email: '#f59e0b',
  Analytics: '#f43f5e',
  Finanzas: '#06b6d4',
  'Twitter/X': '#38bdf8',
  Investigacion: '#fb923c',
  'Trend Scout': '#84cc16',
}

function LiveActivityDemo() {
  const [logs, setLogs] = useState([])
  const [tick, setTick] = useState(0)
  const scrollRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1800)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const next = AGENT_LOGS[tick % AGENT_LOGS.length]
    setLogs(prev => [
      ...prev.slice(-5),
      { ...next, id: tick, ts: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
    ])
  }, [tick])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs])

  return (
    <div className="relative bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#161b22]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs font-mono text-gray-500">lanzalo — agentes activos</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs font-mono text-[#00ff87]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
          LIVE
        </span>
      </div>
      <div ref={scrollRef} className="p-4 h-48 overflow-y-auto space-y-2.5 font-mono text-xs">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2">
            <span className="text-gray-600 flex-shrink-0 tabular-nums">{log.ts}</span>
            <span
              className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ color: AGENT_COLORS[log.agent] || '#ffffff', backgroundColor: `${AGENT_COLORS[log.agent] || '#ffffff'}18` }}
            >
              {log.agent}
            </span>
            <span className={`leading-relaxed ${log.status === 'done' ? 'text-gray-500' : 'text-gray-200'}`}>
              {log.action}
              {log.status === 'working' && (
                <span className="inline-flex gap-0.5 ml-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                </span>
              )}
              {log.status === 'done' && <span className="text-[#00ff87] ml-1">+</span>}
            </span>
          </div>
        ))}
        {logs.length === 0 && <div className="text-gray-600">Iniciando agentes...</div>}
      </div>
    </div>
  )
}

export default function LandingPage({ onNavigateToLogin }) {
  const [visibleSections, setVisibleSections] = useState(new Set())
  const [currentIdea, setCurrentIdea] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  const ideas = [
    'SaaS para gestionar foodtrucks',
    'Marketplace de artesanias locales',
    'App de citas para profesionales',
    'Cursos online de fermentacion',
    'Servicio de catering a domicilio',
    'Tienda de productos para mascotas',
  ]

  useEffect(() => {
    const idea = ideas[currentIdea]
    if (isTyping) {
      if (typedText.length < idea.length) {
        const timer = setTimeout(() => setTypedText(idea.slice(0, typedText.length + 1)), 45)
        return () => clearTimeout(timer)
      } else {
        const timer = setTimeout(() => setIsTyping(false), 2000)
        return () => clearTimeout(timer)
      }
    } else {
      if (typedText.length > 0) {
        const timer = setTimeout(() => setTypedText(typedText.slice(0, -1)), 25)
        return () => clearTimeout(timer)
      } else {
        setCurrentIdea((prev) => (prev + 1) % ideas.length)
        setIsTyping(true)
      }
    }
  }, [typedText, isTyping, currentIdea])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]))
          }
        })
      },
      { threshold: 0.15 }
    )
    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const isVisible = (id) => visibleSections.has(id)
  const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white overflow-x-hidden">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0e14]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="font-mono text-lg font-semibold tracking-tight">
            <span className="text-white">Lanzalo</span>
            <span className="text-[#00ff87]">.pro</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <button onClick={() => scrollToSection('como-funciona')} className="hover:text-white transition-colors">Como funciona</button>
            <button onClick={() => scrollToSection('agentes')} className="hover:text-white transition-colors">Agentes</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Precios</button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToLogin('login')}
              className="text-sm text-gray-500 hover:text-white transition-colors hidden sm:block"
            >
              Entrar
            </button>
            <button
              onClick={() => onNavigateToLogin('register')}
              className="text-sm font-bold font-mono bg-[#00ff87] hover:bg-[#00e87a] text-black px-4 py-2 rounded-lg transition-colors"
            >
              Trial gratis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#00ff87]/10 border border-[#00ff87]/20 rounded-full px-4 py-1.5 text-[#00ff87] text-xs font-mono mb-8">
            <span className="w-1.5 h-1.5 bg-[#00ff87] rounded-full animate-pulse" />
            14 días de trial &mdash; sin tarjeta
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Tu equipo de agentes de IA
            <br />
            <span className="text-[#00ff87]">en 5 minutos.</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mb-6 leading-relaxed">
            Crea tu empresa online con un equipo de IA que trabaja 24/7:
            web, marketing, ventas y operaciones. Sin saber programar.
          </p>

          <div className="h-10 flex items-center mb-10">
            <span className="text-base text-gray-600 font-mono">
              &ldquo;{typedText}<span className="animate-pulse text-[#00ff87]">|</span>&rdquo;
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <button
              onClick={() => onNavigateToLogin('register')}
              className="w-full sm:w-auto text-base font-bold font-mono bg-[#00ff87] hover:bg-[#00e87a] text-black px-8 py-3.5 rounded-xl transition-all"
            >
              Crear mi empresa
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className="w-full sm:w-auto text-sm text-gray-500 hover:text-white border border-white/10 hover:border-white/20 px-8 py-3.5 rounded-xl transition-all"
            >
              Ver agentes en acción
            </button>
          </div>

          <p className="text-xs text-gray-700 font-mono">
            Desde $29/mes &bull; 0% comisión sobre ventas &bull; cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Live Demo */}
      <section id="demo" className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div
            id="section-demo"
            data-animate
            className={`transition-all duration-700 ${isVisible('section-demo') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">En este momento</span>
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-xs font-mono text-[#00ff87] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
                agentes activos
              </span>
            </div>
            <LiveActivityDemo />
            <p className="text-xs text-center text-gray-700 font-mono mt-4">
              Esto es lo que tus agentes hacen mientras tu duermes
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/5 py-8 bg-[#0d1117]/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {[
            { value: '600M', label: 'hispanohablantes sin herramientas propias' },
            { value: 'Desde $29', label: 'al mes' },
            { value: '0%', label: 'comisión sobre ventas' },
            { value: '10+', label: 'agentes especializados' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-mono font-bold text-white tabular-nums">{stat.value}</div>
              <div className="text-xs text-gray-600 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div
            id="section-howit"
            data-animate
            className={`mb-16 transition-all duration-700 ${isVisible('section-howit') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tres pasos. Cero excusas.</h2>
            <p className="text-gray-400 max-w-xl text-sm">
              No necesitas saber programar, ni de marketing, ni de diseno. Solo una idea.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'Describe tu idea',
                desc: 'Cuenta que tienes en mente. El Co-Fundador IA valida el mercado y define la estrategia.',
              },
              {
                step: '02',
                title: 'Los agentes construyen',
                desc: '10+ agentes trabajan en paralelo: web, copy, marketing, codigo, finanzas. Todo automatico.',
              },
              {
                step: '03',
                title: 'Tu facturas',
                desc: 'Negocio online funcionando: web desplegada, emails automatizados, contenido publicandose.',
              },
            ].map((item, i) => (
              <div
                key={i}
                id={`step-${i}`}
                data-animate
                className={`relative bg-[#0d1117] border border-white/5 rounded-xl p-8 hover:border-[#00ff87]/20 transition-all duration-700 ${isVisible(`step-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="font-mono text-4xl font-bold text-white/5 mb-4 tabular-nums">{item.step}</div>
                <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Team */}
      <section id="agentes" className="py-20 sm:py-28 px-4 sm:px-6 bg-[#0d1117]/40">
        <div className="max-w-5xl mx-auto">
          <div
            id="section-agents"
            data-animate
            className={`mb-16 transition-all duration-700 ${isVisible('section-agents') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tu equipo trabaja mientras duermes</h2>
            <p className="text-gray-400 max-w-xl text-sm">
              10+ agentes especializados coordinados por un Co-Fundador IA. 24/7, sin vacaciones.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'Co-Fundador (CEO)', desc: 'Coordina todo. Define estrategia, prioriza tareas, toma decisiones.', color: '#00ff87' },
              { name: 'Marketing', desc: 'Campanas, contenido, copy que convierte. No el tipico "potencia tu marca".', color: '#3b82f6' },
              { name: 'Codigo', desc: 'Genera y despliega tu web, landing pages y funcionalidades.', color: '#a855f7' },
              { name: 'Email', desc: 'Secuencias de email, newsletters, drip campaigns automatizados.', color: '#f59e0b' },
              { name: 'Analytics', desc: 'Metricas, KPIs, informes. Sabe que funciona antes de que lo preguntes.', color: '#f43f5e' },
              { name: 'Finanzas', desc: 'Proyecciones, pricing, control de gastos. Tu CFO automatico.', color: '#06b6d4' },
              { name: 'Twitter/X', desc: 'Publica contenido, interactua con tu audiencia, crece tu presencia.', color: '#38bdf8' },
              { name: 'Investigacion', desc: 'Analisis de mercado, competidores, tendencias en tiempo real.', color: '#fb923c' },
              { name: 'Trend Scout', desc: 'Detecta oportunidades y nichos antes que nadie.', color: '#84cc16' },
            ].map((agent, i) => (
              <div
                key={i}
                id={`agent-${i}`}
                data-animate
                className={`bg-[#0d1117] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all duration-500 ${isVisible(`agent-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${(i % 3) * 80}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: agent.color }} />
                  <span className="text-xs font-mono font-semibold" style={{ color: agent.color }}>{agent.name}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div
            id="section-why"
            data-animate
            className={`mb-16 transition-all duration-700 ${isVisible('section-why') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">&ldquo;Esto no lo hace ya ChatGPT?&rdquo;</h2>
            <p className="text-gray-400 max-w-xl text-sm">
              No. ChatGPT te da texto. Lanzalo te monta un negocio.
              Como comparar un martillo con una constructora.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div
              id="compare-others"
              data-animate
              className={`bg-[#0d1117] border border-white/5 rounded-xl p-8 transition-all duration-700 ${isVisible('compare-others') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
            >
              <h3 className="text-xs font-mono font-semibold text-gray-600 mb-6 uppercase tracking-widest">Otras herramientas</h3>
              <ul className="space-y-3">
                {[
                  'Solo hacen UNA cosa',
                  'En ingles o con traduccion mala',
                  'Tu orquestas todo manualmente',
                  'Sin estrategia de negocio',
                  'Comisiones del 20% sobre ventas',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-gray-700 mt-0.5 font-mono">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              id="compare-lanzalo"
              data-animate
              className={`bg-[#00ff87]/5 border border-[#00ff87]/15 rounded-xl p-8 transition-all duration-700 ${isVisible('compare-lanzalo') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
            >
              <h3 className="text-xs font-mono font-semibold text-[#00ff87] mb-6 uppercase tracking-widest">Lanzalo.pro</h3>
              <ul className="space-y-3">
                {[
                  'Negocio completo end-to-end',
                  '10+ agentes trabajando en equipo',
                  'Espanol nativo, para emprendedores reales',
                  'El Co-Fundador IA lo orquesta todo',
                  '0% comisión — tú te quedas con todo',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-[#00ff87] mt-0.5 font-mono">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6 bg-[#0d1117]/40">
        <div className="max-w-5xl mx-auto">
          <div
            id="section-pricing"
            data-animate
            className={`mb-12 text-center transition-all duration-700 ${isVisible('section-pricing') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Planes para cada etapa</h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Desde emprendedores que empiezan hasta negocios que escalan. Sin letra pequeña.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: 'Starter',
                price: '29',
                badge: null,
                features: [
                  '1 negocio',
                  '5 agentes especializados',
                  'Web basica desplegada',
                  'Marketing automation basico',
                  'Email sequences (hasta 5)',
                  'Soporte por email',
                ],
                cta: 'Empezar gratis',
              },
              {
                name: 'Pro',
                price: '79',
                badge: 'POPULAR',
                features: [
                  '3 negocios',
                  '10+ agentes especializados',
                  'Web personalizada + landing pages',
                  'Marketing automation avanzado',
                  'Email sequences ilimitadas',
                  'Analytics en tiempo real',
                  'Contenido social automatizado',
                  'Soporte prioritario',
                ],
                cta: 'Empezar trial',
                highlighted: true,
              },
              {
                name: 'Business',
                price: '199',
                badge: null,
                features: [
                  'Negocios ilimitados',
                  'Agentes personalizados',
                  'API access',
                  'Integraciones custom',
                  'Dedicated account manager',
                  'SLA garantizado',
                  'Onboarding personalizado',
                  'Soporte 24/7',
                ],
                cta: 'Contactar',
              },
            ].map((plan, i) => (
              <div
                key={i}
                id={`plan-${i}`}
                data-animate
                className={`relative rounded-2xl p-6 sm:p-8 transition-all duration-700 ${
                  plan.highlighted
                    ? `bg-[#00ff87]/5 border-2 border-[#00ff87]/30 ${isVisible(`plan-${i}`) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`
                    : `bg-[#0d1117] border border-white/5 ${isVisible(`plan-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00ff87] text-black text-xs font-mono font-bold px-4 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-mono font-bold tabular-nums">{plan.price}</span>
                  <span className="text-gray-500 text-sm">/mes</span>
                </div>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className={`${plan.highlighted ? 'text-[#00ff87]' : 'text-gray-600'} font-mono mt-0.5 flex-shrink-0`}>+</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onNavigateToLogin('register')}
                  className={`w-full text-sm font-bold font-mono py-3 rounded-xl transition-all ${
                    plan.highlighted
                      ? 'bg-[#00ff87] hover:bg-[#00e87a] text-black'
                      : 'border border-white/10 hover:border-white/20 text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios / Casos de uso */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div
            id="section-cases"
            data-animate
            className={`mb-12 text-center transition-all duration-700 ${isVisible('section-cases') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Negocios que nacieron aqui</h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Emprendedores reales que describieron su idea y la vieron realidad.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: 'SaaS para Foodtrucks',
                desc: 'Gestion de pedidos y reservas para foodtrucks. Lanzado en 3 semanas.',
                metrics: '12 clientes / 2.4K MRR',
                icon: '🚚',
              },
              {
                name: 'Marketplace Artesanias',
                desc: 'Plataforma para artesanos locales. El agente de marketing genero todo el contenido.',
                metrics: '340 productos / 8K MRR',
                icon: '🏺',
              },
              {
                name: 'Cursos Fermentacion',
                desc: 'Academia online de fermentacion. El agente de codigo construyo la plataforma completa.',
                metrics: '180 estudiantes / 5.2K MRR',
                icon: '🥬',
              },
            ].map((item, i) => (
              <div
                key={i}
                id={`case-${i}`}
                data-animate
                className={`bg-[#0d1117] border border-white/5 rounded-xl p-6 hover:border-[#00ff87]/20 transition-all duration-500 ${isVisible(`case-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-base font-semibold mb-2">{item.name}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{item.desc}</p>
                <div className="text-xs font-mono text-[#00ff87]">{item.metrics}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div
            id="section-faq"
            data-animate
            className={`mb-12 transition-all duration-700 ${isVisible('section-faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-2xl sm:text-3xl font-bold">Preguntas frecuentes</h2>
          </div>

          <div className="space-y-2">
            {[
              {
                q: 'Necesito saber programar?',
                a: 'No. Cero codigo. El agente de codigo hace todo por ti. Describes que quieres y el lo construye, despliega y mantiene.',
              },
              {
                q: 'Esto es otro generador de landing pages?',
                a: 'No. Lanzalo monta negocios completos: estrategia, web, marketing, emails, analytics — orquestado por agentes que trabajan como un equipo real.',
              },
              {
                q: '¿Por qué en español?',
                a: '600 millones de personas hablan español y las alternativas están en inglés o con traducciones que parecen de Google Translate de 2010.',
              },
              {
                q: 'Y si ya tengo un negocio?',
                a: 'Lanzalo puede potenciar un negocio existente con automatizacion de marketing, analytics, contenido y mas. No tienes que empezar de cero.',
              },
            ].map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} index={i} isVisible={isVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-[#0d1117]/40">
        <div
          id="section-cta"
          data-animate
          className={`max-w-2xl mx-auto transition-all duration-700 ${isVisible('section-cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="font-mono text-xs text-gray-700 uppercase tracking-widest mb-6">// ready to launch?</div>
          <h2 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight">
            Tu idea vale mas que un<br />
            <span className="text-[#00ff87]">&ldquo;ya lo hare manana&rdquo;</span>
          </h2>
          <p className="text-gray-500 text-sm mb-8 max-w-lg">
            Mientras lo piensas, alguien esta lanzando algo peor que lo tuyo.
            La diferencia es que ese alguien lo lanzo.
          </p>
          <button
            onClick={() => onNavigateToLogin('register')}
            className="text-base font-bold font-mono bg-[#00ff87] hover:bg-[#00e87a] text-black px-10 py-4 rounded-xl transition-all"
          >
            Empieza tu trial gratuito
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-mono text-sm">
            <span className="text-white font-semibold">Lanzalo<span className="text-[#00ff87]">.pro</span></span>
            <span className="text-gray-700 ml-2">— Tu co-fundador IA autonomo</span>
          </div>
          <div className="text-xs text-gray-700 font-mono">
            &copy; {new Date().getFullYear()} Lanzalo. Hecho con cafeina e inteligencia artificial.
          </div>
        </div>
      </footer>
    </div>
  )
}

function FAQItem({ question, answer, index, isVisible }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      id={`faq-${index}`}
      data-animate
      className={`border border-white/5 rounded-xl overflow-hidden transition-all duration-500 ${isVisible(`faq-${index}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-mono pr-4">{question}</span>
        <svg
          className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-40 pb-5' : 'max-h-0'}`}>
        <p className="text-sm text-gray-500 leading-relaxed px-5">{answer}</p>
      </div>
    </div>
  )
}
