/**
 * Premium Design Reference — Lánzalo Code Agent
 * 
 * Este módulo contiene el sistema de diseño de referencia que el agente de código
 * debe seguir para generar landing pages y webs de calidad premium.
 * 
 * Inspirado en las mejores prácticas de estudios como Brewed in Pixels,
 * combinando: design tokens, glassmorphism, scroll animations, micro-interactions,
 * tipografía profesional y responsive-first design.
 */

const DESIGN_REFERENCE = {

  // ==========================================
  // CSS BASE: Design Tokens + Reset
  // ==========================================
  cssBase: `
/* ========================================
   DESIGN SYSTEM — Lánzalo Premium
   Tokens, reset, base styles
======================================== */
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  /* --- Palette --- */
  --ink: #0A0A0A;
  --paper: #FAF8F5;
  --cream: #F0EDE8;
  --charcoal: #2A2A2A;
  --grey: #999;
  --grey-light: #C4C4C4;
  --faint: #E8E6E3;
  --white: #FFFFFF;

  /* --- Accent (adaptar al negocio del usuario) --- */
  --accent: #FF4D00;
  --accent-light: #FF7733;
  --accent-dark: #CC3D00;
  --accent-glow: rgba(255, 77, 0, 0.35);
  --accent-dim: rgba(255, 77, 0, 0.06);

  /* --- Borders --- */
  --border-soft: 1px solid rgba(10,10,10,0.08);
  --border-medium: 1px solid rgba(10,10,10,0.15);

  /* --- Shadows --- */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 20px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.08);
  --shadow-accent: 0 4px 20px rgba(var(--accent-rgb), 0.15);

  /* --- Radius --- */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 100px;

  /* --- Gradients --- */
  --gradient-accent: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 50%, #FF9F66 100%);
  --gradient-glass: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%);
  --gradient-hero: radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb),0.06) 0%, transparent 60%);

  /* --- Transitions --- */
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

html { scroll-behavior: smooth; font-size: 16px; }

body {
  font-family: 'Space Grotesk', sans-serif;
  background: var(--paper);
  color: var(--ink);
  overflow-x: hidden;
  font-size: 15px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: var(--accent);
  color: var(--white);
}

img { max-width: 100%; height: auto; }

a {
  color: var(--accent);
  text-decoration: none;
  transition: color 0.2s var(--ease-out);
}
a:hover { color: var(--accent-dark); }
`,

  // ==========================================
  // ANIMACIONES CSS
  // ==========================================
  cssAnimations: `
/* ========================================
   ANIMATIONS
======================================== */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes drift {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(4px, -8px) rotate(1deg); }
  50% { transform: translate(-2px, -12px) rotate(-0.5deg); }
  75% { transform: translate(6px, -4px) rotate(1.5deg); }
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes pulse-soft {
  0%, 100% { transform: scale(1); opacity: 0.08; }
  50% { transform: scale(1.05); opacity: 0.12; }
}

/* Scroll-triggered animations */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s var(--ease-out), transform 0.7s var(--ease-out);
}

.animate-on-scroll.visible {
  opacity: 1;
  transform: translateY(0);
}

.animate-on-scroll.delay-1 { transition-delay: 0.1s; }
.animate-on-scroll.delay-2 { transition-delay: 0.2s; }
.animate-on-scroll.delay-3 { transition-delay: 0.3s; }
.animate-on-scroll.delay-4 { transition-delay: 0.4s; }
`,

  // ==========================================
  // TIPOGRAFÍA
  // ==========================================
  cssTypography: `
/* ========================================
   TYPOGRAPHY
======================================== */
h1, h2, h3, h4 {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  line-height: 1.15;
  color: var(--ink);
}

h1 {
  font-size: clamp(36px, 5vw, 60px);
  letter-spacing: -1.5px;
}

h2 {
  font-size: clamp(24px, 3.5vw, 36px);
  font-weight: 600;
  letter-spacing: -0.5px;
  line-height: 1.25;
}

h3 {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
  line-height: 1.35;
}

p {
  color: var(--charcoal);
  line-height: 1.7;
  max-width: 640px;
}

/* Labels — monospace uppercase */
.label {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--accent);
}

/* Handwritten accent (Caveat) */
.handwritten {
  font-family: 'Caveat', cursive;
  font-weight: 700;
  font-size: 22px;
  line-height: 1.3;
}

.highlight { color: var(--accent); }
.dim { color: var(--grey); }
`,

  // ==========================================
  // COMPONENTES
  // ==========================================
  cssComponents: `
/* ========================================
   LAYOUT
======================================== */
.container { max-width: 1120px; margin: 0 auto; padding: 0 32px; }
.container-narrow { max-width: 720px; margin: 0 auto; padding: 0 32px; }
.section { padding: 120px 0; position: relative; }
.section-white { background: var(--white); }
.section-paper { background: var(--paper); }
.section-dark { background: var(--ink); color: var(--white); }
.section-dark h1, .section-dark h2, .section-dark h3 { color: var(--white); }
.section-dark p { color: var(--grey-light); }
.text-center { text-align: center; }

/* ========================================
   NAVIGATION — Glass effect, sticky
======================================== */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(10,10,10,0.06);
}

/* ========================================
   BUTTONS — 3D press effect
======================================== */
.btn {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 14px 32px;
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.25s var(--ease-out);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: var(--accent);
  color: var(--white);
  box-shadow: 0 4px 0 var(--accent-dark), 0 6px 12px rgba(0,0,0,0.15);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--accent-dark), 0 10px 20px rgba(0,0,0,0.2);
}

.btn-primary:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--accent-dark);
}

.btn-secondary {
  background: transparent;
  color: var(--ink);
  border: var(--border-medium);
}

.btn-secondary:hover {
  border-color: var(--ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

/* ========================================
   CARDS — Glass + solid variants
======================================== */
.card {
  background: var(--white);
  border: var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 32px;
  transition: all 0.35s var(--ease-out);
  box-shadow: var(--shadow-sm);
}

.card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 12px 40px rgba(0,0,0,0.1);
}

.card-glass {
  background: var(--gradient-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: var(--radius-lg);
  padding: 36px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6);
  transition: all 0.4s var(--ease-out);
}

.card-glass:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 16px 48px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8);
}

/* ========================================
   STATS — Counter animation
======================================== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  text-align: center;
}

.stat-number {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 48px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
  margin-bottom: 8px;
}

/* ========================================
   PROCESS STEPS — with line connector
======================================== */
.steps { display: flex; flex-direction: column; gap: 48px; }

.step {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 24px;
  align-items: start;
  position: relative;
}

.step-number {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 48px;
  font-weight: 700;
  color: var(--accent);
  opacity: 0.2;
  line-height: 1;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 29px;
  top: 50px;
  bottom: -30px;
  width: 1px;
  border-left: 2px dotted rgba(var(--accent-rgb), 0.15);
}

/* ========================================
   GRIDS
======================================== */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.grid-auto { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }

/* ========================================
   MARQUEE
======================================== */
.marquee-bar {
  overflow: hidden;
  white-space: nowrap;
  background: var(--ink);
  color: var(--accent);
  padding: 14px 0;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.marquee-track {
  display: inline-block;
  animation: marquee 30s linear infinite;
}

.marquee-track span { margin-right: 48px; }

/* ========================================
   FOOTER
======================================== */
.footer {
  padding: 56px 32px;
  text-align: center;
  border-top: 1px dotted rgba(10,10,10,0.08);
  background: var(--white);
}

.footer p { font-size: 12px; color: var(--grey); }
.footer a { color: var(--grey); }
.footer a:hover { color: var(--accent); }
`,

  // ==========================================
  // RESPONSIVE
  // ==========================================
  cssResponsive: `
/* ========================================
   RESPONSIVE
======================================== */
@media (max-width: 768px) {
  .section { padding: 64px 0; }
  .container, .container-narrow { padding: 0 24px; }
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .hero { padding: 80px 0 60px; }
  .hero-ctas { flex-direction: column; align-items: stretch; }
  .stat-grid { grid-template-columns: 1fr 1fr; gap: 24px; }
  .step { grid-template-columns: 40px 1fr; gap: 16px; }
  .step-number { font-size: 32px; }
  .nav-right .nav-link { display: none; }
  .nav-hamburger { display: flex; }
}

@media (max-width: 480px) {
  h1 { font-size: 28px; letter-spacing: -1px; }
  .stat-grid { grid-template-columns: 1fr; }
}
`,

  // ==========================================
  // JAVASCRIPT — Interacciones premium
  // ==========================================
  jsInteractions: `
/* ========================================
   PREMIUM INTERACTIONS
======================================== */
document.addEventListener('DOMContentLoaded', () => {

  // --- Scroll-triggered fade-up animations ---
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.animate-on-scroll').forEach(el => scrollObserver.observe(el));

  // --- Mouse parallax on hero ---
  document.querySelectorAll('.hero').forEach(hero => {
    const layers = hero.querySelectorAll('[data-depth]');
    if (!layers.length) return;

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;

      layers.forEach(layer => {
        const depth = parseFloat(layer.dataset.depth) || 0.05;
        layer.style.transform = \\\`translate(\\\${x * depth * 100}px, \\\${y * depth * 100}px)\\\`;
      });
    });

    hero.addEventListener('mouseleave', () => {
      layers.forEach(layer => {
        layer.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        layer.style.transform = 'translate(0, 0)';
        setTimeout(() => { layer.style.transition = ''; }, 500);
      });
    });
  });

  // --- Counter animation for stats ---
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const duration = 1800;
        const start = performance.now();

        const animate = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * ease) + suffix;
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        counterObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterObs.observe(c));
  }

  // --- Card tilt on hover ---
  document.querySelectorAll('.card, .card-glass').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -2;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 2;
      card.style.transform = \\\`translateY(-6px) scale(1.01) perspective(1000px) rotateX(\\\${rotateX}deg) rotateY(\\\${rotateY}deg)\\\`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      card.style.transform = '';
      setTimeout(() => { card.style.transition = ''; }, 500);
    });
  });

  // --- FAQ accordion ---
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // --- Mobile nav toggle ---
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileNav = document.querySelector('.nav-mobile');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
  }

  // --- Smooth anchor scrolling ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
      }
    });
  });
});
`,

  // ==========================================
  // GOOGLE FONTS LINK
  // ==========================================
  fontsLink: `<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">`,

  // ==========================================
  // SECCIONES TIPO (Plantillas HTML)
  // ==========================================
  sectionTemplates: {
    hero: `
<!-- HERO -->
<section class="hero section-paper">
  <div class="hero-content container-narrow" style="text-align:center">
    <span class="label animate-on-scroll">[ETIQUETA]</span>
    <h1 class="animate-on-scroll delay-1">[HEADLINE con <span class="highlight">palabra clave</span>]</h1>
    <p class="animate-on-scroll delay-2" style="margin:0 auto 36px;max-width:660px">[Subtítulo persuasivo que amplía el headline]</p>
    <div class="animate-on-scroll delay-3" style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
      <a href="#contacto" class="btn btn-primary">[CTA Principal]</a>
      <a href="#proceso" class="btn btn-secondary">[CTA Secundario]</a>
    </div>
  </div>
</section>`,

    stats: `
<!-- STATS -->
<section class="section section-dark">
  <div class="container">
    <div class="text-center animate-on-scroll" style="margin-bottom:56px">
      <span class="label">[LABEL]</span>
      <h2 style="margin-top:16px">[Título sección]</h2>
    </div>
    <div class="stat-grid animate-on-scroll delay-1">
      <div>
        <div class="stat-number" data-count="[N]" data-suffix="[%/x/+]">0</div>
        <p style="font-size:14px;color:rgba(255,255,255,0.75)">[Descripción del stat]</p>
      </div>
      <!-- Repetir para más stats -->
    </div>
  </div>
</section>`,

    features: `
<!-- FEATURES — Grid de cards glass -->
<section class="section section-white">
  <div class="container">
    <div class="text-center animate-on-scroll" style="margin-bottom:56px">
      <h2>[Título]</h2>
    </div>
    <div class="grid-2">
      <div class="card-glass animate-on-scroll delay-1">
        <h3 style="margin-bottom:12px">[Feature]</h3>
        <p>[Descripción]</p>
      </div>
      <!-- Más cards -->
    </div>
  </div>
</section>`,

    process: `
<!-- PROCESO — Steps con línea conectora -->
<section class="section section-paper">
  <div class="container">
    <div class="text-center animate-on-scroll" style="margin-bottom:64px">
      <h2>[Título]</h2>
    </div>
    <div class="steps container-narrow" style="padding:0">
      <div class="step animate-on-scroll delay-1">
        <div class="step-number">01</div>
        <div>
          <h3>[Paso 1]</h3>
          <p>[Descripción]</p>
        </div>
      </div>
      <!-- Más pasos -->
    </div>
  </div>
</section>`,

    cta: `
<!-- CTA FINAL -->
<section style="padding:40px 24px">
  <div style="max-width:1100px;margin:0 auto;background:var(--accent);border-radius:var(--radius-lg);padding:80px 64px;position:relative;overflow:hidden;text-align:center">
    <div style="position:absolute;top:-60px;right:-60px;width:280px;height:280px;border:3px solid rgba(255,255,255,0.15);border-radius:50%"></div>
    <span class="label" style="color:rgba(255,255,255,0.7)">[Pre-título]</span>
    <h2 style="margin-top:16px;color:var(--white)">[CTA headline]</h2>
    <p style="margin:16px auto 32px;color:rgba(255,255,255,0.8);max-width:480px">[Descripción]</p>
    <a href="#" class="btn" style="background:var(--white);color:var(--accent);box-shadow:0 4px 0 rgba(0,0,0,0.15)">[Botón]</a>
  </div>
</section>`
  }
};

module.exports = { DESIGN_REFERENCE };
