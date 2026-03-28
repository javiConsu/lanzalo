/**
 * Governance & Budget Helper
 * Para ser usado por todos los agentes de Lanzalo
 */

const budgetManager = require('./budget-manager');
const governance = require('./governance');
const heartbeat = require('./heartbeat');
const { pool } = require('../db');

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-fA-F-]{36}$/.test(value);
}

function normalizeAgentType(agentType) {
  if (!agentType) return agentType;
  if (agentType === 'code') return 'Code';
  return String(agentType);
}

/**
 * Check budget before executing an action
 */
async function checkBudgetBeforeAction(agentType, tokensUsed = 0, hoursUsed = 0) {
  try {
    const normalizedAgentType = normalizeAgentType(agentType);
    const status = await budgetManager.checkBudget(normalizedAgentType, tokensUsed, hoursUsed);

    if (!status.allowed) {
      return {
        allowed: false,
        budget_exceeded: true,
        current_cost: status.current_cost,
        daily_budget: status.daily_budget,
        remaining_budget: status.remaining_budget,
        error: `Budget exceeded: $${status.current_cost} of $${status.daily_budget} already used`,
        suggestion: 'Reduce usage or wait until budget resets'
      };
    }

    return {
      allowed: true,
      budget_exceeded: false,
      current_cost: status.current_cost,
      daily_budget: status.daily_budget,
      remaining_budget: status.remaining_budget
    };
  } catch (error) {
    console.error('[GovernanceHelper] Error checking budget:', error);
    return { allowed: true, warning: 'budget_check_failed' };
  }
}

/**
 * Record budget usage after executing an action.
 * Supports:
 *   recordBudgetUsage(agentType, tokensUsed, hoursUsed)
 *   recordBudgetUsage(companyId, agentType, amount, metricType)
 */
async function recordBudgetUsage(arg1, arg2 = 0, arg3 = 0, arg4 = 'dollars') {
  try {
    if (isUuid(arg1) && typeof arg2 === 'string') {
      return await budgetManager.recordUsage(arg1, normalizeAgentType(arg2), Number(arg3) || 0, arg4 || 'dollars');
    }

    return await budgetManager.recordUsage(normalizeAgentType(arg1), Number(arg2) || 0, Number(arg3) || 0);
  } catch (error) {
    console.error('[GovernanceHelper] Error recording budget usage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check governance status (paused/terminated)
 * Company-scoped governance tables are authoritative; if they are not populated yet,
 * do not block execution but report the ambiguity.
 */
async function checkGovernanceStatus(agentType, companyId = null) {
  try {
    const normalizedAgentType = normalizeAgentType(agentType);

    if (companyId && isUuid(companyId)) {
      const events = await governance.getEvents(companyId, 200);
      const relevantEvents = events.filter(event => event.agent_role === normalizedAgentType);
      const latest = relevantEvents[0];

      if (!latest) {
        return {
          allowed: true,
          paused: false,
          terminated: false,
          source: 'company_governance_unset'
        };
      }

      return {
        allowed: !['pause', 'terminate'].includes(latest.action),
        paused: latest.action === 'pause',
        terminated: latest.action === 'terminate',
        source: 'company_governance_events',
        last_event: latest
      };
    }

    const agent = await pool.query(
      `SELECT * FROM agents WHERE agent_type = $1 AND company_id IS NULL ORDER BY created_at DESC LIMIT 1`,
      [normalizedAgentType]
    );

    const agentRow = agent.rows[0];

    if (!agentRow) {
      return {
        allowed: true,
        paused: false,
        terminated: false,
        source: 'legacy_agent_unset'
      };
    }

    return {
      allowed: !agentRow.paused && agentRow.status !== 'terminated',
      paused: agentRow.paused,
      terminated: agentRow.status === 'terminated',
      source: 'legacy_agents_table'
    };
  } catch (error) {
    console.error('[GovernanceHelper] Error checking governance status:', error);
    return { allowed: true, warning: 'governance_check_failed' };
  }
}

/**
 * Record heartbeat after executing an action.
 * Supports:
 *   recordHeartbeat(companyId, agentType, status?, data?)
 *   recordHeartbeat(agentType)  -> skipped with trace to avoid fake success
 */
async function recordHeartbeat(arg1, arg2 = null, arg3 = 'healthy', arg4 = {}) {
  try {
    if (isUuid(arg1) && typeof arg2 === 'string') {
      return await heartbeat.recordHeartbeat(arg1, normalizeAgentType(arg2), arg3 || 'healthy', arg4 || {});
    }

    const skipped = await heartbeat.recordHeartbeat(normalizeAgentType(arg1));
    if (skipped?.skipped) {
      console.warn(`[GovernanceHelper] Heartbeat skipped for ${normalizeAgentType(arg1)}: companyId missing`);
    }
    return skipped;
  } catch (error) {
    console.error('[GovernanceHelper] Error recording heartbeat:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate budget from estimate
 */
async function estimateAndValidateBudget(agentType, estimatedTokens = 0) {
  const hourlyCost = 0.1;
  const estimatedHours = estimatedTokens > 0 ? estimatedTokens / 1000 : 0;

  const budgetCheck = await checkBudgetBeforeAction(agentType, 0, estimatedHours);

  return {
    ...budgetCheck,
    estimated_hours: estimatedHours,
    estimated_cost: (estimatedHours * hourlyCost).toFixed(4)
  };
}

/**
 * Batch check for multiple actions
 */
async function validateAction(agentType, estimatedTokens = 0, companyId = null) {
  const governanceCheck = await checkGovernanceStatus(agentType, companyId);
  const budgetCheck = await estimateAndValidateBudget(agentType, estimatedTokens);

  return {
    allowed: governanceCheck.allowed && budgetCheck.allowed,
    governance_ok: governanceCheck.allowed,
    budget_ok: budgetCheck.allowed,
    governance: governanceCheck,
    budget: budgetCheck
  };
}

/**
 * Get usage report for an agent
 */
async function getUsageReport(agentType, hours = 24, companyId = null) {
  try {
    const normalizedAgentType = normalizeAgentType(agentType);
    const budget = budgetManager.BUDGETS[normalizedAgentType] || { total: 0 };
    const usage = await budgetManager.getBudgetStatus(normalizedAgentType);
    const health = await heartbeat.getHealthStatus(companyId || normalizedAgentType, companyId ? normalizedAgentType : null);
    const governanceStatus = await checkGovernanceStatus(normalizedAgentType, companyId);

    return {
      agent_type: normalizedAgentType,
      name: normalizedAgentType,
      budgets: {
        daily_budget: budget.total || usage.daily_budget || 0,
        hourly_cost: usage.hourly_cost || 0,
        token_cost: usage.token_cost || 0,
        current_cost: usage.current_cost,
        remaining_budget: usage.remaining_budget,
        status: usage.status
      },
      health: {
        status: health.status,
        healthy: health.healthy,
        unhealthy: health.unhealthy,
        warning: health.warning,
        last_heartbeat: health.last_heartbeat,
        time_since_last_heartbeat: health.time_since_last_heartbeat
      },
      governance: {
        paused: governanceStatus.paused || false,
        terminated: governanceStatus.terminated || false,
        source: governanceStatus.source || 'unknown'
      },
      window_hours: hours,
      company_id: companyId
    };
  } catch (error) {
    console.error('[GovernanceHelper] Error getting usage report:', error);
    throw error;
  }
}

module.exports = {
  checkBudgetBeforeAction,
  recordBudgetUsage,
  checkGovernanceStatus,
  recordHeartbeat,
  estimateAndValidateBudget,
  validateAction,
  getUsageReport
};
