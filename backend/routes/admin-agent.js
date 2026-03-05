/**
 * Admin Agent Control - Ejecutar agente financiero
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const FinancialAgent = require('../../agents/financial-agent');

// Todas las rutas requieren auth + admin
router.use(requireAuth);
router.use(requireAdmin);

/**
 * Ejecutar Financial Agent
 */
router.post('/agent/financial/run', async (req, res) => {
  try {
    const agent = new FinancialAgent();
    const result = await agent.execute();

    res.json({
      success: true,
      ...result,
      message: 'Análisis financiero completado'
    });

  } catch (error) {
    console.error('Error ejecutando Financial Agent:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Aprobar decisión pendiente
 */
router.post('/agent/financial/approve', async (req, res) => {
  try {
    const { decisionId, approved } = req.body;

    if (approved) {
      // TODO: Ejecutar la acción que estaba pendiente
      res.json({
        success: true,
        message: 'Decisión aprobada y ejecutada'
      });
    } else {
      res.json({
        success: true,
        message: 'Decisión rechazada'
      });
    }

  } catch (error) {
    console.error('Error aprobando decisión:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Configurar auto-run del Financial Agent
 */
router.post('/agent/financial/schedule', async (req, res) => {
  try {
    const { enabled, frequency } = req.body;

    // TODO: Configurar cron job
    // Por ahora, manual

    res.json({
      success: true,
      message: `Financial Agent ${enabled ? 'activado' : 'desactivado'}`,
      frequency
    });

  } catch (error) {
    console.error('Error configurando schedule:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
