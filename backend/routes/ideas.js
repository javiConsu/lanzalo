/**
 * Ideas API - Endpoints para ideas descubiertas
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db');
const crypto = require('crypto');

/**
 * Obtener ideas descubiertas (público o autenticado)
 */
router.get('/ideas', async (req, res) => {
  try {
    const {
      category,
      difficulty,
      minScore = 0,
      limit = 20,
      offset = 0
    } = req.query;

    let query = `
      SELECT * FROM discovered_ideas 
      WHERE is_active = 1
    `;
    const params = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (difficulty) {
      query += ` AND difficulty = ?`;
      params.push(difficulty);
    }

    query += ` AND score >= ?`;
    params.push(parseInt(minScore));

    query += ` ORDER BY score DESC, discovered_at DESC`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Incrementar times_shown
    for (const idea of result.rows) {
      await pool.query(
        'UPDATE discovered_ideas SET times_shown = times_shown + 1 WHERE id = ?',
        [idea.id]
      );
    }

    res.json({
      ideas: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo ideas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Obtener idea específica
 */
router.get('/ideas/:ideaId', async (req, res) => {
  try {
    const { ideaId } = req.params;

    const result = await pool.query(
      'SELECT * FROM discovered_ideas WHERE id = ?',
      [ideaId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Idea no encontrada' });
    }

    res.json({
      idea: result.rows[0]
    });

  } catch (error) {
    console.error('Error obteniendo idea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Lanzar idea (crear empresa basada en idea descubierta)
 */
router.post('/ideas/:ideaId/launch', requireAuth, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { customizations } = req.body; // Usuario puede personalizar

    // Obtener idea
    const ideaResult = await pool.query(
      'SELECT * FROM discovered_ideas WHERE id = ?',
      [ideaId]
    );

    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Idea no encontrada' });
    }

    const idea = ideaResult.rows[0];

    // Crear empresa basada en la idea
    const companyId = crypto.randomUUID();
    const subdomain = this.generateSubdomain(idea.title);

    await pool.query(
      `INSERT INTO companies (
        id, user_id, name, description, industry, subdomain, 
        target_audience, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
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

    // Incrementar times_launched
    await pool.query(
      'UPDATE discovered_ideas SET times_launched = times_launched + 1 WHERE id = ?',
      [ideaId]
    );

    // Crear tarea para Code Agent (generar landing)
    const taskId = crypto.randomUUID();
    
    await pool.query(
      `INSERT INTO tasks (
        id, company_id, created_by, assigned_to, title, description, 
        tag, priority, status
      ) VALUES (?, ?, ?, 'code-agent', ?, ?, 'engineering', 'high', 'todo')`,
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

/**
 * Stats de ideas (admin)
 */
router.get('/ideas/stats', requireAuth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Solo admin' });
    }

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        AVG(score) as avg_score,
        SUM(times_launched) as total_launches,
        category,
        COUNT(*) as count_by_category
      FROM discovered_ideas
      WHERE is_active = 1
      GROUP BY category
    `);

    res.json({
      stats: stats.rows
    });

  } catch (error) {
    console.error('Error obteniendo stats:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Generar subdomain limpio
 */
function generateSubdomain(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30)
    + '-' + Math.random().toString(36).substring(2, 6);
}

module.exports = router;
