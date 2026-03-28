const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const budgetManager = require('../services/budget-manager');
const governanceService = require('../services/governance');
const heartbeatService = require('../services/heartbeat');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');

router.use(requireAuth);

const AGENT_CONFIG = {
  ceo: { id: 'ceo', role: 'CEO', name: 'CEO', tags: ['ceo'] },
  cto: { id: 'cto', role: 'CTO', name: 'CTO', tags: ['cto', 'code'] },
  marketing: { id: 'marketing', role: 'Marketing', name: 'Marketing', tags: ['marketing'] },
  twitter: { id: 'twitter', role: 'Twitter', name: 'Twitter', tags: ['twitter'] },
  email: { id: 'email', role: 'Email', name: 'Email', tags: ['email'] },
  data: { id: 'data', role: 'Data', name: 'Data', tags: ['data'] },
  trends: { id: 'trends', role: 'Trends', name: 'Trends', tags: ['trends', 'research'] }
};

function normalizeTimestamp(value) {
  return value ? new Date(value).toISOString() : null;
}

function buildHeartbeatMap(heartbeatRows) {
  const map = new Map();
  heartbeatRows.forEach(row => {
    map.set(String(row.agent_role), row);
  });
  return map;
}

function buildGovernanceMap(eventRows) {
  const map = new Map();
  eventRows.forEach(row => {
    if (!map.has(String(row.agent_role))) {
      map.set(String(row.agent_role), row);
    }
  });
  return map;
}

async function getTaskSignals(companyId) {
  const active = await pool.query(
    `SELECT id, tag, title, status, started_at, created_at
     FROM tasks
     WHERE company_id = $1 AND status IN ('todo', 'in_progress', 'paused')
     ORDER BY created_at DESC`,
    [companyId]
  );

  const recentDone = await pool.query(
    `SELECT id, tag, title, status, completed_at, created_at
     FROM tasks
     WHERE company_id = $1 AND status IN ('completed', 'failed')
       AND COALESCE(completed_at, created_at) > NOW() - INTERVAL '24 hours'
     ORDER BY COALESCE(completed_at, created_at) DESC`,
    [companyId]
  );

  return {
    active: active.rows,
    recentDone: recentDone.rows
  };
}

async function buildAgents(companyId) {
  const [signals, heartbeatRows, governanceEvents] = await Promise.all([
    getTaskSignals(companyId),
    heartbeatService.getAllHealthStatus(companyId),
    governanceService.getEvents(companyId, 100)
  ]);

  const heartbeatMap = buildHeartbeatMap(heartbeatRows);
  const governanceMap = buildGovernanceMap(governanceEvents);

  return Object.values(AGENT_CONFIG).map(config => {
    const matchingTags = new Set(config.tags);
    const activeTasks = signals.active.filter(task => matchingTags.has(String(task.tag)));
    const recentDone = signals.recentDone.find(task => matchingTags.has(String(task.tag)));
    const heartbeat = heartbeatMap.get(config.role);
    const governance = governanceMap.get(config.role);

    let status = 'idle';
    let detail = 'Sin actividad reciente';

    if (governance?.action === 'terminate') {
      status = 'terminated';
      detail = governance.reason || 'Terminado por gobernanza';
    } else if (governance?.action === 'pause') {
      status = 'paused';
      detail = governance.reason || 'Pausado por gobernanza';
    } else if (activeTasks.some(task => task.status === 'in_progress')) {
      const task = activeTasks.find(t => t.status === 'in_progress');
      status = 'active';
      detail = task?.title || 'Ejecutando trabajo';
    } else if (activeTasks.some(task => task.status === 'todo')) {
      const task = activeTasks.find(t => t.status === 'todo');
      status = 'queued';
      detail = task?.title || 'Trabajo en cola';
    } else if (recentDone?.status === 'failed') {
      status = 'error';
      detail = recentDone.title || 'Última tarea fallida';
    } else if (recentDone?.status === 'completed') {
      status = 'idle';
      detail = recentDone.title || 'Última tarea completada';
    }

    return {
      id: config.id,
      name: config.name,
      role: config.role,
      status,
      detail,
      tags: config.tags,
      tasks_in_progress: activeTasks.filter(task => task.status === 'in_progress').length,
      tasks_queued: activeTasks.filter(task => task.status === 'todo').length,
      heartbeat: heartbeat ? {
        status: heartbeat.status,
        timestamp: heartbeat.last_heartbeat,
        age: heartbeat.age,
        recorded_status: heartbeat.recorded_status || heartbeat.status
      } : null,
      governance: governance ? {
        action: governance.action,
        reason: governance.reason,
        timestamp: governance.created_at
      } : null
    };
  });
}

