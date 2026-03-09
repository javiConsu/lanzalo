/**
 * Marketing Content Routes — Gamma API integration + content management
 * 
 * POST /api/companies/:companyId/content/generate      — Generate content with Gamma
 * GET  /api/companies/:companyId/content/status/:genId  — Poll Gamma generation status
 * GET  /api/companies/:companyId/content                — List content pieces
 * POST /api/companies/:companyId/ads                    — Create ad campaign strategy
 * GET  /api/companies/:companyId/ads                    — List ad campaigns
 * PATCH /api/companies/:companyId/ads/:adId             — Update ad campaign metrics
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { callLLM } = require('../llm');
const gamma = require('../services/gamma-service');

// ─── Auth middleware ───────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.userId = decoded.userId || decoded.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

async function requireCompanyAccess(req, res, next) {
  const { companyId } = req.params;
  const check = await pool.query(
    'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
    [companyId, req.userId]
  );
  if (check.rows.length === 0) return res.status(403).json({ error: 'Sin acceso a esta empresa' });
  req.company = check.rows[0];
  next();
}

// ═══════════════════════════════════════════════════
// GAMMA CONTENT GENERATION
// ═══════════════════════════════════════════════════

/**
 * POST /api/companies/:companyId/content/generate
 * Generate content using Gamma API
 * Body: { type, title, content, format?, tone?, audience?, numCards?, exportAs? }
 * type: 'presentation' | 'carousel' | 'document' | 'webpage'
 */
router.post('/companies/:companyId/content/generate', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    if (!gamma.enabled) {
      return res.status(400).json({ 
        error: 'Gamma API no configurada',
        message: 'Pide a tu Co-Founder que configure la API key de Gamma para generar contenido visual.'
      });
    }

    const { companyId } = req.params;
    const { type, title, content, tone, audience, numCards, exportAs, platform } = req.body;

    if (!content && !title) {
      return res.status(400).json({ error: 'Se requiere título o contenido' });
    }

    const inputText = content || title;
    let generation;

    // Route to appropriate Gamma generator
    switch (type) {
      case 'presentation':
        generation = await gamma.generatePresentation(inputText, {
          numCards: numCards || 10,
          tone, audience, exportAs,
          additionalInstructions: title ? `Título: ${title}` : undefined,
        });
        break;
      case 'carousel':
        generation = await gamma.generateCarousel(inputText, {
          numCards: numCards || 8,
          tone, audience,
          dimensions: platform === 'instagram' ? '4x5' : '4x5',
        });
        break;
      case 'document':
        generation = await gamma.generateDocument(inputText, {
          numCards: numCards || 6,
          tone, audience, exportAs,
        });
        break;
      case 'webpage':
        generation = await gamma.generateWebpage(inputText, {
          numCards: numCards || 5,
          tone, audience,
        });
        break;
      default:
        generation = await gamma.generatePresentation(inputText, { tone, audience });
    }

    // Save content piece with pending status
    const piece = await pool.query(
      `INSERT INTO content_pieces 
       (company_id, type, format, title, body, gamma_generation_id, gamma_status, status, platform, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'generating', $7, 'user')
       RETURNING *`,
      [companyId, type || 'presentation', type, title || 'Sin título', inputText, 
       generation.generationId, platform]
    );

    // Track Gamma usage
    await pool.query(
      `INSERT INTO gamma_usage (company_id, generation_id, content_piece_id, format, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [companyId, generation.generationId, piece.rows[0].id, type || 'presentation']
    );

    res.json({
      success: true,
      contentId: piece.rows[0].id,
      generationId: generation.generationId,
      message: 'Generando contenido con Gamma...'
    });

  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: error.message || 'Error generando contenido' });
  }
});

/**
 * GET /api/companies/:companyId/content/status/:generationId
 * Poll Gamma generation status
 */
router.get('/companies/:companyId/content/status/:generationId', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { generationId } = req.params;
    const status = await gamma.getGenerationStatus(generationId);

    // Update DB if completed
    if (status.status === 'completed' && status.gammaUrl) {
      await pool.query(
        `UPDATE content_pieces SET 
           gamma_status = 'completed', gamma_url = $1, status = 'ready',
           gamma_credits_used = $2, updated_at = NOW()
         WHERE gamma_generation_id = $3`,
        [status.gammaUrl, status.credits?.deducted || 0, generationId]
      );

      await pool.query(
        `UPDATE gamma_usage SET status = 'completed', gamma_url = $1, credits_deducted = $2
         WHERE generation_id = $3`,
        [status.gammaUrl, status.credits?.deducted || 0, generationId]
      );
    } else if (status.status === 'failed') {
      await pool.query(
        `UPDATE content_pieces SET gamma_status = 'failed', status = 'failed', updated_at = NOW()
         WHERE gamma_generation_id = $1`,
        [generationId]
      );
    }

    res.json(status);
  } catch (error) {
    console.error('Error checking generation status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/companies/:companyId/content
 * List content pieces
 */
router.get('/companies/:companyId/content', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type, status, limit = 50 } = req.query;

    let query = `SELECT * FROM content_pieces WHERE company_id = $1`;
    const params = [companyId];
    let idx = 2;

    if (type) { query += ` AND type = $${idx++}`; params.push(type); }
    if (status) { query += ` AND status = $${idx++}`; params.push(status); }

    query += ` ORDER BY created_at DESC LIMIT $${idx}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // Gamma credits summary
    const credits = await pool.query(
      `SELECT COALESCE(SUM(credits_deducted), 0) as total_credits, COUNT(*) as total_generations
       FROM gamma_usage WHERE company_id = $1`,
      [companyId]
    );

    res.json({
      pieces: result.rows,
      gammaCredits: {
        totalUsed: parseInt(credits.rows[0].total_credits),
        totalGenerations: parseInt(credits.rows[0].total_generations),
      }
    });
  } catch (error) {
    console.error('Error listing content:', error);
    res.status(500).json({ error: 'Error obteniendo contenido' });
  }
});

