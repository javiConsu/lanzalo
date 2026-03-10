/**
 * Heartbeat Service
 * Handles agent health tracking and monitoring
 */

const { pool } = require('../db');

class HeartbeatService {
  constructor() {
    this.timeout = 5 * 60 * 1000; // 5 minutes default timeout
  }

  /**
   * Record agent heartbeat
   */
  async recordHeartbeat(companyId, agentRole, status = 'healthy', data = {}) {
    try {
      await pool.query(
        `INSERT INTO heartbeat_logs (company_id, agent_role, status, timestamp, data, recorded_at)
         VALUES ($1, $2, $3, NOW(), $4, NOW())`,
        [companyId, agentRole, status, JSON.stringify(data)]
      );

      console.log(`💓 Heartbeat from ${agentRole} (${status})`);

      return { success: true };
    } catch (error) {
      console.error('HeartbeatService.recordHeartbeat error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check agent health status
   */
  async getHealthStatus(companyId, agentRole) {
    try {
      // Get last heartbeat
      const result = await pool.query(
        `SELECT * FROM heartbeat_logs
         WHERE company_id = $1 AND agent_role = $2
         ORDER BY timestamp DESC LIMIT 1`,
        [companyId, agentRole]
      );

      if (result.rows.length === 0) {
        return { status: 'unknown', last_seen: null };
      }

      const heartbeat = result.rows[0];
      const age = Date.now() - new Date(heartbeat.timestamp).getTime();

      if (age > this.timeout) {
        return { status: 'unhealthy', last_seen: heartbeat.timestamp, age };
      }

      if (age > this.timeout * 0.8) {
        return { status: 'warning', last_seen: heartbeat.timestamp, age };
      }

      return { status: 'healthy', last_seen: heartbeat.timestamp, age };
    } catch (error) {
      console.error('HeartbeatService.getHealthStatus error:', error);
      return { status: 'unknown', error: error.message };
    }
  }

  /**
   * Get heartbeat history
   */
  async getHistory(companyId, agentRole = null, limit = 50) {
    try {
      let query = `SELECT * FROM heartbeat_logs WHERE company_id = $1`;
      let params = [companyId];

      if (agentRole) {
        query += ` AND agent_role = $2`;
        params.push(agentRole);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await pool.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        agent_role: row.agent_role,
        status: row.status,
        timestamp: row.timestamp,
        data: JSON.parse(row.data || '{}')
      }));
    } catch (error) {
      console.error('HeartbeatService.getHistory error:', error);
      return [];
    }
  }
}

module.exports = new HeartbeatService();