/**
 * Governance Service
 * Handles agent control and event logging
 */

const { pool } = require('../db');

class GovernanceService {
  /**
   * Pause an agent
   */
  async pauseAgent(companyId, agentId, agentName, agentRole, reason = 'Manual pause by admin') {
    try {
      // Record event
      await pool.query(
        `INSERT INTO governance_events (company_id, agent_id, agent_name, agent_role, action, reason, performed_by, created_at)
         VALUES ($1, $2, $3, $4, 'pause', $5, 'admin', NOW())`,
        [companyId, agentId, agentName, agentRole, reason]
      );

      // Update agent status
      await pool.query(
        `UPDATE tasks
         SET status = 'paused'
         WHERE company_id = $1 AND id = $2`,
        [companyId, agentId]
      );

      console.log(`✅ Agent ${agentName} paused by governance`);

      return {
        success: true,
        action: 'pause',
        agent_id: agentId
      };
    } catch (error) {
      console.error('GovernanceService.pauseAgent error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume an agent
   */
  async resumeAgent(companyId, agentId, agentName, agentRole, reason = 'Manual resume by admin') {
    try {
      // Record event
      await pool.query(
        `INSERT INTO governance_events (company_id, agent_id, agent_name, agent_role, action, reason, performed_by, created_at)
         VALUES ($1, $2, $3, $4, 'resume', $5, 'admin', NOW())`,
        [companyId, agentId, agentName, agentRole, reason]
      );

      // Update agent status
      await pool.query(
        `UPDATE tasks
         SET status = 'active'
         WHERE company_id = $1 AND id = $2`,
        [companyId, agentId]
      );

      console.log(`✅ Agent ${agentName} resumed by governance`);

      return {
        success: true,
        action: 'resume',
        agent_id: agentId
      };
    } catch (error) {
      console.error('GovernanceService.resumeAgent error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Terminate an agent
   */
  async terminateAgent(companyId, agentId, agentName, agentRole, reason = 'Manual termination by admin') {
    try {
      // Record event
      await pool.query(
        `INSERT INTO governance_events (company_id, agent_id, agent_name, agent_role, action, reason, performed_by, created_at)
         VALUES ($1, $2, $3, $4, 'terminate', $5, 'admin', NOW())`,
        [companyId, agentId, agentName, agentRole, reason]
      );

      // Update agent status
      await pool.query(
        `UPDATE tasks
         SET status = 'terminated'
         WHERE company_id = $1 AND id = $2`,
        [companyId, agentId]
      );

      console.log(`✅ Agent ${agentName} terminated by governance`);

      return {
        success: true,
        action: 'terminate',
        agent_id: agentId
      };
    } catch (error) {
      console.error('GovernanceService.terminateAgent error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get governance events for a company
   */
  async getEvents(companyId, limit = 50) {
    try {
      const result = await pool.query(
        `SELECT * FROM governance_events
         WHERE company_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [companyId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        agent_role: row.agent_role,
        action: row.action,
        reason: row.reason,
        performed_by: row.performed_by,
        created_at: row.created_at
      }));
    } catch (error) {
      console.error('GovernanceService.getEvents error:', error);
      return [];
    }
  }
}

module.exports = new GovernanceService();