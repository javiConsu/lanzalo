/**
 * Heartbeat API Routes
 */

const express = require('express');
const heartbeatService = require('../services/heartbeat');

const router = express.Router();

/**
 * GET /api/heartbeat/status
 * Get health status of all agents for a company
 */
router.get('/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { companyId } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!companyId) {
      return res.status(400).json({ error: 'Missing companyId' });
    }

    // Get agents for this company
    const agentsResult = await req.app.get('db').query(
      'SELECT id, title, metadata FROM tasks WHERE company_id = $1 AND status != "terminated"',
      [companyId]
    );

    const agentRoles = agentsResult.rows.map(row => {
      const metadata = row.metadata ? JSON.parse(row.metadata) : {};
      return metadata.role || row.title.split(' ')[0].toLowerCase();
    });

    const healthStatus = [];
    for (const role of agentRoles) {
      const health = await heartbeatService.getHealthStatus(companyId, role);
      healthStatus.push({
        agent_role: role,
        ...health
      });
    }

    res.json({ agents: healthStatus });
  } catch (error) {
    console.error('GET /api/heartbeat/status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/heartbeat/ping
 * Agent heartbeat check-in
 */
router.post('/ping', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { companyId, agent_role, status = 'healthy', data = {} } = req.body;

    if (!token || !companyId || !agent_role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await heartbeatService.recordHeartbeat(companyId, agent_role, status, data);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('POST /api/heartbeat/ping error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/heartbeat/history
 * Get heartbeat history
 */
router.get('/history', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { companyId, agent_role, limit = 50 } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!companyId) {
      return res.status(400).json({ error: 'Missing companyId' });
    }

    const history = await heartbeatService.getHistory(companyId, agent_role || null, limit);

    res.json({ history });
  } catch (error) {
    console.error('GET /api/heartbeat/history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;