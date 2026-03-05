/**
 * Rutas Admin - Solo para operadores de la plataforma
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { pool } = require('../db');

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

module.exports = router;
