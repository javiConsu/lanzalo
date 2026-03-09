/**
 * Rutas Admin - Solo para operadores de la plataforma
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { pool } = require('../db');
const { getAllRealCosts, getOpenRouterCosts } = require('../services/real-costs');

// Todas las rutas requieren auth + admin
router.use(requireAuth);
router.use(requireAdmin);

/**
 * Dashboard general - Overview de toda la plataforma
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Total de usuarios
    const usersResult = await pool.query(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE plan = \'pro\') as pro FROM users WHERE role != \'admin\''
    );

    // Total de empresas
    const companiesResult = await pool.query(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'live\') as live FROM companies'
    );

    // MRR (Monthly Recurring Revenue)
    const mrrResult = await pool.query(
      'SELECT COUNT(*) FILTER (WHERE plan = \'pro\') * 39 as mrr FROM users WHERE role != \'admin\''
    );

    // Costos LLM (último mes)
    const costsResult = await pool.query(
      `SELECT 
        COALESCE(SUM(estimated_cost), 0) as total_cost,
        COALESCE(SUM(tokens_used), 0) as total_tokens
       FROM llm_usage
       WHERE recorded_at > NOW() - INTERVAL '30 days'`
    );

    // Empresas más activas
    const topCompaniesResult = await pool.query(
      `SELECT 
        c.id, c.name, c.subdomain, u.email as owner_email,
        COUNT(t.id) as tasks_count,
        COALESCE(SUM(l.estimated_cost), 0) as cost
       FROM companies c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN tasks t ON c.id = t.company_id AND t.created_at > NOW() - INTERVAL '7 days'
       LEFT JOIN llm_usage l ON c.id = l.company_id AND l.recorded_at > NOW() - INTERVAL '7 days'
       GROUP BY c.id, c.name, c.subdomain, u.email
       ORDER BY tasks_count DESC
       LIMIT 10`
    );

    res.json({
      users: {
        total: parseInt(usersResult.rows[0].total),
        pro: parseInt(usersResult.rows[0].pro),
        free: parseInt(usersResult.rows[0].total) - parseInt(usersResult.rows[0].pro)
      },
      companies: {
        total: parseInt(companiesResult.rows[0].total),
        live: parseInt(companiesResult.rows[0].live)
      },
      revenue: {
        mrr: parseFloat(mrrResult.rows[0].mrr),
        currency: 'USD'
      },
      costs: {
        llm: parseFloat(costsResult.rows[0].total_cost),
        tokens: parseInt(costsResult.rows[0].total_tokens)
      },
      margin: {
        amount: parseFloat(mrrResult.rows[0].mrr) - parseFloat(costsResult.rows[0].total_cost),
        percentage: ((parseFloat(mrrResult.rows[0].mrr) - parseFloat(costsResult.rows[0].total_cost)) / parseFloat(mrrResult.rows[0].mrr) * 100).toFixed(2)
      },
      topCompanies: topCompaniesResult.rows
    });

  } catch (error) {
    console.error('Error en admin dashboard:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Listar TODAS las empresas (de todos los usuarios)
 */
