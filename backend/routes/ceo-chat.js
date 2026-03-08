/**
 * CEO Chat - API para chat conversacional con CEO Agent
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const CEOAgent = require('../../agents/ceo-agent');

// Todas las rutas requieren auth
router.use(requireAuth);

/**
 * Enviar mensaje al CEO Agent
 */
router.post('/companies/:companyId/chat', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    // Inicializar CEO Agent
    const ceo = new CEOAgent(companyId, req.user.id);
    await ceo.initialize();

    // Procesar mensaje
    const response = await ceo.processMessage(message);

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Error en CEO chat:', error);
    // Never leak internal error details to the frontend
    const userMessage = error.message?.includes('Cuota') 
      ? 'Has alcanzado el límite de uso este mes. Contacta soporte.'
      : 'Algo salió mal. Inténtalo de nuevo en unos segundos.';
    res.status(500).json({ error: userMessage });
  }
});

/**
 * Obtener historial de chat
 */
router.get('/companies/:companyId/chat/history', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const { pool } = require('../db');

    const result = await pool.query(
      `SELECT * FROM chat_messages 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [companyId, limit]
    );

    res.json({
      messages: result.rows.reverse()
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Obtener backlog (tareas pendientes)
 */
router.get('/companies/:companyId/backlog', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;

    const { pool } = require('../db');

    const result = await pool.query(
      `SELECT * FROM tasks 
       WHERE company_id = $1 AND status IN ('todo', 'in_progress')
       ORDER BY 
         CASE priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at`,
      [companyId]
    );

    res.json({
      backlog: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo backlog:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Crear tarea manualmente
 */
router.post('/companies/:companyId/tasks', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { title, description, tag, priority } = req.body;

    const { pool } = require('../db');
    const crypto = require('crypto');
    const taskId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO tasks (
        id, company_id, created_by, title, description, tag, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [taskId, companyId, req.user.id, title, description, tag, priority || 'medium', 'todo']
    );

    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );

    res.json({
      success: true,
      task: result.rows[0]
    });

  } catch (error) {
    console.error('Error creando tarea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
