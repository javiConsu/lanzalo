/**
 * Rutas API para empresas
 */

const express = require('express');
const router = express.Router();
const { tenantContext, TenantDB } = require('../middleware/tenant');
const { checkQuota, incrementUsage } = require('../middleware/quotas');
const { pool } = require('../db');

/**
 * Listar todas las empresas activas (para dashboard público)
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, name, tagline, description, industry, subdomain, status, 
        revenue_total, created_at
       FROM companies 
       WHERE status IN ('building', 'live')
       ORDER BY created_at DESC
       LIMIT 50`
    );
    
    res.json({ companies: result.rows });
  } catch (error) {
    console.error('Error listando empresas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Obtener detalles de una empresa
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    const company = result.rows[0];
    
    // Obtener tareas recientes
    const tasksResult = await pool.query(
      `SELECT * FROM tasks 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [id]
    );
    
    // Obtener actividad reciente
    const activityResult = await pool.query(
      `SELECT * FROM activity_log 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [id]
    );
    
    res.json({
      company,
      recentTasks: tasksResult.rows,
      recentActivity: activityResult.rows
    });
  } catch (error) {
    console.error('Error obteniendo empresa:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Crear nueva empresa
 */
router.post('/', checkQuota, async (req, res) => {
  try {
    const { user_id, name, description, industry } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ 
        error: 'name y description son requeridos' 
      });
    }
    
    // Generar subdomain
    const subdomain = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);
    
    // Verificar que el subdomain no exista
    const existing = await pool.query(
      'SELECT id FROM companies WHERE subdomain = $1',
      [subdomain]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Ese nombre ya está en uso. Elige otro.' 
      });
    }
    
    // Crear empresa
    const result = await pool.query(
      `INSERT INTO companies 
       (user_id, name, description, industry, subdomain, status)
       VALUES ($1, $2, $3, $4, $5, 'planning')
       RETURNING *`,
      [user_id, name, description, industry, subdomain]
    );
    
    const company = result.rows[0];
    
    // Incrementar uso
    await incrementUsage(company.id, 'companiesCreated', 1);
    
    res.json({ company });
  } catch (error) {
    console.error('Error creando empresa:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Actualizar empresa
 */
router.patch('/:id', tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Solo permitir actualizar ciertos campos
    const allowedFields = ['name', 'tagline', 'description', 'industry', 'status'];
    const filteredUpdates = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    // Construir query
    const fields = Object.keys(filteredUpdates);
    const values = Object.values(filteredUpdates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    
    const result = await pool.query(
      `UPDATE companies SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    
    res.json({ company: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando empresa:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Pausar/reactivar empresa
 */
router.post('/:id/toggle', tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE companies 
       SET status = CASE 
         WHEN status = 'paused' THEN 'live'
         ELSE 'paused'
       END
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    res.json({ company: result.rows[0] });
  } catch (error) {
    console.error('Error toggling empresa:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Eliminar empresa
 */
router.delete('/:id', tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM companies WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando empresa:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
