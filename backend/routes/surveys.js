/**
 * Surveys API
 * POST /api/surveys/activation — guardar respuestas de la encuesta de activación
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// POST /api/surveys/activation
router.post('/activation', requireAuth, async (req, res) => {
  const { q1, q1_other, q2 } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Evitar duplicados: si ya respondió esta encuesta, devolver ok sin insertar
    const existing = await pool.query(
      `SELECT id FROM survey_responses WHERE user_id = $1 AND survey_type = 'activation' LIMIT 1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.json({ ok: true, duplicate: true });
    }

    await pool.query(
      `INSERT INTO survey_responses (user_id, survey_type, q1, q1_other, q2)
       VALUES ($1, 'activation', $2, $3, $4)`,
      [userId, q1 || null, q1_other || null, q2 || null]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[surveys] Error guardando respuesta:', err);
    res.status(500).json({ error: 'Error guardando respuesta' });
  }
});

// GET /api/surveys/nps/check — comprueba si hay que mostrar el NPS a este usuario
router.get('/nps/check', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  try {
    // Ya respondió el NPS → no mostrar
    const existing = await pool.query(
      'SELECT id FROM nps_responses WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (existing.rows.length > 0) return res.json({ show: false });

    // Trigger: 7 días desde registro
    const userResult = await pool.query(
      'SELECT created_at FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) return res.json({ show: false });

    const createdAt = new Date(userResult.rows[0].created_at);
    const sevenDaysAfter = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const show = new Date() >= sevenDaysAfter;

    res.json({ show });
  } catch (err) {
    console.error('[surveys] NPS check error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/surveys/nps — guardar respuesta NPS
router.post('/nps', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  const { score, comment } = req.body;
  if (score === undefined || score === null || score < 0 || score > 10) {
    return res.status(400).json({ error: 'Score debe ser un número entre 0 y 10' });
  }

  try {
    // Evitar duplicados
    const existing = await pool.query(
      'SELECT id FROM nps_responses WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (existing.rows.length > 0) return res.json({ ok: true, duplicate: true });

    await pool.query(
      'INSERT INTO nps_responses (user_id, score, comment) VALUES ($1, $2, $3)',
      [userId, score, comment?.trim() || null]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[surveys] NPS save error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
