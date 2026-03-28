/**
 * Heartbeat Service
 * Handles agent health tracking and monitoring
 */

const { pool } = require('../db');

class HeartbeatService {
  constructor() {
    this.timeout = 5 * 60 * 1000; // 5 minutes default timeout
  }

  normalizeAgentRole(agentRole) {
    if (!agentRole) return agentRole;
    if (agentRole === 'code') return 'Code';
    return String(agentRole);
  }

  isUuid(value) {
    return typeof value === 'string' && /^[0-9a-fA-F-]{36}$/.test(value);
  }

  buildHealthFromTimestamp(timestamp) {
    if (!timestamp) {
      return {
        status: 'unknown',
        healthy: false,
        warning: false,
        unhealthy: true,
        last_seen: null,
        last_heartbeat: null,
        time_since_last_heartbeat: null,
        age: null
      };
    }

    const age = Date.now() - new Date(timestamp).getTime();
    let status = 'healthy';

    if (age > this.timeout) {
      status = 'unhealthy';
    } else if (age > this.timeout * 0.8) {
      status = 'warning';
    }

    return {
      status,
      healthy: status === 'healthy',
      warning: status === 'warning',
      unhealthy: status === 'unhealthy',
      last_seen: timestamp,
      last_heartbeat: timestamp,
      time_since_last_heartbeat: age,
      age
    };
  }

  /**
   * Record agent heartbeat.
   * Supports both:
   *   recordHeartbeat(companyId, agentRole, status, data)
   *   recordHeartbeat(agentRole)
   */
  async recordHeartbeat(arg1, arg2 = null, arg3 = 'healthy', arg4 = {}) {
    const companyId = this.isUuid(arg1) ? arg1 : null;
    const agentRole = this.normalizeAgentRole(companyId ? arg2 : arg1);
    const status = companyId ? (arg3 || 'healthy') : 'healthy';
    const data = companyId ? (arg4 || {}) : {};

    try {
      if (!companyId) {
        return {
          success: false,
          skipped: true,
          agent_role: agentRole,
          message: 'Company-scoped heartbeat skipped because companyId was not provided'
        };
      }

      const result = await pool.query(
        `INSERT INTO heartbeat_logs (company_id, agent_role, status, timestamp, data, recorded_at)
         VALUES ($1, $2, $3, NOW(), $4, NOW())
         RETURNING id, company_id, agent_role, status, timestamp, recorded_at`,
        [companyId, agentRole, status, JSON.stringify(data)]
      );

      console.log(`💓 Heartbeat from ${agentRole} for company ${companyId} (${status})`);

      return {
        success: true,
        id: result.rows[0].id,
        company_id: result.rows[0].company_id,
        agent_role: result.rows[0].agent_role,
        status: result.rows[0].status,
        last_heartbeat: result.rows[0].timestamp,
        recorded_at: result.rows[0].recorded_at
      };
    } catch (error) {
      console.error('HeartbeatService.recordHeartbeat error:', error);
      return { success: false, error: error.message, company_id: companyId, agent_role: agentRole };
    }
  }

  /**
   * Get health status for an agent.
   * Supports getHealthStatus(companyId, agentRole) and legacy getHealthStatus(agentRole).
   */
  async getHealthStatus(arg1, arg2 = null) {
    const companyId = this.isUuid(arg1) ? arg1 : null;
    const agentRole = this.normalizeAgentRole(companyId ? arg2 : arg1);

    try {
      if (!companyId) {
        return {
          agent_role: agentRole,
          ...this.buildHealthFromTimestamp(null),
          message: 'Company-scoped heartbeat requires companyId'
        };
      }

      const result = await pool.query(
        `SELECT company_id, agent_role, status, timestamp, data, recorded_at
         FROM heartbeat_logs
         WHERE company_id = $1 AND agent_role = $2
         ORDER BY timestamp DESC
         LIMIT 1`,
        [companyId, agentRole]
      );

      if (result.rows.length === 0) {
        return {
          company_id: companyId,
          agent_role: agentRole,
          ...this.buildHealthFromTimestamp(null)
        };
      }

      const heartbeat = result.rows[0];
      return {
        company_id: heartbeat.company_id,
        agent_role: heartbeat.agent_role,
        recorded_status: heartbeat.status,
        data: heartbeat.data || {},
        ...this.buildHealthFromTimestamp(heartbeat.timestamp)
      };
    } catch (error) {
      console.error('HeartbeatService.getHealthStatus error:', error);
      return {
        company_id: companyId,
        agent_role: agentRole,
        status: 'unknown',
        error: error.message
      };
    }
  }