/**
 * GET /api/companies/:companyId/content/gamma-status
 * Check if Gamma API is configured
 */
router.get('/companies/:companyId/content/gamma-status', requireAuth, requireCompanyAccess, async (req, res) => {
  res.json({ 
    enabled: gamma.enabled,
    message: gamma.enabled ? 'Gamma API conectada' : 'Gamma API no configurada. Añade GAMMA_API_KEY.',
  });
});

// ═══════════════════════════════════════════════════
// ADS STRATEGIST
// ═══════════════════════════════════════════════════

/**
 * POST /api/companies/:companyId/ads/generate
 * Generate ad campaign strategy with AI
 * Body: { platform, objective, budget, audience_description }
 */
router.post('/companies/:companyId/ads/generate', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { platform, objective, budget, audience_description } = req.body;

    // Get company info
    const company = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
    if (company.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });
    const comp = company.rows[0];

    const prompt = `Eres un experto en publicidad digital (Google Ads, Meta Ads, LinkedIn Ads).

EMPRESA: "${comp.name}"
Descripción: ${comp.description || 'Sin descripción'}
Industria: ${comp.industry || 'General'}

PETICIÓN:
- Plataforma: ${platform || 'la mejor para este caso'}
- Objetivo: ${objective || 'generación de leads'}
- Presupuesto mensual: ${budget ? budget + '€' : 'no especificado (sugiere)'}
- Audiencia: ${audience_description || 'definir la ideal'}

GENERA UNA ESTRATEGIA COMPLETA:

1. Plataforma recomendada y por qué
2. Estructura de campañas (cuántas, cómo segmentar)
3. 3-5 variantes de anuncio con:
   - Headline (max 30 chars para Google, 40 para Meta)
   - Descripción
   - CTA
4. Audiencia objetivo detallada (demographics, interests, behaviors)
5. Keywords (para search ads)
6. Presupuesto diario sugerido y distribución
7. KPIs esperados (CTR, CPC, conversiones estimadas)

Responde en JSON:
{
  "campaign_name": "Nombre de la campaña",
  "platform": "google_ads|meta_ads|linkedin_ads",
  "objective": "awareness|traffic|leads|conversions",
  "target_audience": {
    "demographics": "descripción",
    "interests": ["interés1", "interés2"],
    "behaviors": ["comportamiento1"],
    "lookalike": "descripción si aplica"
  },
  "keywords": ["keyword1", "keyword2"],
  "negative_keywords": ["negativa1"],
  "ad_copies": [
    {
      "headline": "Titular del anuncio",
      "description": "Descripción del anuncio",
      "cta": "Call to action",
      "variant": "A"
    }
  ],
  "budget": {
    "daily": 10,
    "monthly": 300,
    "distribution": "descripción de cómo distribuir"
  },
  "kpis": {
    "expected_ctr": "2-4%",
    "expected_cpc": "0.50-1.20€",
    "expected_conversions_month": "30-60",
    "expected_cpa": "5-10€"
  },
  "strategy_notes": "Notas y recomendaciones adicionales"
}`;

    const response = await callLLM(prompt, { maxTokens: 2000 });
    const content = typeof response === 'string' ? response : response.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Error generando estrategia' });

    const strategy = JSON.parse(jsonMatch[0]);

    // Save to DB
    const result = await pool.query(
      `INSERT INTO ad_campaigns 
       (company_id, name, objective, platform, status, target_audience, keywords, negative_keywords,
        ad_copies, suggested_daily_budget, suggested_monthly_budget, currency, notes, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, 'EUR', $11, 'agent')
       RETURNING *`,
      [
        companyId,
        strategy.campaign_name || `Campaña ${platform || 'Ads'}`,
        strategy.objective || objective || 'leads',
        strategy.platform || platform || 'google_ads',
        JSON.stringify(strategy.target_audience || {}),
        strategy.keywords || [],
        strategy.negative_keywords || [],
        JSON.stringify(strategy.ad_copies || []),
        strategy.budget?.daily || null,
        strategy.budget?.monthly || budget || null,
        strategy.strategy_notes || '',
      ]
    );

    res.json({
      success: true,
      campaign: result.rows[0],
      strategy,
    });

  } catch (error) {
    console.error('Error generating ad strategy:', error);
    res.status(500).json({ error: error.message || 'Error generando estrategia de ads' });
  }
});

