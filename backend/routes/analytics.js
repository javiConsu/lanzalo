/**
 * Rutas API para analytics
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * Dashboard general - stats globales
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Total de empresas
    const companiesResult = await pool.query(
      'SELECT COUNT(*) as total FROM companies'
    );
    
    // Empresas activas ahora
    const activeResult = await pool.query(
      `SELECT COUNT(*) as active FROM companies 
       WHERE status IN ('building', 'live')`
    );
    
    // Revenue total
    const revenueResult = await pool.query(
      'SELECT COALESCE(SUM(revenue_total), 0) as total FROM companies'
    );
    
    // Tareas completadas (último mes)
    const tasksResult = await pool.query(
      `SELECT COUNT(*) as completed FROM tasks 
       WHERE status = 'completed' 
       AND completed_at > NOW() - INTERVAL '30 days'`
    );
    
    res.json({
      stats: {
        totalCompanies: parseInt(companiesResult.rows[0].total),
        activeNow: parseInt(activeResult.rows[0].active),
        totalRevenue: parseFloat(revenueResult.rows[0].total),
        tasksCompleted: parseInt(tasksResult.rows[0].completed)
      }
    });
  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Actividad reciente (para live feed)
 */
router.get('/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await pool.query(
      `SELECT a.*, c.name as company_name
       FROM activity_log a
       JOIN companies c ON a.company_id = c.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json({ activity: result.rows });
  } catch (error) {
    console.error('Error obteniendo actividad:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
