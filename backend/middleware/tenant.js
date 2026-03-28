/**
 * Middleware de Multi-tenancy
 * Asegura que cada request tiene contexto de empresa y verifica ownership
 */

const { pool } = require('../db');

/**
 * Extrae company_id del request (desde token, header, o query)
 * Verifica que el usuario autenticado es dueño de la empresa (o admin)
 */
async function tenantContext(req, res, next) {
  try {
    const companyId = 
      req.headers['x-company-id'] ||
      req.query.company_id ||
      req.user?.company_id;
    
    if (!companyId) {
      return res.status(400).json({ 
        error: 'company_id requerido' 
      });
    }

    const result = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Empresa no encontrada' 
      });
    }

    const company = result.rows[0];

    // Verificar ownership si hay usuario autenticado
    if (req.user && req.user.role !== 'admin') {
      if (company.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'No tienes acceso a esta empresa'
        });
      }
    }

    req.company = company;
    req.companyId = companyId;
    
    next();
  } catch (error) {
    console.error('Error en tenant middleware:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

/**
 * Wrapper para queries que auto-filtra por company_id
 */
class TenantDB {
  constructor(companyId) {
    this.companyId = companyId;
  }

  /**
   * Query que automáticamente añade WHERE company_id = ...
   */
  async query(sql, params = []) {
    // Verificar que el query incluye filtro por company_id
    if (!sql.toLowerCase().includes('company_id')) {
      throw new Error(
        'SEGURIDAD: Query debe incluir filtro por company_id'
      );
    }

    return await pool.query(sql, [this.companyId, ...params]);
  }

  /**
   * Crear tarea (auto-scope a esta empresa)
   */
  async createTask(agentType, title, description) {
    const result = await pool.query(
      `INSERT INTO tasks (company_id, tag, title, description, status, created_at)
       VALUES ($1, $2, $3, $4, 'todo', NOW()) RETURNING *`,
      [this.companyId, agentType, title, description]
    );
    return result.rows[0];
  }

  /**
   * Obtener tareas (solo de esta empresa)
   */
  async getTasks(limit = 10) {
    const result = await pool.query(
      `SELECT * FROM tasks 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [this.companyId, limit]
    );
    return result.rows;
  }

  /**
   * Registrar actividad
   */
  async logActivity(taskId, activityType, message, metadata = {}) {
    const result = await pool.query(
      `INSERT INTO activity_log (company_id, task_id, activity_type, message, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [this.companyId, taskId, activityType, message, JSON.stringify(metadata)]
    );
    
    const activity = result.rows[0];
    
    // Broadcast a WebSocket
    if (global.broadcastActivity) {
      global.broadcastActivity(activity);
    }
    
    return activity;
  }

  /**
   * Registrar métrica
   */
  async recordMetric(metricName, metricValue) {
    await pool.query(
      `INSERT INTO analytics (company_id, metric_name, metric_value)
       VALUES ($1, $2, $3)`,
      [this.companyId, metricName, metricValue]
    );
  }
}

module.exports = { tenantContext, TenantDB };