  async getAllHealthStatus(companyId = null) {
    try {
      let query = `SELECT DISTINCT ON (company_id, agent_role)
          company_id, agent_role, status, timestamp, data, recorded_at
        FROM heartbeat_logs`;
      const params = [];

      if (companyId) {
        query += ` WHERE company_id = $1`;
        params.push(companyId);
      }

      query += ` ORDER BY company_id, agent_role, timestamp DESC`;

      const result = await pool.query(query, params);

      return result.rows.map(row => ({
        company_id: row.company_id,
        agent_role: row.agent_role,
        recorded_status: row.status,
        data: row.data || {},
        ...this.buildHealthFromTimestamp(row.timestamp)
      }));
    } catch (error) {
      console.error('HeartbeatService.getAllHealthStatus error:', error);
      return [];
    }
  }

  async getHeartbeatHistory(agentRole, hours = 24, limit = 100, companyId = null) {
    try {
      const normalizedRole = this.normalizeAgentRole(agentRole);
      const params = [];
      const where = [];

      if (companyId) {
        params.push(companyId);
        where.push(`company_id = $${params.length}`);
      }

      if (normalizedRole) {
        params.push(normalizedRole);
        where.push(`agent_role = $${params.length}`);
      }

      params.push(hours);
      where.push(`timestamp >= NOW() - ($${params.length} * INTERVAL '1 hour')`);

      params.push(limit);

      const result = await pool.query(
        `SELECT id, company_id, agent_role, status, timestamp, data, recorded_at
         FROM heartbeat_logs
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY timestamp DESC
         LIMIT $${params.length}`,
        params
      );

      return result.rows.map(row => ({
        id: row.id,
        company_id: row.company_id,
        agent_role: row.agent_role,
        status: row.status,
        timestamp: row.timestamp,
        data: row.data || {},
        recorded_at: row.recorded_at
      }));
    } catch (error) {
      console.error('HeartbeatService.getHeartbeatHistory error:', error);
      return [];
    }
  }

  async getAllHeartbeatHistory(hours = 24, limit = 100, companyId = null) {
    return this.getHeartbeatHistory(null, hours, limit, companyId);
  }

  async getHeartbeatFrequency(agentRole, companyId = null) {
    try {
      const history = await this.getHeartbeatHistory(agentRole, 24, 500, companyId);

      if (history.length < 2) {
        return {
          company_id: companyId,
          agent_role: this.normalizeAgentRole(agentRole),
          samples: history.length,
          average_interval_ms: null,
          average_interval_seconds: null
        };
      }

      let totalInterval = 0;
      for (let i = 0; i < history.length - 1; i += 1) {
        totalInterval += new Date(history[i].timestamp).getTime() - new Date(history[i + 1].timestamp).getTime();
      }

      const avg = totalInterval / (history.length - 1);
      return {
        company_id: companyId,
        agent_role: this.normalizeAgentRole(agentRole),
        samples: history.length,
        average_interval_ms: Math.round(avg),
        average_interval_seconds: Math.round(avg / 1000)
      };
    } catch (error) {
      console.error('HeartbeatService.getHeartbeatFrequency error:', error);
      return {
        company_id: companyId,
        agent_role: this.normalizeAgentRole(agentRole),
        error: error.message
      };
    }
  }

  async clearOldHeartbeatLogs(days = 30) {
    try {
      const result = await pool.query(
        `DELETE FROM heartbeat_logs
         WHERE recorded_at < NOW() - ($1 * INTERVAL '1 day')`,
        [days]
      );

      return {
        success: true,
        deleted: result.rowCount || 0,
        cutoff_date: `${days} days`
      };
    } catch (error) {
      console.error('HeartbeatService.clearOldHeartbeatLogs error:', error);
      return { success: false, deleted: 0, error: error.message };
    }
  }

  async getHistory(companyId, agentRole = null, limit = 50) {
    return this.getHeartbeatHistory(agentRole, 24, limit, companyId);
  }
}

module.exports = new HeartbeatService();
