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

module.exports = router;
