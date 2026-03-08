import { useState, useEffect, useRef } from 'react'

export default function LandingPage({ onNavigateToLogin }) {
  const [visibleSections, setVisibleSections] = useState(new Set())
  const [currentIdea, setCurrentIdea] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  const ideas = [
    'Una app de citas para granjeros',
    'SaaS para gestionar foodtrucks',
    'Marketplace de insectos comestibles',
    'Software para tarotistas online',
    'App para reservar barberos a domicilio',
    'Plataforma de alquiler de gallinas ponedoras',
  ]

  // Typing animation for hero
  useEffect(() => {
    const idea = ideas[currentIdea]
    if (isTyping) {
      if (typedText.length < idea.length) {
        const timer = setTimeout(() => {
          setTypedText(idea.slice(0, typedText.length + 1))
        }, 45)
        return () => clearTimeout(timer)
      } else {
        const timer = setTimeout(() => setIsTyping(false), 2000)
        return () => clearTimeout(timer)
      }
    } else {
      if (typedText.length > 0) {
        const timer = setTimeout(() => {
          setTypedText(typedText.slice(0, -1))
        }, 25)
        return () => clearTimeout(timer)
      } else {
        setCurrentIdea((prev) => (prev + 1) % ideas.length)
        setIsTyping(true)
      }
    }
  }, [typedText, isTyping, currentIdea])

  // Intersection observer for scroll animations
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

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const isVisible = (id) => visibleSections.has(id)

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold tracking-tight">
              <span className="text-white">Lanzalo</span>
              <span className="text-emerald-400">.pro</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <button onClick={() => scrollToSection('como-funciona')} className="hover:text-white transition-colors">Cómo funciona</button>
            <button onClick={() => scrollToSection('agentes')} className="hover:text-white transition-colors">Agentes IA</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Precios</button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToLogin('login')}
              className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block"
            >
              Entrar
            </button>
            <button
              onClick={() => onNavigateToLogin('register')}
              className="text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-4 py-2 rounded-lg transition-colors"
            >
              Empezar gratis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-emerald-400 text-sm mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            14 días gratis — sin tarjeta
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Describe tu idea.
            <br />
            <span className="text-emerald-400">Te montamos la empresa.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Un equipo de agentes IA que trabaja 24/7 para construir tu negocio completo:
            web, marketing, ventas y operaciones. En español, para emprendedores de verdad.
          </p>

          <div className="h-12 sm:h-14 flex items-center justify-center mb-10">
            <span className="text-base sm:text-lg text-gray-500 font-mono">
              &quot;{typedText}
              <span className="animate-pulse text-emerald-400">|</span>
              &quot;
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigateToLogin('register')}
              className="w-full sm:w-auto text-base font-semibold bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20"
            >
              Crear cuenta gratis
            </button>
            <button
              onClick={() => scrollToSection('como-funciona')}
              className="w-full sm:w-auto text-base text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-8 py-3.5 rounded-xl transition-all"
            >
              Ver cómo funciona
            </button>
          </div>

          <p className="text-xs text-gray-600 mt-6">
            Un tío en Murcia factura 4K/mes vendiendo cursos de cría de caracoles. Con una web hecha en Lánzalo.
          </p>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-white/5 py-8 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-gray-500">
          <span>600M hispanohablantes sin herramientas en su idioma</span>
          <span className="hidden sm:inline text-gray-700">|</span>
          <span>$39/mes por negocio</span>
          <span className="hidden sm:inline text-gray-700">|</span>
          <span>0% comisión sobre ventas</span>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div
            id="section-howit"
            data-animate
            className={`text-center mb-16 transition-all duration-700 ${isVisible('section-howit') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tres pasos. Cero excusas.
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              No necesitas saber programar, ni de marketing, ni de diseño.
              Solo necesitas una idea (o ni eso — te ayudamos a encontrarla).
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Describe tu idea',
                desc: 'Cuéntale a tu Co-Fundador IA qué tienes en mente. Da igual si es "quiero vender calcetines para gatos" o algo más serio.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Los agentes construyen',
                desc: 'Un equipo de 10+ agentes IA trabaja en paralelo: web, copy, marketing, código, finanzas, analytics... Todo automático.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Tú facturas',
                desc: 'Tu negocio online funcionando: web desplegada, emails automatizados, contenido publicándose. Tú solo decides y cobras.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                id={`step-${i}`}
                data-animate
                className={`group relative bg-gray-900/50 border border-white/5 rounded-2xl p-8 hover:border-emerald-500/20 transition-all duration-700 ${isVisible(`step-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-mono text-emerald-400/60">{item.step}</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Team */}
      <section id="agentes" className="py-20 sm:py-28 px-4 sm:px-6 bg-gray-900/20">
        <div className="max-w-5xl mx-auto">
          <div
            id="section-agents"
            data-animate
            className={`text-center mb-16 transition-all duration-700 ${isVisible('section-agents') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tu equipo trabaja mientras duermes
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              10+ agentes especializados coordinados por un Co-Fundador IA.
              Trabajan 24/7, no piden vacaciones, y no se quejan del café.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Co-Fundador (CEO)', desc: 'Coordina todo. Define estrategia, prioriza tareas, toma decisiones. Tu socio que nunca descansa.', color: 'emerald' },
              { name: 'Marketing', desc: 'Campañas, contenido, copy que vende. No el típico "potencia tu marca" — contenido que convierte.', color: 'blue' },
              { name: 'Código', desc: 'Genera y despliega tu web, landing pages, funcionalidades. Sin que toques una línea de código.', color: 'purple' },
              { name: 'Email', desc: 'Secuencias de email, newsletters, drip campaigns. Todo automatizado con personalización real.', color: 'amber' },
              { name: 'Analytics', desc: 'Métricas, KPIs, informes. Sabe qué funciona y qué no antes de que tú lo preguntes.', color: 'rose' },
              { name: 'Finanzas', desc: 'Proyecciones, pricing, control de gastos. El CFO que toda startup necesita (y no puede pagar).', color: 'cyan' },
              { name: 'Twitter/X', desc: 'Publica contenido, interactúa con tu audiencia, crece tu presencia. Orgánico, no spam.', color: 'sky' },
              { name: 'Investigación', desc: 'Análisis de mercado, competidores, tendencias. Datos reales para decisiones reales.', color: 'orange' },
              { name: 'Trend Scout', desc: 'Detecta oportunidades y nichos antes que nadie. Tu radar de tendencias 24/7.', color: 'lime' },
            ].map((agent, i) => {
              const colors = {
                emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                lime: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
              }
              return (
                <div
                  key={i}
                  id={`agent-${i}`}
                  data-animate
                  className={`bg-gray-900/60 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all duration-500 ${isVisible(`agent-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: `${(i % 3) * 80}ms` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[agent.color]}`}>
                      {agent.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{agent.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparison / Why Lánzalo */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div
            id="section-why"
            data-animate
            className={`text-center mb-16 transition-all duration-700 ${isVisible('section-why') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              &quot;¿Y esto no lo hace ya Lovable / Bolt / ChatGPT?&quot;
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              No. Esas herramientas te hacen una web. Lánzalo te monta un negocio.
              Es como comparar un martillo con una constructora.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div
              id="compare-others"
              data-animate
              className={`bg-gray-900/40 border border-white/5 rounded-2xl p-8 transition-all duration-700 ${isVisible('compare-others') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
            >
              <h3 className="text-lg font-semibold text-gray-400 mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">✕</span>
                Otras herramientas
              </h3>
              <ul className="space-y-3 text-sm text-gray-500">
                {[
                  'Te generan código que no entiendes',
                  'Solo hacen UNA cosa (web, o copy, o...)',
                  'En inglés (o español de traductor)',
                  'Tú tienes que orquestar todo',
                  'Sin estrategia de negocio',
                  'Comisiones del 20% sobre tus ventas',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              id="compare-lanzalo"
              data-animate
              className={`bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 transition-all duration-700 ${isVisible('compare-lanzalo') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
            >
              <h3 className="text-lg font-semibold text-emerald-400 mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400">✓</span>
                Lánzalo
              </h3>
              <ul className="space-y-3 text-sm text-gray-300">
                {[
                  'Negocio completo end-to-end',
                  '10+ agentes trabajando en equipo',
                  'Español nativo (no traducido)',
                  'El Co-Fundador IA orquesta todo por ti',
                  'Estrategia, marketing, ventas, código, todo',
                  '0% comisión — tú te quedas con todo',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6 bg-gray-900/20">
        <div className="max-w-3xl mx-auto">
          <div
            id="section-pricing"
            data-animate
            className={`text-center mb-16 transition-all duration-700 ${isVisible('section-pricing') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Menos que un autónomo. Más que un equipo.
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Un equipo de IA que trabaja 24/7 por menos de lo que cuesta una cena con vino (bueno, depende del vino).
            </p>
          </div>

          <div
            id="price-card"
            data-animate
            className={`relative bg-gray-900/60 border border-emerald-500/20 rounded-2xl p-8 sm:p-10 max-w-md mx-auto transition-all duration-700 ${isVisible('price-card') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-gray-950 text-xs font-bold px-4 py-1 rounded-full">
              14 DÍAS GRATIS
            </div>

            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold">$39</span>
                <span className="text-gray-400">/mes</span>
              </div>
              <p className="text-sm text-gray-500">por negocio</p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Co-Fundador IA + 10 agentes especializados',
                'Web desplegada y funcionando',
                'Marketing y email automatizados',
                'Analytics y métricas en tiempo real',
                'Generación de contenido ilimitada',
                '0% comisión sobre tus ventas',
                'Soporte y actualizaciones constantes',
              ].map((feat, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                  <svg className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {feat}
                </li>
              ))}
            </ul>

            <button
              onClick={() => onNavigateToLogin('register')}
              className="w-full text-base font-semibold bg-emerald-500 hover:bg-emerald-400 text-gray-950 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20"
            >
              Empezar 14 días gratis
            </button>

            <p className="text-xs text-gray-600 text-center mt-4">
              Sin tarjeta de crédito. Cancela cuando quieras. Sin dramas.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div
            id="section-faq"
            data-animate
            className={`text-center mb-16 transition-all duration-700 ${isVisible('section-faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Preguntas que ya sabemos que tienes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: '¿Necesito saber programar?',
                a: 'No. Literalmente cero código. El agente de código hace todo por ti. Tú solo describes qué quieres y él lo construye, despliega y mantiene.',
              },
              {
                q: '¿Esto es otro generador de landing pages?',
                a: 'No. Eso ya existe y es aburrido. Lánzalo monta negocios completos: estrategia, web, marketing, emails, analytics, contenido — todo orquestado por agentes IA que trabajan como un equipo de verdad.',
              },
              {
                q: '¿Por qué en español?',
                a: 'Porque 600 millones de personas hablan español y las alternativas están en inglés o con traducciones que parecen de Google Translate de 2010. Merecemos herramientas que hablen como nosotros.',
              },
              {
                q: '¿Qué pasa si mi idea es una tontería?',
                a: 'El Co-Fundador IA te dirá si tu idea tiene potencial o si estás perdiendo el tiempo, pero con cariño. También puede ayudarte a encontrar una idea mejor analizando tendencias y nichos rentables.',
              },
              {
                q: '¿Y si ya tengo un negocio?',
                a: 'Perfecto. Lánzalo puede potenciar un negocio existente con automatización de marketing, analytics, contenido y más. No tienes que empezar de cero.',
              },
            ].map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} index={i} isVisible={isVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div
          id="section-cta"
          data-animate
          className={`max-w-3xl mx-auto text-center transition-all duration-700 ${isVisible('section-cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h2 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight">
            Tu idea vale más que un
            <br />
            <span className="text-emerald-400">&quot;ya lo haré mañana&quot;</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto mb-8">
            Mientras lo piensas, alguien en algún sitio está lanzando algo peor que lo tuyo.
            La diferencia es que ese alguien lo lanzó.
          </p>
          <button
            onClick={() => onNavigateToLogin('register')}
            className="text-base font-semibold bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-10 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20"
          >
            Lanzar mi idea ahora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-white">Lanzalo<span className="text-emerald-400">.pro</span></span>
            <span>— Tu co-fundador IA autónomo</span>
          </div>
          <div className="text-xs text-gray-600">
            © {new Date().getFullYear()} Lánzalo. Hecho con cafeína e inteligencia artificial.
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
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-900/40 transition-colors"
      >
        <span className="text-sm font-medium pr-4">{question}</span>
        <svg
          className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pb-5' : 'max-h-0'}`}>
        <p className="text-sm text-gray-400 leading-relaxed px-5">{answer}</p>
      </div>
    </div>
  )
}
