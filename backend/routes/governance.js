/**
 * Governance API Routes
 */

const express = require('express');
const governanceService = require('../services/governance');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

/**
 * POST /api/governance/:agentId/pause
 * Pause an agent
 */
router.post('/:agentId/pause', async (req, res) => {
  try {
    const { companyId, agent_name, agent_role, reason } = req.body;

    if (!companyId || !agent_name || !agent_role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await governanceService.pauseAgent(
      parseInt(companyId),
      parseInt(req.params.agentId),
      agent_name,
      agent_role,
      reason || 'Manual pause by admin'
    );

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('POST /api/governance/:agentId/pause error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/:agentId/resume
 * Resume an agent
 */
router.post('/:agentId/resume', async (req, res) => {
  try {
    const { companyId, agent_name, agent_role, reason } = req.body;

    if (!companyId || !agent_name || !agent_role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await governanceService.resumeAgent(
      parseInt(companyId),
      parseInt(req.params.agentId),
      agent_name,
      agent_role,
      reason || 'Manual resume by admin'
    );

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('POST /api/governance/:agentId/resume error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/:agentId/terminate
 * Terminate an agent
 */
router.post('/:agentId/terminate', async (req, res) => {
  try {
    const { companyId, agent_name, agent_role, reason } = req.body;

    if (!companyId || !agent_name || !agent_role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await governanceService.terminateAgent(
      parseInt(companyId),
      parseInt(req.params.agentId),
      agent_name,
      agent_role,
      reason || 'Manual termination by admin'
    );

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('POST /api/governance/:agentId/terminate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/governance/events
 * Get governance events for a company
 */
router.get('/events', async (req, res) => {
  try {
    const { companyId, limit } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Missing companyId' });
    }

    const events = await governanceService.getEvents(parseInt(companyId), limit ? parseInt(limit) : 50);

    res.json({ events });
  } catch (error) {
    console.error('GET /api/governance/events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
