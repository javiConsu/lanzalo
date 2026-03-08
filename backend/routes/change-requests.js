/**
 * Change Requests API — Pedir cambios en assets generados
 * GRATIS siempre — no consume créditos
 * 
 * POST /api/changes          — Crear petición de cambio
 * GET  /api/changes           — Listar cambios del usuario
 * GET  /api/changes/:id       — Ver cambio específico
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { pool } = require('../db');

router.use(authenticate);

/**
 * POST /api/changes — Crear petición de cambio
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { companyId, assetType, assetId, description } = req.body;

    if (!description || !assetType) {
      return res.status(400).json({ error: 'Descripción y tipo de asset son obligatorios' });
    }

    const result = await pool.query(
      `INSERT INTO change_requests (user_id, company_id, asset_type, asset_id, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, companyId || null, assetType, assetId || null, description]
    );

    // Log en activity
    if (companyId) {
      await pool.query(
        `INSERT INTO activity_log (company_id, activity_type, message, created_at)
         VALUES ($1, 'change_requested', $2, NOW())`,
        [companyId, `📝 Cambio solicitado en ${assetType}: ${description.substring(0, 100)}`]
      ).catch(() => {});
    }

    res.json({ success: true, changeRequest: result.rows[0] });
  } catch (error) {
    console.error('Error creando cambio:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * GET /api/changes — Listar cambios del usuario
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const status = req.query.status; // pending, processing, applied
    const companyId = req.query.companyId;

    let query = 'SELECT * FROM change_requests WHERE user_id = $1';
    const params = [userId];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (companyId) {
      params.push(companyId);
      query += ` AND company_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(query, params);
    res.json({ changes: result.rows });
  } catch (error) {
    console.error('Error listando cambios:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * GET /api/changes/:id — Ver cambio específico
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = await pool.query(
      'SELECT * FROM change_requests WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cambio no encontrado' });
    }

    res.json({ change: result.rows[0] });
  } catch (error) {
    console.error('Error obteniendo cambio:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