/**
 * GET /api/companies/:companyId/ads
 * List ad campaigns
 */
router.get('/companies/:companyId/ads', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await pool.query(
      `SELECT * FROM ad_campaigns WHERE company_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [companyId]
    );

    const metrics = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COALESCE(SUM(actual_spend), 0) as total_spend,
         COALESCE(SUM(impressions), 0) as total_impressions,
         COALESCE(SUM(clicks), 0) as total_clicks,
         COALESCE(SUM(conversions), 0) as total_conversions
       FROM ad_campaigns WHERE company_id = $1`,
      [companyId]
    );

    res.json({
      campaigns: result.rows,
      metrics: metrics.rows[0],
    });
  } catch (error) {
    console.error('Error listing ad campaigns:', error);
    res.status(500).json({ error: 'Error obteniendo campañas' });
  }
});

/**
 * PATCH /api/companies/:companyId/ads/:adId
 * Update ad campaign (metrics, status, spend)
 */
router.patch('/companies/:companyId/ads/:adId', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { adId } = req.params;
    const allowed = ['status', 'actual_spend', 'impressions', 'clicks', 'conversions',
                     'cost_per_click', 'cost_per_conversion', 'roas', 'notes', 'landing_page_url'];
    
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Sin campos válidos' });

    values.push(adId);
    await pool.query(
      `UPDATE ad_campaigns SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      values
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating ad campaign:', error);
    res.status(500).json({ error: 'Error actualizando campaña' });
  }
});

module.exports = router;
