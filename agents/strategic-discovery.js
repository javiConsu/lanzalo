/**
 * Strategic Discovery System
 * 
 * CEO Agent's deep discovery mode to identify unfair advantages
 * and recommend asymmetric opportunities before building anything.
 * 
 * Inspired by: Strategic Partner GPT methodology
 */

const { callLLM } = require('./llm-client');

/**
 * Discovery questions to map user's complete situation
 * Organized in 5 categories
 */
const DISCOVERY_QUESTIONS = {
  skills_advantages: [
    {
      id: 'unique_skill',
      text: '¿Qué haces mejor que el 90% de la gente?',
      placeholder: 'Ej: Programar APIs, diseño UI, copywriting, ventas B2B...',
      type: 'textarea'
    },
    {
      id: 'industry_experience',
      text: '¿En qué industria tienes 5+ años de experiencia?',
      placeholder: 'Ej: SaaS, e-commerce, marketing, fintech, salud...',
      type: 'text'
    },
    {
      id: 'past_problems_solved',
      text: '¿Qué problema difícil resolviste antes (trabajo, vida, hobby)?',
      placeholder: 'Ej: Automaticé onboarding, reduje CAC 60%, construí sistema CRM...',
      type: 'textarea'
    },
    {
      id: 'rare_skill',
      text: '¿Qué skill específico tienes que es poco común?',
      placeholder: 'Ej: SEO técnico + Python, UX + Growth, Finanzas + ML...',
      type: 'text'
    },
    {
      id: 'insider_knowledge',
      text: '¿Tienes conocimiento insider de alguna industria?',
      placeholder: 'Ej: Sé cómo funcionan licitaciones públicas, conozco pain points de agencias...',
      type: 'textarea'
    }
  ],

  network_distribution: [
    {
      id: 'audience_size',
      text: '¿Cuántos seguidores/contactos tienes? (Twitter, LinkedIn, email list...)',
      placeholder: 'Ej: 2K Twitter, 500 LinkedIn, 300 email list',
      type: 'text'
    },
    {
      id: 'community_access',
      text: '¿Tienes acceso a alguna comunidad? (Slack, Discord, forum, asociación...)',
      placeholder: 'Ej: Admin de grupo 5K devs, miembro activo comunidad React...',
      type: 'textarea'
    },
    {
      id: 'influencer_network',
      text: '¿Conoces influencers o gente con audiencia en algún nicho?',
      placeholder: 'Ej: Amigo tiene podcast 10K, ex-jefe speaker conferencias...',
      type: 'textarea'
    },
    {
      id: 'events_conferences',
      text: '¿Participas en eventos/conferencias de algún sector?',
      placeholder: 'Ej: Voy a Web Summit, organizo meetups locales...',
      type: 'text'
    },
    {
      id: 'existing_distribution',
      text: '¿Tienes newsletter, blog, canal YouTube, o similar?',
      placeholder: 'Ej: Blog 1K visitas/mes, canal YT 500 subs...',
      type: 'text'
    }
  ],

  resources_constraints: [
    {
      id: 'investment_budget',
      text: '¿Cuánto dinero puedes invertir?',
      type: 'select',
      options: [
        { value: '0', label: '€0 (bootstrapped 100%)' },
        { value: '1000', label: '€500 - €1.000' },
        { value: '5000', label: '€1.000 - €5.000' },
        { value: '10000', label: '€5.000 - €10.000' },
        { value: '20000', label: '€10.000+' }
      ]
    },
    {
      id: 'time_weekly',
      text: '¿Cuántas horas por semana tienes disponibles?',
      type: 'select',
      options: [
        { value: '5', label: '5 horas/semana (side project)' },
        { value: '10', label: '10-15 horas/semana' },
        { value: '20', label: '20-30 horas/semana' },
        { value: '40', label: '40+ horas/semana (full-time)' }
      ]
    },
    {
      id: 'risk_tolerance',
      text: '¿Puedes arriesgar 6-12 meses sin ingresos garantizados?',
      type: 'select',
      options: [
        { value: 'no', label: 'No, necesito ingresos YA' },
        { value: 'limited', label: 'Máximo 3 meses' },
        { value: 'moderate', label: '6 meses OK' },
        { value: 'high', label: 'Sí, tengo runway 12+ meses' }
      ]
    },
    {
      id: 'cofounder',
      text: '¿Tienes co-founder o vas solo?',
      type: 'select',
      options: [
        { value: 'solo', label: 'Solo' },
        { value: 'potential', label: 'Tengo alguien en mente' },
        { value: 'yes', label: 'Sí, tengo co-founder confirmado' }
      ]
    },
    {
      id: 'location',
      text: '¿Dónde vives?',
      placeholder: 'Ej: Madrid, Barcelona, remoto en pueblo, LATAM...',
      type: 'text'
    }
  ],

  past_experience: [
    {
      id: 'previous_launches',
      text: '¿Lanzaste algo antes? ¿Qué pasó?',
      placeholder: 'Ej: SaaS llegó a €2K MRR pero abandoné, app mobile 500 descargas...',
      type: 'textarea'
    },
    {
      id: 'failures_lessons',
      text: '¿Qué fracasos tuviste que te enseñaron algo importante?',
      placeholder: 'Ej: Construí 6 meses sin validar, gasté €5K en ads sin product-market fit...',
      type: 'textarea'
    },
    {
      id: 'closest_success',
      text: '¿Qué es lo más cercano que llegaste a hacer dinero online?',
      placeholder: 'Ej: Freelance €3K/mes, vendí curso €500, affiliate €200/mes...',
      type: 'textarea'
    },
    {
      id: 'current_income',
      text: '¿Tienes algún ingreso secundario ahora?',
      placeholder: 'Ej: Freelance ocasional, trabajo full-time, nada...',
      type: 'text'
    },
    {
      id: 'abandoned_projects',
      text: '¿Qué proyectos abandonaste? ¿Por qué?',
      placeholder: 'Ej: App de fitness (no sabía marketing), newsletter (sin consistencia)...',
      type: 'textarea'
    }
  ],

  goals_context: [
    {
      id: 'primary_goal',
      text: '¿Cuál es tu objetivo principal?',
      type: 'select',
      options: [
        { value: 'freedom', label: 'Libertad financiera (replace job)' },
        { value: 'scale', label: 'Construir empresa grande (€1M+ revenue)' },
        { value: 'lifestyle', label: 'Lifestyle business (€5-10K/mes)' },
        { value: 'exit', label: 'Build to sell (exit)' },
        { value: 'impact', label: 'Impacto social (cambiar industria)' }
      ]
    },
    {
      id: 'timeline',
      text: '¿En cuánto tiempo quieres ver resultados significativos?',
      type: 'select',
      options: [
        { value: '3', label: '3 meses (necesito revenue rápido)' },
        { value: '6', label: '6 meses' },
        { value: '12', label: '12 meses' },
        { value: '24', label: '24+ meses (juego largo)' }
      ]
    },
    {
      id: 'preferred_model',
      text: '¿Qué modelo de negocio te atrae más?',
      type: 'select',
      options: [
        { value: 'saas', label: 'SaaS (subscripciones)' },
        { value: 'marketplace', label: 'Marketplace (comisiones)' },
        { value: 'ecommerce', label: 'E-commerce (productos)' },
        { value: 'service', label: 'Servicio/Agencia' },
        { value: 'content', label: 'Content/Educación (cursos, ads)' },
        { value: 'open', label: 'Lo que tenga mejor probabilidad' }
      ]
    }
  ]
};

