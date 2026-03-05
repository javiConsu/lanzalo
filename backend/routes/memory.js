/**
 * Memory API - Endpoints para acceder y gestionar memoria
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const MemorySystem = require('../../agents/memory-system');

// Todas las rutas requieren auth
router.use(requireAuth);

/**
 * Obtener memoria completa de una empresa
 */
router.get('/companies/:companyId/memory', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;

    const memory = new MemorySystem(companyId);
    const context = await memory.getFullContext();

    res.json({
      success: true,
      memory: context
    });

  } catch (error) {
    console.error('Error obteniendo memoria:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Actualizar Layer 1 (domain knowledge)
 */
router.patch('/companies/:companyId/memory/domain', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const updates = req.body;

    const memory = new MemorySystem(companyId);
    const updated = await memory.updateLayer1(updates);

    res.json({
      success: true,
      layer1: updated
    });

  } catch (error) {
    console.error('Error actualizando Layer 1:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Actualizar Layer 2 (preferences)
 */
router.patch('/companies/:companyId/memory/preferences', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const updates = req.body;

    const memory = new MemorySystem(companyId);
    const updated = await memory.updateLayer2(updates);

    res.json({
      success: true,
      layer2: updated
    });

  } catch (error) {
    console.error('Error actualizando Layer 2:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Buscar en memoria
 */
router.post('/companies/:companyId/memory/search', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { query, layers } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query requerida' });
    }

    const memory = new MemorySystem(companyId);
    const results = await memory.search(query, { layers });

    res.json({
      success: true,
      query,
      results
    });

  } catch (error) {
    console.error('Error buscando en memoria:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Ver Layer 3 (patterns globales) - solo admin
 */
router.get('/memory/patterns', async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Solo admin' });
    }

    const memory = new MemorySystem();
    const layer3 = await memory.getLayer3();

    res.json({
      success: true,
      patterns: layer3
    });

  } catch (error) {
    console.error('Error obteniendo Layer 3:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
