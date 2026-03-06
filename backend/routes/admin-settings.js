/**
 * Admin Settings - Configuración de la plataforma
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { pool } = require('../db');

// Todas las rutas requieren auth + admin
router.use(requireAuth);
router.use(requireAdmin);

/**
 * Obtener configuración actual
 */
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM platform_settings WHERE id = 'global'"
    );

    if (result.rows.length === 0) {
      return res.json({
        settings: {
          openrouter_api_key: process.env.OPENROUTER_API_KEY || '',
          default_model: 'anthropic/claude-sonnet-4',
          model_strategy: {},
          cost_alert_threshold: 100.0,
          max_daily_cost: 500.0,
          auto_pause_expensive_companies: true
        }
      });
    }

    const settings = result.rows[0];
    
    // Parsear model_strategy si es string
    if (typeof settings.model_strategy === 'string') {
      settings.model_strategy = JSON.parse(settings.model_strategy);
    }

    // Ofuscar API key (solo mostrar últimos 4 chars)
    if (settings.openrouter_api_key) {
      const key = settings.openrouter_api_key;
      settings.openrouter_api_key_masked = '***...' + key.slice(-4);
    }

    res.json({ settings });

  } catch (error) {
    console.error('Error obteniendo settings:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Actualizar configuración
 */
router.post('/settings', async (req, res) => {
  try {
    const {
      openrouter_api_key,
      default_model,
      model_strategy,
      cost_alert_threshold,
      max_daily_cost,
      auto_pause_expensive_companies
    } = req.body;

    // Validar model_strategy
    let strategyJson = model_strategy;
    if (typeof model_strategy === 'object') {
      strategyJson = JSON.stringify(model_strategy);
    }

    await pool.query(
      `INSERT INTO platform_settings (
        id, openrouter_api_key, default_model, model_strategy,
        cost_alert_threshold, max_daily_cost, auto_pause_expensive_companies,
        updated_by
      ) VALUES ('global', $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT(id) DO UPDATE SET
        openrouter_api_key = COALESCE($8, openrouter_api_key),
        default_model = COALESCE($9, default_model),
        model_strategy = COALESCE($10, model_strategy),
        cost_alert_threshold = COALESCE($11, cost_alert_threshold),
        max_daily_cost = COALESCE($12, max_daily_cost),
        auto_pause_expensive_companies = COALESCE($13, auto_pause_expensive_companies),
        updated_by = $14,
        updated_at = NOW()`,
      [
        openrouter_api_key, default_model, strategyJson,
        cost_alert_threshold, max_daily_cost, auto_pause_expensive_companies ? 1 : 0,
        req.user.id,
        openrouter_api_key, default_model, strategyJson,
        cost_alert_threshold, max_daily_cost, auto_pause_expensive_companies ? 1 : 0,
        req.user.id
      ]
    );

    // Log audit
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, details)
       VALUES ($1, 'settings_update', 'platform', $2)`,
      [req.user.id, JSON.stringify({ updated_fields: Object.keys(req.body) })]
    );

    res.json({ 
      success: true,
      message: 'Configuración actualizada' 
    });

  } catch (error) {
    console.error('Error actualizando settings:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ver costos en tiempo real
 */
router.get('/costs/realtime', async (req, res) => {
  try {
    const period = req.query.period || 'today'; // today, week, month

    let dateFilter = "date(recorded_at) = date('now')";
    if (period === 'week') {
      dateFilter = "recorded_at > datetime('now', '-7 days')";
    } else if (period === 'month') {
      dateFilter = "recorded_at > datetime('now', '-30 days')";
    }

    // Costos totales
    const totalResult = await pool.query(
      `SELECT 
        SUM(estimated_cost) as total_cost,
        SUM(tokens_used) as total_tokens,
        COUNT(DISTINCT company_id) as companies_count
       FROM llm_usage
       WHERE ${dateFilter}`
    );

    // Por modelo
    const byModelResult = await pool.query(
      `SELECT 
        model,
        SUM(estimated_cost) as cost,
        SUM(tokens_used) as tokens,
        COUNT(*) as calls
       FROM llm_usage
       WHERE ${dateFilter}
       GROUP BY model
       ORDER BY cost DESC`
    );

    // Top empresas más caras
    const topCompaniesResult = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.subdomain,
        SUM(l.estimated_cost) as cost,
        SUM(l.tokens_used) as tokens,
        COUNT(l.id) as calls
       FROM llm_usage l
       JOIN companies c ON l.company_id = c.id
       WHERE ${dateFilter}
       GROUP BY c.id, c.name, c.subdomain
       ORDER BY cost DESC
       LIMIT 10`
    );

    // Evolución por hora (hoy)
    const evolutionResult = await pool.query(
      `SELECT 
        strftime('%H:00', recorded_at) as hour,
        SUM(estimated_cost) as cost,
        COUNT(*) as calls
       FROM llm_usage
       WHERE date(recorded_at) = date('now')
       GROUP BY strftime('%H', recorded_at)
       ORDER BY hour`
    );

    res.json({
      period,
      total: {
        cost: parseFloat(totalResult.rows[0]?.total_cost || 0),
        tokens: parseInt(totalResult.rows[0]?.total_tokens || 0),
        companies: parseInt(totalResult.rows[0]?.companies_count || 0)
      },
      byModel: byModelResult.rows.map(r => ({
        model: r.model,
        cost: parseFloat(r.cost),
        tokens: parseInt(r.tokens),
        calls: parseInt(r.calls)
      })),
      topCompanies: topCompaniesResult.rows.map(r => ({
        id: r.id,
        name: r.name,
        subdomain: r.subdomain,
        cost: parseFloat(r.cost),
        tokens: parseInt(r.tokens),
        calls: parseInt(r.calls)
      })),
      evolution: evolutionResult.rows.map(r => ({
        hour: r.hour,
        cost: parseFloat(r.cost),
        calls: parseInt(r.calls)
      }))
    });

  } catch (error) {
    console.error('Error obteniendo costos realtime:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Alertas de costos
 */
router.get('/costs/alerts', async (req, res) => {
  try {
    // Obtener threshold
    const settingsResult = await pool.query(
      "SELECT cost_alert_threshold, max_daily_cost FROM platform_settings WHERE id = 'global'"
    );
    
    const threshold = settingsResult.rows[0]?.cost_alert_threshold || 100;
    const maxCost = settingsResult.rows[0]?.max_daily_cost || 500;

    // Costo de hoy
    const todayResult = await pool.query(
      `SELECT SUM(estimated_cost) as cost
       FROM llm_usage
       WHERE date(recorded_at) = date('now')`
    );

    const todayCost = parseFloat(todayResult.rows[0]?.cost || 0);

    // Empresas que exceden su límite
    const expensiveResult = await pool.query(
      `SELECT 
        c.id,
        c.name,
        SUM(l.estimated_cost) as cost,
        cs.cost_limit_daily as limit
       FROM llm_usage l
       JOIN companies c ON l.company_id = c.id
       LEFT JOIN company_settings cs ON c.id = cs.company_id
       WHERE date(l.recorded_at) = date('now')
       GROUP BY c.id, c.name, cs.cost_limit_daily
       HAVING cost > COALESCE(cs.cost_limit_daily, 10.0)
       ORDER BY cost DESC`
    );

    const alerts = [];

    if (todayCost > threshold) {
      alerts.push({
        type: 'warning',
        level: todayCost > maxCost ? 'critical' : 'high',
        message: `Costos de hoy: $${todayCost.toFixed(2)} (límite: $${threshold})`,
        action: todayCost > maxCost ? 'Pausar nuevas tareas' : 'Monitorear'
      });
    }

    expensiveResult.rows.forEach(row => {
      alerts.push({
        type: 'company_limit',
        level: 'medium',
        message: `${row.name} ha gastado $${parseFloat(row.cost).toFixed(2)} (límite: $${parseFloat(row.limit).toFixed(2)})`,
        companyId: row.id,
        action: 'Revisar uso de empresa'
      });
    });

    res.json({ 
      alerts,
      todayCost,
      threshold,
      maxCost,
      status: todayCost > maxCost ? 'critical' : todayCost > threshold ? 'warning' : 'ok'
    });

  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Modelos disponibles
 */
router.get('/models', (req, res) => {
  const models = [
    {
      id: 'anthropic/claude-sonnet-4',
      name: 'Claude Sonnet 4',
      provider: 'Anthropic',
      cost: { input: 3, output: 15 },
      recommended: ['code', 'complex'],
      description: 'Más potente, mejor para código crítico'
    },
    {
      id: 'anthropic/claude-sonnet-3.5',
      name: 'Claude Sonnet 3.5',
      provider: 'Anthropic',
      cost: { input: 3, output: 15 },
      recommended: ['marketing', 'content'],
      description: 'Balance calidad/precio'
    },
    {
      id: 'anthropic/claude-haiku-3',
      name: 'Claude Haiku 3',
      provider: 'Anthropic',
      cost: { input: 0.25, output: 1.25 },
      recommended: ['email', 'twitter', 'simple'],
      description: 'Rápido y económico para tareas simples'
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI',
      cost: { input: 2.5, output: 10 },
      recommended: ['general'],
      description: 'Alternativa a Claude'
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'OpenAI',
      cost: { input: 0.15, output: 0.6 },
      recommended: ['analytics', 'simple'],
      description: 'Más barato de OpenAI'
    }
  ];

  res.json({ models });
});

module.exports = router;