/**
 * Analyze user's discovery responses and generate strategic paths
 */
async function analyzeDiscoverySession(userId, responses) {
  console.log(`[Strategic Discovery] Analyzing session for user ${userId}...`);

  const analysisPrompt = `You are a venture capitalist and strategic advisor with 20 years experience.

Your job: Analyze this founder's profile and identify asymmetric opportunities.

FOUNDER PROFILE:
${JSON.stringify(responses, null, 2)}

ANALYZE AND RETURN STRUCTURED JSON:

{
  "unfairAdvantages": [
    {
      "advantage": "specific advantage",
      "leverage": "why this is 10x vs others",
      "examples": ["how to use it"]
    }
  ],
  "constraints": [
    {
      "constraint": "what's limiting them",
      "severity": "critical|high|medium|low",
      "mitigation": "how to work around it"
    }
  ],
  "blindSpots": [
    {
      "blindSpot": "what they're missing",
      "risk": "why this matters",
      "recommendation": "what to do"
    }
  ],
  "paths": [
    {
      "name": "Path name",
      "description": "2 sentences max",
      "whyMatch": "why this matches their profile",
      "revenueModel": "how they make money",
      "speedToRevenue": "weeks/months to first €",
      "probabilityScore": 0-100,
      "speedScore": 0-100,
      "rankingScore": "(probability × 0.6) + (speed × 0.4)",
      "firstThreeActions": [
        "action 1",
        "action 2", 
        "action 3"
      ],
      "biggestRisk": "main risk factor",
      "targetRevenue12mo": "€X - €Y realistic",
      "ceilingRevenue": "€X max potential"
    }
  ],
  "recommendation": {
    "topPath": "name of #1 ranked path",
    "reasoning": "why this one specifically",
    "plan90days": {
      "week1_2": "what to do",
      "week3_4": "what to do",
      "week5_6": "what to do",
      "week7_8": "what to do",
      "week9_12": "what to do"
    },
    "singleMostImportantAction": "one thing to do this week"
  },
  "redFlags": [
    "mistake to avoid",
    "trap based on their profile"
  ]
}

CRITICAL RULES:
1. Be brutally honest. No motivational fluff.
2. Rank paths by: (probability × 0.6) + (speed × 0.4)
3. Consider their actual constraints (time, money, network)
4. Identify opportunities they're CLOSEST to (not random ideas)
5. Flag if they're overlooking obvious advantages
6. Warn about mistakes similar profiles make
7. All revenue numbers must be REALISTIC (not optimistic BS)
8. Paths must leverage their unfair advantages
9. If they have low distribution → prioritize fast revenue paths
10. If they have audience → prioritize leverage plays

Think step by step. Then return only the JSON.`;

  const analysis = await callLLM(analysisPrompt, {
    temperature: 0.3,
    maxTokens: 4000,
    model: 'anthropic/claude-sonnet-4'
  });

  // Parse JSON from LLM response
  let parsed;
  try {
    parsed = JSON.parse(analysis);
  } catch (e) {
    // Try to extract JSON if wrapped in markdown
    const match = analysis.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      throw new Error('Failed to parse LLM analysis JSON');
    }
  }

  console.log(`[Strategic Discovery] Analysis complete. Found ${parsed.paths.length} paths.`);
  
  return parsed;
}

