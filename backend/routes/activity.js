/**
 * Rutas Activity Feed — eventos en tiempo real de los agentes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db');

// Todas las rutas requieren autenticación
router.use(requireAuth);

/**
 * GET /api/activity
 * Retorna el feed de actividad reciente del usuario.
 * Query params:
 *   - companyId: filtrar por empresa específica (debe pertenecer al usuario)
 *   - agentType: filtrar por tipo de agente (code, marketing, email, etc.)
 *   - eventType: filtrar por tipo de evento (task_started, task_completed, deploy, etc.)
 *   - limit: número máximo de eventos (default 50, max 100)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { companyId, agentType, eventType, limit: rawLimit } = req.query;

    const limit = Math.min(parseInt(rawLimit) || 50, 100);

    // Obtener las empresas del usuario (para filtrar por seguridad)
    const companiesResult = await pool.query(
      'SELECT id FROM companies WHERE user_id = $1',
      [userId]
    );
    const userCompanyIds = companiesResult.rows.map(c => c.id);

    if (userCompanyIds.length === 0) {
      return res.json({ events: [] });
    }

    // Si el usuario pide filtrar por empresa, verificar que le pertenece
    let targetCompanyIds = userCompanyIds;
    if (companyId) {
      if (!userCompanyIds.includes(companyId)) {
        return res.status(403).json({ error: 'Acceso denegado a esta empresa' });
      }
      targetCompanyIds = [companyId];
    }

    // Construir query con filtros opcionales
    const params = [targetCompanyIds];
    let whereExtra = '';
    let paramCount = 1;

    if (agentType) {
      paramCount++;
      whereExtra += ` AND t.agent_type = $${paramCount}`;
      params.push(agentType);
    }

    if (eventType) {
      paramCount++;
      whereExtra += ` AND a.activity_type = $${paramCount}`;
      params.push(eventType);
    }

    paramCount++;
    params.push(limit);

    const result = await pool.query(
      `SELECT
        a.id,
        a.company_id,
        a.task_id,
        a.activity_type,
        a.message,
        a.metadata,
        a.created_at,
        c.name AS company_name,
        t.title AS task_title,
        t.agent_type
       FROM activity_log a
       JOIN companies c ON a.company_id = c.id
       LEFT JOIN tasks t ON a.task_id = t.id
       WHERE a.company_id = ANY($1::uuid[])
       ${whereExtra}
       ORDER BY a.created_at DESC
       LIMIT $${paramCount}`,
      params
    );

    // Normalizar payload para el frontend
    const events = result.rows.map(row => ({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      taskId: row.task_id,
      taskTitle: row.task_title,
      agentType: row.agent_type || extractAgentFromMetadata(row.metadata),
      type: row.activity_type,
      message: row.message,
      metadata: row.metadata,
      timestamp: row.created_at,
    }));

    res.json({ events });
  } catch (error) {
    console.error('Error obteniendo activity feed:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * GET /api/activity/types
 * Retorna los tipos de eventos disponibles para filtrado
 */
router.get('/types', async (req, res) => {
  res.json({
    eventTypes: [
      { value: 'task_started', label: '⚡ Tarea iniciada', color: 'blue' },
      { value: 'task_completed', label: '✅ Tarea completada', color: 'green' },
      { value: 'task_failed', label: '❌ Error en tarea', color: 'red' },
      { value: 'deploy', label: '🚀 Deploy', color: 'purple' },
      { value: 'email_sent', label: '📧 Email enviado', color: 'yellow' },
      { value: 'tweet_posted', label: '🐦 Tweet publicado', color: 'sky' },
      { value: 'decision', label: '🧠 Decisión tomada', color: 'orange' },
      { value: 'analysis', label: '🔍 Análisis realizado', color: 'gray' },
      { value: 'waitlist_signup', label: '📋 Nuevo lead', color: 'emerald' },
      { value: 'email_pro_activated', label: '📬 Email Pro activado', color: 'pink' },
    ],
    agentTypes: [
      { value: 'ceo', label: '🧠 Co-Founder', icon: '🧠' },
      { value: 'code', label: '💻 Engineer', icon: '💻' },
      { value: 'marketing', label: '📢 Marketing', icon: '📢' },
      { value: 'email', label: '📧 Email', icon: '📧' },
      { value: 'twitter', label: '🐦 Social', icon: '🐦' },
      { value: 'data', label: '📊 Data', icon: '📊' },
      { value: 'research', label: '🔍 Research', icon: '🔍' },
      { value: 'trends', label: '🎯 Trends', icon: '🎯' },
      { value: 'browser', label: '🌐 Browser', icon: '🌐' },
    ],
  });
});

/**
 * Extrae el tipo de agente de los metadatos si está disponible
 */
function extractAgentFromMetadata(metadata) {
  if (!metadata) return null;
  const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  return meta?.agentType || meta?.agent_type || null;
}

module.exports = router;
