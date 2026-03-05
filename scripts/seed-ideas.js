/**
 * Script para poblar DB con ideas de ejemplo
 * Útil para testing de frontend sin esperar scan de Trend Scout
 */

const { pool } = require('../backend/db');
const crypto = require('crypto');

const mockIdeas = [
  {
    title: 'Plataforma de Mentorías para Developers Junior',
    problem: 'Developers junior no encuentran mentores experimentados. Bootcamp grads buscan guía pero no saben dónde. Muchos seniors quieren ayudar pero no tienen canal.',
    target_audience: 'Developers junior, bootcamp graduates, autodidactas',
    evidence: '150+ tweets pidiendo "mentor para programar", 20+ threads en r/learnprogramming, múltiples posts en HN',
    source: 'reddit',
    category: 'marketplace',
    difficulty: 'easy',
    potential_revenue: '$2K-5K/mes',
    score: 95
  },
  {
    title: 'Herramienta de Pricing para SaaS',
    problem: 'Founders de SaaS no saben qué pricing usar. Testean manualmente perdiendo meses. No tienen data de competidores ni benchmarks.',
    target_audience: 'Founders de SaaS, product managers',
    evidence: '50+ posts en r/SaaS pidiendo ayuda con pricing, múltiples threads en Indie Hackers',
    source: 'hackernews',
    category: 'saas',
    difficulty: 'medium',
    potential_revenue: '$3K-8K/mes',
    score: 87
  },
  {
    title: 'Dashboard de KPIs para Freelancers',
    problem: 'Freelancers tienen clientes en múltiples plataformas (Upwork, Fiverr, directo) y no ven sus números consolidados. Pierden oportunidades de optimización.',
    target_audience: 'Freelancers, contractors, consultores',
    evidence: '30+ posts en r/freelance pidiendo "dashboard", varios tools construidos a medias',
    source: 'reddit',
    category: 'tool',
    difficulty: 'easy',
    potential_revenue: '$1K-3K/mes',
    score: 82
  },
  {
    title: 'Automatización de Cold Email con IA',
    problem: 'Sales teams pasan horas escribiendo emails personalizados. Herramientas actuales son genéricas. LLMs pueden personalizar a escala pero nadie lo hace bien.',
    target_audience: 'Sales teams, founders B2B, agencies',
    evidence: 'Múltiples productos en PH con tracción limitada, 40+ mentions en Twitter',
    source: 'twitter',
    category: 'saas',
    difficulty: 'medium',
    potential_revenue: '$5K-15K/mes',
    score: 88
  },
  {
    title: 'Marketplace de Templates No-Code',
    problem: 'Builders de no-code (Webflow, Framer) comparten templates en Twitter gratis. No hay marketplace curado. Compradores buscan pero no encuentran calidad.',
    target_audience: 'No-code builders, designers, entrepreneurs',
    evidence: '100+ templates compartidos semanalmente en Twitter, demanda clara',
    source: 'twitter',
    category: 'marketplace',
    difficulty: 'easy',
    potential_revenue: '$2K-6K/mes',
    score: 79
  },
  {
    title: 'Analytics Simplificado para Shopify',
    problem: 'Shopify analytics es complejo para no-técnicos. Store owners quieren ver ventas/conversión/ROI simple. Google Analytics los abruma.',
    target_audience: 'Shopify store owners, ecommerce entrepreneurs',
    evidence: '60+ posts en r/shopify pidiendo "analytics simples", apps existentes mal hechas',
    source: 'reddit',
    category: 'saas',
    difficulty: 'medium',
    potential_revenue: '$3K-10K/mes',
    score: 85
  },
  {
    title: 'Job Board para Remote Work en LATAM',
    problem: 'Empresas US/EU buscan talent LATAM pero no saben dónde. Developers LATAM quieren remote pero boards están en inglés o tienen spam.',
    target_audience: 'Developers LATAM, empresas remote-first',
    evidence: 'Demanda clara en Twitter, múltiples intentos fallidos, market grande',
    source: 'twitter',
    category: 'marketplace',
    difficulty: 'hard',
    potential_revenue: '$5K-20K/mes',
    score: 72
  },
  {
    title: 'Waitlist as a Service',
    problem: 'Founders lanzan productos y necesitan waitlist rápido. Herramientas existentes son caras o limitadas. Todos reinventan la rueda.',
    target_audience: 'Founders, product launchers, makers',
    evidence: '30+ productos en PH con "waitlist" feature pedida, tweets recurrentes',
    source: 'hackernews',
    category: 'tool',
    difficulty: 'easy',
    potential_revenue: '$1K-4K/mes',
    score: 76
  },
  {
    title: 'Screen Recording para Support Teams',
    problem: 'Support teams piden screenshots pero usuarios no saben cómo. Videos de Loom son largos. Se necesita 1-click recording de bugs.',
    target_audience: 'Support teams, SaaS companies',
    evidence: 'Múltiples herramientas construidas a medias, demanda clara en HN',
    source: 'hackernews',
    category: 'tool',
    difficulty: 'medium',
    potential_revenue: '$2K-8K/mes',
    score: 81
  },
  {
    title: 'Community Management con IA',
    problem: 'Community managers responden las mismas preguntas en Discord/Slack. IA puede responder FAQs pero no hay herramienta simple.',
    target_audience: 'Community managers, founders con Discord/Slack',
    evidence: '40+ posts en r/communitymanagement, múltiples founders pidiendo esto',
    source: 'reddit',
    category: 'saas',
    difficulty: 'hard',
    potential_revenue: '$4K-12K/mes',
    score: 74
  }
];

async function seedIdeas() {
  console.log('🌱 Seeding ideas...\n');

  for (const idea of mockIdeas) {
    const id = crypto.randomUUID();
    
    try {
      await pool.query(
        `INSERT INTO discovered_ideas (
          id, title, problem, target_audience, evidence,
          source, category, difficulty, potential_revenue, score,
          discovered_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)`,
        [
          id,
          idea.title,
          idea.problem,
          idea.target_audience,
          idea.evidence,
          idea.source,
          idea.category,
          idea.difficulty,
          idea.potential_revenue,
          idea.score
        ]
      );

      console.log(`✅ ${idea.title} (score: ${idea.score})`);
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        console.log(`⏭️  Ya existe: ${idea.title}`);
      } else {
        console.error(`❌ Error: ${idea.title}`, error.message);
      }
    }
  }

  console.log(`\n✅ Seeding completado: ${mockIdeas.length} ideas`);
}

seedIdeas().catch(console.error);
