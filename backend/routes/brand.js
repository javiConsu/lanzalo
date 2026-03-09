/**
 * Brand Config Routes — CRUD for company brand voice & style guide
 * 
 * GET  /api/companies/:companyId/brand         — Get brand config
 * PUT  /api/companies/:companyId/brand         — Update brand config
 * POST /api/companies/:companyId/brand/generate — Auto-generate from description
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const brandConfig = require('../services/brand-config');

// ─── Auth middleware ───────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.userId = decoded.userId || decoded.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

async function requireCompanyAccess(req, res, next) {
  const { companyId } = req.params;
  const check = await pool.query(
    'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
    [companyId, req.userId]
  );
  if (check.rows.length === 0) return res.status(403).json({ error: 'Sin acceso a esta empresa' });
  next();
}

/**
 * GET /api/companies/:companyId/brand
 * Returns the merged brand config (stored + defaults)
 */
router.get('/companies/:companyId/brand', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const config = await brandConfig.getConfig(req.params.companyId);
    
    // Also get raw stored config
    const raw = await pool.query(
      'SELECT brand_config FROM companies WHERE id = $1',
      [req.params.companyId]
    );
    
    res.json({
      config,                                   // merged with defaults
      raw: raw.rows[0]?.brand_config || {},     // only what user explicitly set
      hasCustomConfig: Object.keys(raw.rows[0]?.brand_config || {}).length > 0,
    });
  } catch (error) {
    console.error('Error getting brand config:', error);
    res.status(500).json({ error: 'Error obteniendo configuración de marca' });
  }
});

/**
 * PUT /api/companies/:companyId/brand
 * Update brand config (partial update — merges with existing)
 */
router.put('/companies/:companyId/brand', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const updates = req.body;
    
    // Get current stored config
    const current = await pool.query(
      'SELECT brand_config FROM companies WHERE id = $1',
      [companyId]
    );
    const existing = current.rows[0]?.brand_config || {};
    
    // Deep merge updates into existing
    const merged = deepMerge(existing, updates);
    merged.updated_at = new Date().toISOString();
    merged.updated_by = 'user';
    
    await brandConfig.saveConfig(companyId, merged);
    
    // Return the full merged config
    const config = await brandConfig.getConfig(companyId);
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error updating brand config:', error);
    res.status(500).json({ error: 'Error actualizando configuración de marca' });
  }
});

/**
 * POST /api/companies/:companyId/brand/generate
 * Auto-generate brand config from a description
 * Body: { description: "describe tu marca, tono, estilo..." }
 */
router.post('/companies/:companyId/brand/generate', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Se requiere una descripción' });
    
    const config = await brandConfig.generateFromDescription(req.params.companyId, description);
    
    if (!config) {
      return res.status(500).json({ error: 'Error generando configuración de marca' });
    }
    
    // Return the full merged config
    const fullConfig = await brandConfig.getConfig(req.params.companyId);
    res.json({ success: true, config: fullConfig });
  } catch (error) {
    console.error('Error generating brand config:', error);
    res.status(500).json({ error: 'Error generando configuración de marca' });
  }
});

// ─── Deep merge helper ──────────────────────────
function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, val] of Object.entries(source)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

module.exports = router;
