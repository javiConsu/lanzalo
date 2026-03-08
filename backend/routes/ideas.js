/**
 * Ideas API v2 — Endpoints para ideas descubiertas
 * 
 * Tabs:
 *   - "para_ti":    Ideas related to user's current business (industry, audience)
 *   - "intereses":  Ideas matching user's aboutMe/lookingFor/survey interests
 *   - "descubre":   Everything else (discover new business opportunities)
 * 
 * Paywall:
 *   - Free users: see 3 ideas (1 per tab), rest locked (show score only)
 *   - Pro/Trial: see all ideas fully
 */

const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { pool } = require('../db');
const { callLLM } = require('../llm');
const crypto = require('crypto');

/* ─── Helper: Get user context for tab filtering ─── */
async function getUserContext(userId) {
  try {
    const userRes = await pool.query(
      'SELECT id, email, name, plan, subscription_tier, survey_data FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) return null;

    const surveyData = typeof user.survey_data === 'string' 
      ? JSON.parse(user.survey_data) 
      : (user.survey_data || {});

    // Get user's companies for "para_ti" tab
    const companiesRes = await pool.query(
      'SELECT id, name, description, industry, target_audience FROM companies WHERE user_id = $1',
      [userId]
    );

    const isPro = user.plan === 'pro' || user.subscription_tier === 'pro' || user.plan === 'trial';

    return {
      user,
      surveyData,
      companies: companiesRes.rows,
      isPro,
      aboutMe: surveyData.aboutMe || '',
      lookingFor: surveyData.lookingFor || '',
      interests: surveyData.answers?.interests || surveyData.answers?.primary_motivation || '',
      industries: companiesRes.rows.map(c => c.industry).filter(Boolean),
      audiences: companiesRes.rows.map(c => c.target_audience).filter(Boolean)
    };
  } catch (e) {
    console.error('getUserContext error:', e.message);
    return null;
  }
}

/* ─── Helper: Classify idea into tab ─── */
function classifyIdea(idea, ctx) {
  if (!ctx) return 'descubre';

  const titleLower = (idea.title || '').toLowerCase();
  const problemLower = (idea.problem || '').toLowerCase();
  const catLower = (idea.category || '').toLowerCase();
  const audienceLower = (idea.target_audience || '').toLowerCase();

  // "Para tu negocio" — matches user's companies' industry/audience
  for (const industry of ctx.industries) {
    if (industry && (catLower.includes(industry.toLowerCase()) || 
        titleLower.includes(industry.toLowerCase()) ||
        problemLower.includes(industry.toLowerCase()))) {
      return 'para_ti';
    }
  }
  for (const audience of ctx.audiences) {
    if (audience && audienceLower.includes(audience.toLowerCase().substring(0, 15))) {
      return 'para_ti';
    }
  }

  // "Tus intereses" — matches aboutMe, lookingFor, interests
  const interestKeywords = [ctx.aboutMe, ctx.lookingFor, ctx.interests]
    .join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 4);
  
  for (const keyword of interestKeywords) {
    if (titleLower.includes(keyword) || problemLower.includes(keyword) || audienceLower.includes(keyword)) {
      return 'intereses';
    }
  }

  return 'descubre';
}

