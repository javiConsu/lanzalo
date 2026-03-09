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
    // Period filter: 24h | 7d | 30d | total (default: 30d)
    const period = ['24h', '7d', '30d', 'total'].includes(req.query.period) ? req.query.period : '30d';
    const intervalMap = { '24h': '24 hours', '7d': '7 days', '30d': '30 days', 'total': '10 years' };
    const interval = intervalMap[period];

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

    // LLM costs for ALL periods (always needed for display)
    const [llmCosts30d, llmCosts7d, llmCosts24h, llmCostsTotal] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(estimated_cost), 0) as cost, COALESCE(SUM(tokens_used), 0) as tokens FROM llm_usage WHERE recorded_at > NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COALESCE(SUM(estimated_cost), 0) as cost FROM llm_usage WHERE recorded_at > NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COALESCE(SUM(estimated_cost), 0) as cost FROM llm_usage WHERE recorded_at > NOW() - INTERVAL '24 hours'`),
      pool.query(`SELECT COALESCE(SUM(estimated_cost), 0) as cost, COALESCE(SUM(tokens_used), 0) as tokens FROM llm_usage`)
    ]);

    // LLM by model (filtered by period)
    const llmByModel = await pool.query(
      `SELECT model, SUM(estimated_cost) as cost, SUM(tokens_used) as tokens, COUNT(*) as calls
       FROM llm_usage
       WHERE recorded_at > NOW() - INTERVAL '${interval}'
       GROUP BY model ORDER BY cost DESC`
    );

    // LLM daily trend (14d always for chart)
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

    // Top companies by cost (filtered by period)
    const topCostCompanies = await pool.query(
      `SELECT c.name, u.email as owner, SUM(l.estimated_cost) as cost, COUNT(l.id) as calls
       FROM llm_usage l
       LEFT JOIN companies c ON l.company_id = c.id
       LEFT JOIN users u ON c.user_id = u.id
       WHERE l.recorded_at > NOW() - INTERVAL '${interval}'
       GROUP BY c.name, u.email
       ORDER BY cost DESC LIMIT 10`
    );

    // ─── Real costs from external APIs (period-aware) ────────
    const realCosts = await getAllRealCosts(period);
    const svc = realCosts.services;

    // OpenRouter real data (always has all periods)
    const openrouterReal = svc.openrouter;

    // Build infra object for frontend
    const infraCosts = {
      railway: { cost: svc.railway.cost, source: svc.railway.source, breakdown: svc.railway.breakdown },
      vercel: { cost: svc.vercel.cost, source: svc.vercel.source, breakdown: svc.vercel.breakdown },
      neon: { cost: svc.neon.cost, source: svc.neon.source, breakdown: svc.neon.breakdown },
      openrouter: { cost: svc.openrouter.cost, source: openrouterReal.error ? 'db_estimate' : 'openrouter_api' },
      resend: { cost: svc.resend.cost, source: svc.resend.source, plan: svc.resend.plan, emails_sent: svc.resend.emails_sent_30d },
      instantly: { 
        cost: svc.instantly.cost, source: svc.instantly.source, plan: svc.instantly.plan,
        active_subscriptions: svc.instantly.active_subscriptions,
        revenue_per_sub: svc.instantly.revenue_per_sub,
        note: svc.instantly.note
      },
      domain: { cost: svc.domain.cost, source: 'fixed' },
      total: realCosts.total
    };

    // Profit (always based on monthly comparison)
    const totalCosts30d = (await getAllRealCosts('30d')).total;
    const profit = mrr - totalCosts30d;
    const margin = mrr > 0 ? ((profit / mrr) * 100).toFixed(1) : 0;

    res.json({
      timestamp: new Date().toISOString(),
      period,
      users: users.rows[0],
      companies: companies.rows[0],
      revenue: { mrr, proCount, pricePerUser: 39, currency: 'USD' },
      costs: {
        llm: {
          cost_30d: openrouterReal.usage_monthly || parseFloat(llmCosts30d.rows[0].cost),
          cost_7d: openrouterReal.usage_weekly || parseFloat(llmCosts7d.rows[0].cost),
          cost_24h: openrouterReal.usage_daily || parseFloat(llmCosts24h.rows[0].cost),
          // Use account-level total (all keys) for the real total spend
          cost_total: openrouterReal.account_total || openrouterReal.usage_total || parseFloat(llmCostsTotal.rows[0].cost),
          tokens_30d: parseInt(llmCosts30d.rows[0].tokens),
          tokens_total: parseInt(llmCostsTotal.rows[0].tokens),
          byModel: llmByModel.rows,
          daily: llmDaily.rows,
          openrouter_real: {
            usage_monthly: openrouterReal.usage_monthly || 0,
            usage_weekly: openrouterReal.usage_weekly || 0,
            usage_daily: openrouterReal.usage_daily || 0,
            usage_total: openrouterReal.usage_total || 0,
            // Account-level totals (all API keys combined)
            account_total: openrouterReal.account_total || 0,
            account_credits: openrouterReal.account_credits || 0,
            account_remaining: openrouterReal.account_remaining || 0,
            limit: openrouterReal.limit,
            limit_remaining: openrouterReal.limit_remaining,
            source: openrouterReal.error ? 'error' : 'api'
          },
          db_estimates: {
            cost_30d: parseFloat(llmCosts30d.rows[0].cost),
            cost_7d: parseFloat(llmCosts7d.rows[0].cost),
            cost_24h: parseFloat(llmCosts24h.rows[0].cost),
            cost_total: parseFloat(llmCostsTotal.rows[0].cost)
          }
        },
        infra: infraCosts,
        total: infraCosts.total,
        _sources: {
          openrouter: openrouterReal.source || 'unknown',
          vercel: svc.vercel.source || 'unknown',
          neon: svc.neon.source || 'unknown',
          railway: svc.railway.source || 'unknown',
          resend: svc.resend.source || 'unknown',
          instantly: svc.instantly.source || 'unknown',
          cache_ttl: '5min'
        }
      },
      emailProRevenue: {
        activeSubs: svc.instantly.active_subscriptions || 0,
        pricePerSub: 15,
        currency: 'EUR',
        monthlyRevenue: (svc.instantly.active_subscriptions || 0) * 15,
        instantlyCost: svc.instantly.monthly || 0,
        netMargin: ((svc.instantly.active_subscriptions || 0) * 15) - (svc.instantly.monthly || 0)
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

// ─── Test: Trigger Daily Briefing ──────────────────────
router.post('/test-briefing', async (req, res) => {
  try {
    const { runBriefingForAll } = require('../services/cofounder-daily');
    const type = req.body.type || 'morning';
    console.log(`[Admin] Triggering test briefing: ${type}`);
    // Run async, respond immediately
    runBriefingForAll(type).then(() => {
      console.log(`[Admin] Test briefing ${type} completed`);
    }).catch(err => {
      console.error(`[Admin] Test briefing error:`, err.message);
    });
    res.json({ success: true, message: `Briefing ${type} disparado. Revisa tu email en ~30s.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