/**
 * Format strategic analysis for display
 */
function formatAnalysisForDisplay(analysis) {
  let output = '';

  // Unfair Advantages
  output += '🎯 **TUS UNFAIR ADVANTAGES**\n\n';
  analysis.unfairAdvantages.forEach((adv, i) => {
    output += `${i + 1}. **${adv.advantage}**\n`;
    output += `   - Por qué es leverage: ${adv.leverage}\n`;
    output += `   - Cómo usarlo: ${adv.examples.join(', ')}\n\n`;
  });

  output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Constraints
  output += '⚠️ **CONSTRAINTS (lo que te limita)**\n\n';
  analysis.constraints.forEach((con, i) => {
    const emoji = con.severity === 'critical' ? '🔴' : con.severity === 'high' ? '🟡' : '🟢';
    output += `${emoji} **${con.constraint}**\n`;
    output += `   - Cómo mitigar: ${con.mitigation}\n\n`;
  });

  output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Blind Spots
  if (analysis.blindSpots && analysis.blindSpots.length > 0) {
    output += '👁️ **BLIND SPOTS (lo que no ves)**\n\n';
    analysis.blindSpots.forEach((bs, i) => {
      output += `${i + 1}. **${bs.blindSpot}**\n`;
      output += `   - Riesgo: ${bs.risk}\n`;
      output += `   - Qué hacer: ${bs.recommendation}\n\n`;
    });
    output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  }

  // Paths (ranked)
  output += `💰 **${analysis.paths.length} CAMINOS A €1M** (ranked por probabilidad × velocidad)\n\n`;
  
  analysis.paths
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .forEach((path, i) => {
      output += `**Path ${i + 1}: ${path.name}** (Score: ${path.rankingScore.toFixed(0)}/100)\n`;
      output += `- ${path.description}\n`;
      output += `- Por qué match: ${path.whyMatch}\n`;
      output += `- Revenue model: ${path.revenueModel}\n`;
      output += `- Speed to revenue: ${path.speedToRevenue}\n`;
      output += `- Probabilidad: ${path.probabilityScore}% | Velocidad: ${path.speedScore}%\n`;
      output += `- Target 12 meses: ${path.targetRevenue12mo}\n`;
      output += `- Ceiling: ${path.ceilingRevenue}\n`;
      output += `- Primeras acciones:\n`;
      path.firstThreeActions.forEach((action, j) => {
        output += `  ${j + 1}. ${action}\n`;
      });
      output += `- Biggest risk: ${path.biggestRisk}\n\n`;
    });

  output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Recommendation
  output += `💎 **MI RECOMENDACIÓN: ${analysis.recommendation.topPath}**\n\n`;
  output += `${analysis.recommendation.reasoning}\n\n`;
  output += '**90-DAY PLAN:**\n\n';
  
  const plan = analysis.recommendation.plan90days;
  output += `**Semanas 1-2:** ${plan.week1_2}\n\n`;
  output += `**Semanas 3-4:** ${plan.week3_4}\n\n`;
  output += `**Semanas 5-6:** ${plan.week5_6}\n\n`;
  output += `**Semanas 7-8:** ${plan.week7_8}\n\n`;
  output += `**Semanas 9-12:** ${plan.week9_12}\n\n`;

  output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Red Flags
  output += '🚨 **RED FLAGS (NO HAGAS ESTO)**\n\n';
  analysis.redFlags.forEach((flag, i) => {
    output += `❌ ${flag}\n`;
  });

  output += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Single most important action
  output += '🎯 **ACCIÓN MÁS IMPORTANTE ESTA SEMANA:**\n\n';
  output += `**${analysis.recommendation.singleMostImportantAction}**\n\n`;
  output += 'Si haces solo una cosa, hazla.\n';

  return output;
}

/**
 * Get all discovery questions (flattened)
 */
function getAllQuestions() {
  const all = [];
  
  Object.keys(DISCOVERY_QUESTIONS).forEach(category => {
    DISCOVERY_QUESTIONS[category].forEach(q => {
      all.push({
        ...q,
        category
      });
    });
  });

  return all;
}

/**
 * Get questions by category
 */
function getQuestionsByCategory(category) {
  return DISCOVERY_QUESTIONS[category] || [];
}

module.exports = {
  DISCOVERY_QUESTIONS,
  analyzeDiscoverySession,
  formatAnalysisForDisplay,
  getAllQuestions,
  getQuestionsByCategory
};
