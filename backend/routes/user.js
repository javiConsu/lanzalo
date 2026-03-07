/**
 * Rutas User - Solo para clientes de la plataforma
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const { checkQuota, incrementUsage } = require('../middleware/quotas');
const { pool } = require('../db');
const orchestrator = require('../../agents/orchestrator');

// Todas las rutas requieren autenticación
router.use(requireAuth);

/**
 * Obtener perfil del usuario
 */
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, plan, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Listar empresas DEL USUARIO (solo las suyas)
 */
router.get('/companies', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.*,
        COUNT(DISTINCT t.id) as tasks_count,
        MAX(a.created_at) as last_activity
       FROM companies c
       LEFT JOIN tasks t ON c.id = t.company_id
       LEFT JOIN activity_log a ON c.id = a.company_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({ companies: result.rows });

  } catch (error) {
    console.error('Error listando empresas (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Crear nueva empresa
 */
router.post('/companies', checkQuota, async (req, res) => {
  try {
    const { name, description, industry, tagline } = req.body;

    if (!name || !description) {
      return res.status(400).json({ 
        error: 'name y description son requeridos' 
      });
    }

    // Generar subdomain
    const subdomain = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    // Verificar que el subdomain no exista
    const existing = await pool.query(
      'SELECT id FROM companies WHERE subdomain = $1',
      [subdomain]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Ese nombre ya está en uso. Elige otro.' 
      });
    }

    // Crear empresa
    const result = await pool.query(
      `INSERT INTO companies 
       (user_id, name, tagline, description, industry, subdomain, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'planning')
       RETURNING *`,
      [req.user.id, name, tagline, description, industry, subdomain]
    );

    const company = result.rows[0];

    // Incrementar uso (opcional, no bloquear si falla)
    try { await incrementUsage(company.id, 'companiesCreated', 1); } catch(e) {}

    res.json({ company });

  } catch (error) {
    console.error('Error creando empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ver detalles de UNA empresa (del usuario)
 */
router.get('/companies/:id', requireCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Tareas recientes
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE company_id = $1 ORDER BY created_at DESC LIMIT 20',
      [id]
    );

    // Actividad reciente
    const activityResult = await pool.query(
      'SELECT * FROM activity_log WHERE company_id = $1 ORDER BY created_at DESC LIMIT 30',
      [id]
    );

    res.json({
      company: companyResult.rows[0],
      recentTasks: tasksResult.rows,
      recentActivity: activityResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Actualizar empresa
 */
router.patch('/companies/:id', requireCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Solo permitir actualizar ciertos campos
    const allowedFields = ['name', 'tagline', 'description', 'industry'];
    const filteredUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    // Construir query
    const fields = Object.keys(filteredUpdates);
    const values = Object.values(filteredUpdates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await pool.query(
      `UPDATE companies SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    res.json({ company: result.rows[0] });

  } catch (error) {
    console.error('Error actualizando empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Pausar/reactivar empresa
 */
router.post('/companies/:id/toggle', requireCompanyAccess, async (req, res) => {
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

    res.json({ company: result.rows[0] });

  } catch (error) {
    console.error('Error toggling empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Eliminar empresa
 */
router.delete('/companies/:id', requireCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM companies WHERE id = $1', [id]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error eliminando empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ejecutar tarea on-demand (respetando quotas)
 */
router.post('/companies/:id/tasks', requireCompanyAccess, checkQuota, async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_type, description } = req.body;

    if (!agent_type) {
      return res.status(400).json({ error: 'agent_type requerido' });
    }

    // Ejecutar tarea
    const result = await orchestrator.runOnDemandTask(
      id,
      agent_type,
      description
    );

    // Incrementar uso
    await incrementUsage(req.user.id, 'tasksPerDay', 1);

    res.json({ result });

  } catch (error) {
    console.error('Error ejecutando tarea (user):', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Ver quotas actuales
 */
router.get('/quotas', async (req, res) => {
  try {
    const { PLANS, getUsage } = require('../middleware/quotas');
    
    const plan = PLANS[req.user.plan] || PLANS.free;
    const quotas = {};

    for (const [key, limit] of Object.entries(plan.quotas)) {
      const usage = await getUsage(req.user.id, key);
      quotas[key] = {
        limit,
        usage,
        remaining: limit - usage
      };
    }

    res.json({
      plan: plan.name,
      quotas
    });

  } catch (error) {
    console.error('Error obteniendo quotas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Dashboard del usuario
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Total de empresas
    const companiesResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'live') as live
       FROM companies
       WHERE user_id = $1`,
      [req.user.id]
    );

    // Tareas del último mes
    const tasksResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM tasks t
       JOIN companies c ON t.company_id = c.id
       WHERE c.user_id = $1
       AND t.created_at > NOW() - INTERVAL '30 days'`,
      [req.user.id]
    );

    // Actividad reciente
    const activityResult = await pool.query(
      `SELECT a.*, c.name as company_name
       FROM activity_log a
       JOIN companies c ON a.company_id = c.id
       WHERE c.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({
      companies: {
        total: parseInt(companiesResult.rows[0].total),
        live: parseInt(companiesResult.rows[0].live)
      },
      tasks: {
        lastMonth: parseInt(tasksResult.rows[0].total)
      },
      recentActivity: activityResult.rows
    });

  } catch (error) {
    console.error('Error en dashboard (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Chat con Co-Founder Agent
 */
router.post('/companies/:companyId/chat', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Mensaje requerido' });

    const CEOAgent = require('../../agents/ceo-agent');
    const ceo = new CEOAgent(companyId, req.user.id);
    await ceo.initialize();
    const response = await ceo.processMessage(message);
    res.json({ success: true, ...response });
  } catch (error) {
    console.error('[Co-Founder] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Historial de chat
 */
router.get('/companies/:companyId/chat/history', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const limit = parseInt(req.query.limit) || 50;
    const result = await pool.query(
      `SELECT id, role, content, created_at FROM chat_messages
       WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [companyId, limit]
    );
    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
