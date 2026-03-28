const express = require('express');
const router = express.Router();
const heartbeat = require('../services/heartbeat');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/heartbeat/status - Get health status for all agents
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const data = await heartbeat.getAllHealthStatus();
    res.json(data);
  } catch (error) {
    console.error('Error getting health status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/heartbeat/status/:agentType - Get health status for a specific agent
 */
router.get('/status/:agentType', requireAuth, async (req, res) => {
  try {
    const { agentType } = req.params;
    const status = await heartbeat.getHealthStatus(agentType);
    res.json(status);
  } catch (error) {
    console.error('Error getting health status for agent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/heartbeat/ping - Record a heartbeat from an agent
 */
router.post('/ping', requireAdmin, async (req, res) => {
  try {
    const { agent_type } = req.body;
    if (!agent_type) {
      return res.status(400).json({ error: 'agent_type is required' });
    }

    const agent = await heartbeat.recordHeartbeat(agent_type);

    res.json({
      success: true,
      agent_id: agent.id,
      agent_type: agent_type,
      heartbeat_recorded_at: agent.last_heartbeat,
      message: 'Heartbeat recorded successfully'
    });
  } catch (error) {
    console.error('Error recording heartbeat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/heartbeat/history/:agentType - Get heartbeat history for an agent
 */
router.get('/history/:agentType', requireAuth, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { hours = 24, limit = 100 } = req.query;

    const history = await heartbeat.getHeartbeatHistory(agentType, parseInt(hours), parseInt(limit));
    res.json({
      agent_type: agentType,
      hours,
      limit,
      history,
      total: history.length
    });
  } catch (error) {
    console.error('Error getting heartbeat history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/heartbeat/history - Get heartbeat history for all agents
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { hours = 24, limit = 100 } = req.query;

    const history = await heartbeat.getAllHeartbeatHistory(parseInt(hours), parseInt(limit));
    res.json({
      hours,
      limit,
      history,
      total: history.length
    });
  } catch (error) {
    console.error('Error getting all heartbeat history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/heartbeat/frequency/:agentType - Get heartbeat frequency for an agent
 */
router.get('/frequency/:agentType', requireAuth, async (req, res) => {
  try {
    const { agentType } = req.params;

    const frequency = await heartbeat.getHeartbeatFrequency(agentType);
    res.json(frequency);
  } catch (error) {
    console.error('Error getting heartbeat frequency:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/heartbeat/clear - Clear old heartbeat logs
 */
router.delete('/clear', requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await heartbeat.clearOldHeartbeatLogs(parseInt(days));
    res.json({
      success: true,
      message: `Cleared ${result.deleted} old heartbeat logs`,
      cutoff_date: result.cutoff_date
    });
  } catch (error) {
    console.error('Error clearing heartbeat logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/heartbeat/summary - Get heartbeat summary
 */
router.get('/summary', requireAuth, async (req, res) => {
  try {
const agentsResult = await pool.query('SELECT COUNT(*) as total FROM agents');
      const heartbeatsResult = await pool.query(
        'SELECT COUNT(*) as total FROM heartbeat_logs WHERE created_at >= NOW() - INTERVAL \'24 hours\''
      );
      const summary = {
        total_agents: parseInt(agentsResult.rows[0]?.total || 0),
        total_heartbeats_last_24h: parseInt(heartbeatsResult.rows[0]?.total || 0),
        average_heartbeat_interval_24h: null
      };

    res.json(summary);
  } catch (error) {
    console.error('Error getting heartbeat summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