async function buildBudgets(companyId) {
  const budgets = await Promise.all(
    Object.values(AGENT_CONFIG).map(async config => {
      const budget = await budgetManager.getBudget(companyId, config.role);
      return {
        id: `${companyId}-${config.role}`,
        role: config.role,
        agent_role: config.role,
        used: Number(budget.used || 0),
        total: Number(budget.total || 0),
        metric_type: budget.metric_type || 'dollars',
        remaining: Math.max(0, Number(budget.total || 0) - Number(budget.used || 0)),
        recorded_at: budget.last_recorded_at || null
      };
    })
  );

  return budgets;
}

async function buildEvents(companyId) {
  const [governanceEvents, heartbeatHistory] = await Promise.all([
    governanceService.getEvents(companyId, 50),
    heartbeatService.getAllHeartbeatHistory(24, 100, companyId)
  ]);

  const normalizedGovernance = governanceEvents.map(event => ({
    id: `governance-${event.id}`,
    source: 'governance',
    eventType: event.action === 'pause'
      ? 'agent_paused'
      : event.action === 'resume'
        ? 'agent_resumed'
        : 'agent_terminated',
    action: event.action,
    agentId: event.agent_id,
    agentName: event.agent_name,
    agentRole: event.agent_role,
    reason: event.reason,
    timestamp: normalizeTimestamp(event.created_at)
  }));

  const normalizedHeartbeat = heartbeatHistory.map(event => ({
    id: `heartbeat-${event.id}`,
    source: 'heartbeat',
    eventType: event.status === 'warning'
      ? 'heartbeat_warning'
      : event.status === 'unhealthy' || event.status === 'timeout'
        ? 'heartbeat_unhealthy'
        : 'heartbeat',
    action: event.status,
    agentId: event.agent_role.toLowerCase(),
    agentName: event.agent_role,
    agentRole: event.agent_role,
    reason: event.status === 'healthy' ? 'Heartbeat recibido' : `Heartbeat ${event.status}`,
    timestamp: normalizeTimestamp(event.timestamp)
  }));

  return [...normalizedGovernance, ...normalizedHeartbeat]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * GET /api/company/:companyId/agents
 */
router.get('/:companyId/agents', requireCompanyAccess, async (req, res) => {
  try {
    const agents = await buildAgents(req.companyId);
    res.json({ agents });
  } catch (error) {
    console.error('GET /api/company/:companyId/agents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/company/:companyId/budgets
 */
router.get('/:companyId/budgets', requireCompanyAccess, async (req, res) => {
  try {
    const budgets = await buildBudgets(req.companyId);
    res.json({ budgets });
  } catch (error) {
    console.error('GET /api/company/:companyId/budgets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/company/:companyId/events
 */
router.get('/:companyId/events', requireCompanyAccess, async (req, res) => {
  try {
    const events = await buildEvents(req.companyId);
    res.json({ events });
  } catch (error) {
    console.error('GET /api/company/:companyId/events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/company/:companyId/agents/:agentId/:action
 */
router.post('/:companyId/agents/:agentId/:action', requireCompanyAccess, async (req, res) => {
  try {
    const { agentId, action } = req.params;
    const config = AGENT_CONFIG[String(agentId).toLowerCase()];

    if (!config) {
      return res.status(404).json({ error: 'Unknown agent' });
    }

    if (!['pause', 'resume', 'terminate'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await pool.query(
      `INSERT INTO governance_events (company_id, agent_id, agent_name, agent_role, action, reason, performed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        req.companyId,
        config.id,
        config.name,
        config.role,
        action,
        req.body?.reason || `Manual ${action} from dashboard`,
        req.user?.email || 'admin'
      ]
    );

    if (action === 'pause') {
      await pool.query(
        `UPDATE tasks
         SET status = 'paused'
         WHERE company_id = $1
           AND tag = ANY($2::text[])
           AND status IN ('todo', 'in_progress')`,
        [req.companyId, config.tags]
      );
    }

    if (action === 'resume') {
      await pool.query(
        `UPDATE tasks
         SET status = 'todo'
         WHERE company_id = $1
           AND tag = ANY($2::text[])
           AND status = 'paused'`,
        [req.companyId, config.tags]
      );
    }

    if (action === 'terminate') {
      await pool.query(
        `UPDATE tasks
         SET status = 'failed',
             error_message = COALESCE(error_message, 'Terminated by dashboard governance'),
             completed_at = NOW()
         WHERE company_id = $1
           AND tag = ANY($2::text[])
           AND status IN ('todo', 'in_progress', 'paused')`,
        [req.companyId, config.tags]
      );
    }

    res.json({ success: true, agent: config.id, action });
  } catch (error) {
    console.error('POST /api/company/:companyId/agents/:agentId/:action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
