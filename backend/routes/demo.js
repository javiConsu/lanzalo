/**
 * routes/demo.js
 *
 * Endpoint de acceso rápido a la demo para presentaciones.
 * Retorna token + companyId del usuario demo para que el frontend
 * pueda iniciar la sesión demo sin intervención del usuario.
 *
 * GET /api/demo/start  → { token, companyId, user }
 *
 * Solo activo si DEMO_MODE=true en entorno.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const DEMO_EMAIL = 'demo@lanzalo.pro';

/**
 * GET /api/demo/start
 * Retorna credenciales de la sesión demo.
 * Requiere DEMO_MODE=true o NODE_ENV=development.
 */
router.get('/start', async (req, res) => {
  const isDemoAllowed = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production';

  if (!isDemoAllowed) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const userRes = await pool.query(
      'SELECT id, email, name, role, plan, credits FROM users WHERE email = $1',
      [DEMO_EMAIL]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        error: 'Demo data not found. Run: node scripts/seed-demo.js',
        hint: 'DATABASE_URL=<tu-db-url> node scripts/seed-demo.js'
      });
    }

    const user = userRes.rows[0];

    const companyRes = await pool.query(
      "SELECT id, name, subdomain, status FROM companies WHERE user_id = $1 AND subdomain = 'dentaflow' LIMIT 1",
      [user.id]
    );

    if (companyRes.rows.length === 0) {
      return res.status(404).json({
        error: 'Demo company not found. Run: node scripts/seed-demo.js'
      });
    }

    const company = companyRes.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan },
      companyId: company.id,
      company: { id: company.id, name: company.name, subdomain: company.subdomain }
    });

  } catch (err) {
    console.error('[Demo] Error:', err.message);
    res.status(500).json({ error: 'Error iniciando demo' });
  }
});

module.exports = router;