/* ─────────────────────────────────────────────────────────── */
/*  GET /api/ideas — Main ideas endpoint with tabs + paywall  */
/* ─────────────────────────────────────────────────────────── */
router.get('/ideas', optionalAuth, async (req, res) => {
  try {
    const { tab, limit = 50 } = req.query;
    const userId = req.user?.id;

    // Fetch all active ideas
    const result = await pool.query(
      `SELECT * FROM discovered_ideas 
       WHERE is_active = true 
       ORDER BY score DESC, discovered_at DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    let ideas = result.rows;

    // Get user context for tab classification + paywall
    const ctx = userId ? await getUserContext(userId) : null;

    // Get user's dismissed ideas
    let dismissedIds = new Set();
    if (userId) {
      const dismissed = await pool.query(
        "SELECT idea_id FROM user_idea_interactions WHERE user_id = $1 AND action = 'dismiss'",
        [userId]
      );
      dismissedIds = new Set(dismissed.rows.map(r => r.idea_id));
    }

    // Filter out dismissed
    ideas = ideas.filter(i => !dismissedIds.has(i.id));

    // Classify into tabs
    const classified = { para_ti: [], intereses: [], descubre: [] };
    for (const idea of ideas) {
      const tabName = classifyIdea(idea, ctx);
      classified[tabName].push({ ...idea, tab: tabName });
    }

    // If a specific tab requested, return only that
    let returnIdeas;
    if (tab && classified[tab]) {
      returnIdeas = classified[tab];
    } else {
      // Return all, ordered by tab priority then score
      returnIdeas = [
        ...classified.para_ti,
        ...classified.intereses,
        ...classified.descubre
      ];
    }

    // Paywall: free users see 3 unlocked (1 per tab), rest are locked
    const isFree = !ctx?.isPro;
    if (isFree && userId) {
      // Get user's unlocked ideas
      const unlocked = await pool.query(
        "SELECT idea_id FROM user_idea_interactions WHERE user_id = $1 AND action = 'unlock'",
        [userId]
      );
      const unlockedIds = new Set(unlocked.rows.map(r => r.idea_id));

      // 1 free idea per tab
      const freeIds = new Set();
      for (const tabName of ['para_ti', 'intereses', 'descubre']) {
        if (classified[tabName][0]) {
          freeIds.add(classified[tabName][0].id);
        }
      }

      returnIdeas = returnIdeas.map(idea => {
        const isUnlocked = freeIds.has(idea.id) || unlockedIds.has(idea.id);
        if (isUnlocked) return idea;

        // Locked: only show score, category, source, difficulty
        return {
          id: idea.id,
          score: idea.score,
          category: idea.category,
          source: idea.source,
          difficulty: idea.difficulty,
          potential_revenue: idea.potential_revenue,
          discovered_at: idea.discovered_at,
          tab: idea.tab,
          locked: true
          // title, problem, evidence, target_audience → hidden
        };
      });
    }

    // Tab counts
    const counts = {
      para_ti: classified.para_ti.length,
      intereses: classified.intereses.length,
      descubre: classified.descubre.length,
      total: ideas.length
    };

    res.json({ ideas: returnIdeas, counts, isFree });

  } catch (error) {
    console.error('Error obteniendo ideas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ─────────────────────────────────────────────────────── */
/*  GET /api/ideas/:id — Single idea with analysis        */
/* ─────────────────────────────────────────────────────── */
router.get('/ideas/:ideaId', optionalAuth, async (req, res) => {
  try {
    const { ideaId } = req.params;

    const result = await pool.query(
      'SELECT * FROM discovered_ideas WHERE id = $1',
      [ideaId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Idea no encontrada' });
    }

    const idea = result.rows[0];

    // Get analysis if exists
    const analysisRes = await pool.query(
      'SELECT * FROM idea_analyses WHERE idea_id = $1',
      [ideaId]
    );

    res.json({
      idea,
      analysis: analysisRes.rows[0] || null
    });
  } catch (error) {
    console.error('Error obteniendo idea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ─────────────────────────────────────────────────────── */
/*  POST /api/ideas/:id/interact — dismiss/save/unlock    */
/* ─────────────────────────────────────────────────────── */
router.post('/ideas/:ideaId/interact', requireAuth, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { action } = req.body; // 'dismiss' | 'save' | 'unlock'

    if (!['dismiss', 'save', 'unlock'].includes(action)) {
      return res.status(400).json({ error: 'Acción no válida' });
    }

    await pool.query(
      `INSERT INTO user_idea_interactions (user_id, idea_id, action)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, idea_id, action) DO NOTHING`,
      [req.user.id, ideaId, action]
    );

    res.json({ success: true, action });
  } catch (error) {
    console.error('Error en interacción:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ────────────────────────────────────────────────────────── */
/*  GET /api/ideas/:id/analysis — Get or generate analysis   */
/* ────────────────────────────────────────────────────────── */
router.get('/ideas/:ideaId/analysis', optionalAuth, async (req, res) => {
  try {
    const { ideaId } = req.params;

    // Check if analysis exists
    const existing = await pool.query(
      'SELECT * FROM idea_analyses WHERE idea_id = $1',
      [ideaId]
    );

    if (existing.rows[0]) {
      return res.json({ analysis: existing.rows[0] });
    }

    // Get the idea
    const ideaRes = await pool.query(
      'SELECT * FROM discovered_ideas WHERE id = $1',
      [ideaId]
    );
    if (ideaRes.rows.length === 0) {
      return res.status(404).json({ error: 'Idea no encontrada' });
    }

    const idea = ideaRes.rows[0];

    // Generate analysis with LLM
    const analysis = await generateIdeaAnalysis(idea);
    if (!analysis) {
      return res.status(500).json({ error: 'Error generando análisis' });
    }

    // Save to cache
    await pool.query(
      `INSERT INTO idea_analyses (idea_id, why_it_works, market_size, competition_level, time_to_mvp, monetization_strategy, risk_factors, metrics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (idea_id) DO UPDATE SET 
         why_it_works = EXCLUDED.why_it_works,
         market_size = EXCLUDED.market_size,
         competition_level = EXCLUDED.competition_level,
         time_to_mvp = EXCLUDED.time_to_mvp,
         monetization_strategy = EXCLUDED.monetization_strategy,
         risk_factors = EXCLUDED.risk_factors,
         metrics = EXCLUDED.metrics,
         generated_at = NOW()`,
      [
        idea.id,
        analysis.why_it_works,
        analysis.market_size,
        analysis.competition_level,
        analysis.time_to_mvp,
        analysis.monetization_strategy,
        analysis.risk_factors,
        JSON.stringify(analysis.metrics || {})
      ]
    );

    await pool.query(
      'UPDATE discovered_ideas SET analysis_generated = true WHERE id = $1',
      [idea.id]
    );

    res.json({ analysis });
  } catch (error) {
    console.error('Error en análisis:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ─── LLM: Generate idea analysis ─── */
async function generateIdeaAnalysis(idea) {
  const prompt = `Analiza esta oportunidad de negocio y da un informe detallado.

IDEA:
- Título: ${idea.title}
- Problema: ${idea.problem}
- Audiencia: ${idea.target_audience}
- Evidencia: ${idea.evidence}
- Fuente: ${idea.source}
- Dificultad: ${idea.difficulty}
- Revenue potencial: ${idea.potential_revenue}
- Categoría: ${idea.category}
- Score: ${idea.score}/100

GENERA un análisis en JSON con esta estructura EXACTA:
{
  "why_it_works": "3-5 razones concretas de por qué esta idea tiene potencial real. Basado en datos, no en opiniones. Incluye métricas cuando sea posible.",
  "market_size": "Estimación del TAM/SAM/SOM en español. Ej: 'TAM: $2.1B global. SAM: $340M mercado hispano. SOM: $8M primer año si captures 2.3% del SAM'",
  "competition_level": "baja|media|alta",
  "time_to_mvp": "Estimación realista. Ej: '3-5 semanas para un MVP funcional con landing + waitlist + core feature'",
  "monetization_strategy": "2-3 estrategias concretas de monetización con precios sugeridos",
  "risk_factors": "2-3 riesgos principales y cómo mitigarlos",
  "metrics": {
    "demand_signals": "Número o descripción de señales de demanda encontradas",
    "monthly_searches": "Estimación de búsquedas mensuales relacionadas",
    "growth_trend": "Tendencia: creciente/estable/decreciente",
    "competition_count": "Número estimado de competidores directos",
    "entry_barrier": "baja/media/alta"
  }
}

RESPONDE SOLO EN JSON VÁLIDO. Sin texto antes ni después. Todo en español.`;

  try {
    const response = await callLLM(prompt, {
      taskType: 'research',
      temperature: 0.4,
      maxTokens: 2000
    });

    let content = response.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];

    return JSON.parse(content);
  } catch (error) {
    console.error('[Ideas] Error generating analysis:', error.message);
    return null;
  }
}

/* ─────────────────────────────────────────────────────── */
/*  POST /api/ideas/:id/launch — Launch idea as company   */
/* ─────────────────────────────────────────────────────── */
router.post('/ideas/:ideaId/launch', requireAuth, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { customizations } = req.body;

    const ideaResult = await pool.query(
      'SELECT * FROM discovered_ideas WHERE id = $1',
      [ideaId]
    );
    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Idea no encontrada' });
    }

    const idea = ideaResult.rows[0];
    const companyId = crypto.randomUUID();
    const subdomain = generateSubdomain(idea.title);

    await pool.query(
      `INSERT INTO companies (
        id, user_id, name, description, industry, subdomain, 
        target_audience, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())`,
      [
        companyId,
        req.user.id,
        customizations?.name || idea.title,
        idea.problem,
        idea.category,
        subdomain,
        idea.target_audience
      ]
    );

    // Track launch
    await pool.query(
      'UPDATE discovered_ideas SET times_launched = COALESCE(times_launched, 0) + 1 WHERE id = $1',
      [ideaId]
    );

    // Track interaction
    await pool.query(
      `INSERT INTO user_idea_interactions (user_id, idea_id, action)
       VALUES ($1, $2, 'unlock')
       ON CONFLICT (user_id, idea_id, action) DO NOTHING`,
      [req.user.id, ideaId]
    );

    // Create task for Code Agent
    const taskId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO tasks (
        id, company_id, created_by, assigned_to, title, description, 
        tag, priority, status
      ) VALUES ($1, $2, $3, 'code-agent', $4, $5, 'engineering', 'high', 'todo')`,
      [
        taskId,
        companyId,
        req.user.id,
        'Generar landing page inicial',
        `Crear landing page para: ${idea.title}\n\nProblema: ${idea.problem}\nAudiencia: ${idea.target_audience}`
      ]
    );

    res.json({
      success: true,
      company: {
        id: companyId,
        name: idea.title,
        subdomain: `${subdomain}.lanzalo.app`
      },
      message: 'Empresa creada. Code Agent está generando tu landing page.'
    });
  } catch (error) {
    console.error('Error lanzando idea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ─── Stats (admin) ─── */
router.get('/ideas/stats', requireAuth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Solo admin' });
    }

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        AVG(score) as avg_score,
        SUM(COALESCE(times_launched, 0)) as total_launches,
        category,
        COUNT(*) as count_by_category
      FROM discovered_ideas
      WHERE is_active = true
      GROUP BY category
    `);

    res.json({ stats: stats.rows });
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ─── Helper ─── */
function generateSubdomain(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30)
    + '-' + Math.random().toString(36).substring(2, 6);
}

module.exports = router;