router.get('/companies', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.*,
        u.email as owner_email,
        u.name as owner_name,
        u.plan as user_plan,
        COUNT(DISTINCT t.id) as tasks_count,
        COALESCE(SUM(l.estimated_cost), 0) as llm_cost
       FROM companies c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN tasks t ON c.id = t.company_id
       LEFT JOIN llm_usage l ON c.id = l.company_id
       GROUP BY c.id, u.email, u.name, u.plan
       ORDER BY c.created_at DESC`
    );

    res.json({ companies: result.rows });
  } catch (error) {
    console.error('Error listando empresas (admin):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ver detalles de cualquier empresa
 */
router.get('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const companyResult = await pool.query(
      `SELECT c.*, u.email as owner_email, u.name as owner_name
       FROM companies c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Tareas recientes
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE company_id = $1 ORDER BY created_at DESC LIMIT 50',
      [id]
    );

    // Uso LLM
    const llmResult = await pool.query(
      `SELECT 
        DATE(recorded_at) as date,
        SUM(tokens_used) as tokens,
        SUM(estimated_cost) as cost
       FROM llm_usage
       WHERE company_id = $1
       GROUP BY DATE(recorded_at)
       ORDER BY date DESC
       LIMIT 30`,
      [id]
    );

    res.json({
      company: companyResult.rows[0],
      recentTasks: tasksResult.rows,
      llmUsage: llmResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo empresa (admin):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Pausar/reactivar empresa
 */
router.post('/companies/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE companies 
       SET status = CASE 
         WHEN status = 'paused' THEN 'live'
         ELSE 'paused'
       END,
       updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Log audit
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
       VALUES ($1, 'company_toggle_status', 'company', $2)`,
      [req.user.id, id]
    );

    res.json({ company: result.rows[0] });

  } catch (error) {
    console.error('Error toggling empresa (admin):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Eliminar empresa (admin override)
 */
router.delete('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM companies WHERE id = $1', [id]);

    // Log audit
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
       VALUES ($1, 'company_delete', 'company', $2)`,
      [req.user.id, id]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Error eliminando empresa (admin):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Listar todos los usuarios
 */
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.name, u.role, u.plan, u.created_at,
        COUNT(DISTINCT c.id) as companies_count,
        COALESCE(SUM(l.estimated_cost), 0) as total_cost
       FROM users u
       LEFT JOIN companies c ON u.id = c.user_id
       LEFT JOIN llm_usage l ON c.id = l.company_id
       WHERE u.role != 'admin'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    res.json({ users: result.rows });

  } catch (error) {
    console.error('Error listando usuarios (admin):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ver costos globales LLM
 */
router.get('/costs/llm', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await pool.query(
      `SELECT 
        DATE(recorded_at) as date,
        SUM(tokens_used) as total_tokens,
        SUM(estimated_cost) as total_cost,
        COUNT(DISTINCT company_id) as companies_count
       FROM llm_usage
       WHERE recorded_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(recorded_at)
       ORDER BY date DESC`,
      []
    );

    res.json({ costs: result.rows });

  } catch (error) {
    console.error('Error obteniendo costos (admin):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Audit log
 */
router.get('/audit-log', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const result = await pool.query(
      `SELECT a.*, u.email as admin_email
       FROM admin_audit_log a
       LEFT JOIN users u ON a.admin_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ logs: result.rows });

  } catch (error) {
    console.error('Error obteniendo audit log:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * User intake insights — weekly CS agent data
 * Returns registration intake data (aboutMe, lookingFor) from recent users
 */
router.get('/insights/intake', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const result = await pool.query(
      `SELECT id, email, name, survey_data, plan, created_at
       FROM users
       WHERE role != 'admin'
         AND created_at >= NOW() - INTERVAL '1 day' * $1
         AND survey_data IS NOT NULL
       ORDER BY created_at DESC`,
      [days]
    );

    // Also get total signups in period (including those without intake)
    const totals = await pool.query(
      `SELECT 
         COUNT(*) as total_signups,
         COUNT(*) FILTER (WHERE survey_data IS NOT NULL) as with_intake,
         COUNT(*) FILTER (WHERE onboarding_completed = TRUE) as completed_onboarding
       FROM users
       WHERE role != 'admin'
         AND created_at >= NOW() - INTERVAL '1 day' * $1`,
      [days]
    );

    res.json({
      period: `last ${days} days`,
      stats: totals.rows[0],
      users: result.rows.map(u => ({
        email: u.email,
        name: u.name,
        plan: u.plan,
        intake: u.survey_data,
        createdAt: u.created_at
      }))
    });

  } catch (error) {
    console.error('Error obteniendo intake insights:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * LLM costs by model (for breakdown chart)
 */
router.get('/costs/llm/by-model', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await pool.query(
      `SELECT 
        model,
        SUM(tokens_used) as total_tokens,
        SUM(estimated_cost) as total_cost,
        COUNT(*) as call_count
       FROM llm_usage
       WHERE recorded_at > NOW() - INTERVAL '1 day' * $1
       GROUP BY model
       ORDER BY total_cost DESC`,
      [days]
    );

    res.json({ models: result.rows });
  } catch (error) {
    console.error('Error obteniendo costos por modelo:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Tasks summary (all companies)
 */
router.get('/tasks/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        status,
        COUNT(*) as count
       FROM tasks
       GROUP BY status`
    );

    const recent = await pool.query(
      `SELECT t.id, t.title, t.status, t.tag, t.priority, t.created_at, t.completed_at,
              c.name as company_name
       FROM tasks t
       LEFT JOIN companies c ON t.company_id = c.id
       ORDER BY t.created_at DESC
       LIMIT 20`
    );

    res.json({
      summary: result.rows,
      recent: recent.rows
    });
  } catch (error) {
    console.error('Error obteniendo resumen de tareas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Growth Agent reports
 */
router.get('/growth-reports', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM growth_reports
       ORDER BY created_at DESC
       LIMIT 10`
    );
    res.json({ reports: result.rows });
  } catch (error) {
    // Table might not exist yet
    res.json({ reports: [] });
  }
});

/**
 * User feedback summary
 */
router.get('/feedback/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        entity_type,
        rating,
        COUNT(*) as count
       FROM user_feedback
       GROUP BY entity_type, rating
       ORDER BY entity_type, rating`
    );

    const recent = await pool.query(
      `SELECT uf.*, c.name as company_name
       FROM user_feedback uf
       LEFT JOIN companies c ON uf.company_id = c.id
       ORDER BY uf.created_at DESC
       LIMIT 20`
    );

    res.json({
      summary: result.rows,
      recent: recent.rows
    });
  } catch (error) {
    // Table might not exist
    res.json({ summary: [], recent: [] });
  }
});

/**
 * Comprehensive live stats (single call for dashboard)
 */
router.get('/live', async (req, res) => {
  try {
    // Users
    const users = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE plan = 'pro') as pro,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_24h
       FROM users WHERE role != 'admin'`
    );

    // Companies
    const companies = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'live') as live,
        COUNT(*) FILTER (WHERE status = 'building') as building,
        COUNT(*) FILTER (WHERE status = 'paused') as paused
       FROM companies`
    );

    // MRR
    const proCount = parseInt(users.rows[0].pro);
    const mrr = proCount * 39;

    // LLM costs (30d)
    const llmCosts = await pool.query(
      `SELECT 
        COALESCE(SUM(estimated_cost), 0) as cost_30d,
        COALESCE(SUM(tokens_used), 0) as tokens_30d
       FROM llm_usage
       WHERE recorded_at > NOW() - INTERVAL '30 days'`
    );

    // LLM costs (7d)
    const llmCosts7d = await pool.query(
      `SELECT COALESCE(SUM(estimated_cost), 0) as cost_7d
       FROM llm_usage
       WHERE recorded_at > NOW() - INTERVAL '7 days'`
    );

    // LLM costs (24h)
    const llmCosts24h = await pool.query(
      `SELECT COALESCE(SUM(estimated_cost), 0) as cost_24h
       FROM llm_usage
       WHERE recorded_at > NOW() - INTERVAL '24 hours'`
    );

    // LLM by model (30d)
    const llmByModel = await pool.query(
      `SELECT model, SUM(estimated_cost) as cost, SUM(tokens_used) as tokens, COUNT(*) as calls
       FROM llm_usage
       WHERE recorded_at > NOW() - INTERVAL '30 days'
       GROUP BY model ORDER BY cost DESC`
    );

    // LLM daily trend (14d)
    const llmDaily = await pool.query(
      `SELECT DATE(recorded_at) as date, SUM(estimated_cost) as cost, SUM(tokens_used) as tokens
       FROM llm_usage
       WHERE recorded_at > NOW() - INTERVAL '14 days'
       GROUP BY DATE(recorded_at) ORDER BY date`
    );

    // Tasks
    const tasks = await pool.query(
      `SELECT status, COUNT(*) as count FROM tasks GROUP BY status`
    );

    // Recent tasks (10)
    const recentTasks = await pool.query(
      `SELECT t.id, t.title, t.status, t.tag, t.priority, t.assigned_to, t.created_at, t.completed_at,
              c.name as company_name
       FROM tasks t LEFT JOIN companies c ON t.company_id = c.id
       ORDER BY t.created_at DESC LIMIT 10`
    );

    // Recent chat messages (10)
    const recentChats = await pool.query(
      `SELECT cm.role, cm.content, cm.created_at, c.name as company_name
       FROM chat_messages cm
       LEFT JOIN companies c ON cm.company_id = c.id
       ORDER BY cm.created_at DESC LIMIT 10`
    );

    // Top companies by cost
    const topCostCompanies = await pool.query(
      `SELECT c.name, u.email as owner, SUM(l.estimated_cost) as cost, COUNT(l.id) as calls
       FROM llm_usage l
       LEFT JOIN companies c ON l.company_id = c.id
       LEFT JOIN users u ON c.user_id = u.id
       WHERE l.recorded_at > NOW() - INTERVAL '30 days'
       GROUP BY c.name, u.email
       ORDER BY cost DESC LIMIT 10`
    );

    // ─── Real costs from external APIs ───────────────────────
    const realCosts = await getAllRealCosts();
    const openrouterReal = realCosts.services.openrouter;
    const vercelReal = realCosts.services.vercel;
    const neonReal = realCosts.services.neon;
    const railwayReal = realCosts.services.railway;
    const resendReal = realCosts.services.resend;
    const instantlyReal = realCosts.services.instantly;
    const domainReal = realCosts.services.domain;

    // Use OpenRouter API for real LLM costs, DB estimates as fallback
    const llmCostReal30d = openrouterReal.usage_monthly || parseFloat(llmCosts.rows[0].cost_30d);
    const llmCostReal7d = openrouterReal.usage_weekly || parseFloat(llmCosts7d.rows[0].cost_7d);
    const llmCostReal24h = openrouterReal.usage_daily || parseFloat(llmCosts24h.rows[0].cost_24h);

    // Infrastructure costs (real where available)
    const infraCosts = {
      railway: { cost: railwayReal.total, source: railwayReal.source, breakdown: railwayReal.breakdown },
      vercel: { cost: vercelReal.total, source: vercelReal.source, breakdown: vercelReal.breakdown },
      neon: { cost: neonReal.total, source: neonReal.source, breakdown: neonReal.breakdown },
      openrouter: { cost: llmCostReal30d, source: openrouterReal.error ? 'db_estimate' : 'openrouter_api' },
      resend: { cost: resendReal.total, source: resendReal.source, plan: resendReal.plan, emails_sent: resendReal.emails_sent_30d },
      instantly: { 
        cost: instantlyReal.total, source: instantlyReal.source, plan: instantlyReal.plan,
        active_subscriptions: instantlyReal.active_subscriptions,
        revenue_per_sub: instantlyReal.revenue_per_sub,
        note: instantlyReal.note
      },
      domain: { cost: domainReal.total, source: 'fixed' },
      total: Math.round((
        railwayReal.total + vercelReal.total + neonReal.total + 
        llmCostReal30d + resendReal.total + (instantlyReal.total || 0) + domainReal.total
      ) * 100) / 100
    };

    // Profit
    const totalCosts = infraCosts.total;
    const profit = mrr - totalCosts;
    const margin = mrr > 0 ? ((profit / mrr) * 100).toFixed(1) : 0;

    res.json({
      timestamp: new Date().toISOString(),
      users: users.rows[0],
      companies: companies.rows[0],
      revenue: { mrr, proCount, pricePerUser: 39, currency: 'USD' },
      costs: {
        llm: {
          cost_30d: llmCostReal30d,
          cost_7d: llmCostReal7d,
          cost_24h: llmCostReal24h,
          tokens_30d: parseInt(llmCosts.rows[0].tokens_30d),
          byModel: llmByModel.rows,
          daily: llmDaily.rows,
          // Real OpenRouter data
          openrouter_real: {
            usage_monthly: openrouterReal.usage_monthly || 0,
            usage_weekly: openrouterReal.usage_weekly || 0,
            usage_daily: openrouterReal.usage_daily || 0,
            usage_total: openrouterReal.usage_total || 0,
            limit: openrouterReal.limit,
            limit_remaining: openrouterReal.limit_remaining,
            source: openrouterReal.error ? 'error' : 'api'
          },
          // DB estimates for comparison
          db_estimates: {
            cost_30d: parseFloat(llmCosts.rows[0].cost_30d),
            cost_7d: parseFloat(llmCosts7d.rows[0].cost_7d),
            cost_24h: parseFloat(llmCosts24h.rows[0].cost_24h)
          }
        },
        infra: infraCosts,
        total: totalCosts,
        // Metadata about data sources
        _sources: {
          openrouter: openrouterReal.source || 'unknown',
          vercel: vercelReal.source || 'unknown',
          neon: neonReal.source || 'unknown',
          railway: railwayReal.source || 'unknown',
          resend: resendReal.source || 'unknown',
          instantly: instantlyReal.source || 'unknown',
          cache_ttl: '5min'
        }
      },
      // Email Pro revenue (15€ × active subs, approx $16.5 USD)
      emailProRevenue: {
        activeSubs: instantlyReal.active_subscriptions || 0,
        pricePerSub: 15,
        currency: 'EUR',
        monthlyRevenue: (instantlyReal.active_subscriptions || 0) * 15,
        instantlyCost: instantlyReal.total || 0,
        netMargin: ((instantlyReal.active_subscriptions || 0) * 15) - (instantlyReal.total || 0)
      },
      profit: { amount: profit, margin: parseFloat(margin) },
      tasks: {
        summary: tasks.rows,
        recent: recentTasks.rows
      },
      activity: {
        recentChats: recentChats.rows,
        topCostCompanies: topCostCompanies.rows
      }
    });
  } catch (error) {
    console.error('Error en admin live:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
