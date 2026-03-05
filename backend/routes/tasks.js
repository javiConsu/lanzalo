/**
 * Rutas API para tareas
 */

const express = require('express');
const router = express.Router();
const { tenantContext, TenantDB } = require('../middleware/tenant');
const { checkQuota, incrementUsage } = require('../middleware/quotas');
const orchestrator = require('../../agents/orchestrator');

/**
 * Listar tareas de una empresa
 */
router.get('/', tenantContext, async (req, res) => {
  try {
    const db = new TenantDB(req.companyId);
    const tasks = await db.getTasks(50);
    
    res.json({ tasks });
  } catch (error) {
    console.error('Error listando tareas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ejecutar tarea on-demand
 */
router.post('/run', tenantContext, checkQuota, async (req, res) => {
  try {
    const { agent_type, description } = req.body;
    
    if (!agent_type) {
      return res.status(400).json({ error: 'agent_type requerido' });
    }
    
    // Ejecutar tarea
    const result = await orchestrator.runOnDemandTask(
      req.companyId,
      agent_type,
      description
    );
    
    // Incrementar uso
    await incrementUsage(req.companyId, 'tasksPerDay', 1);
    
    res.json({ result });
  } catch (error) {
    console.error('Error ejecutando tarea:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
