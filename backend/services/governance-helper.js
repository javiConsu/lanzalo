/**
 * Governance & Budget Helper
 * Para ser usado por todos los agentes de Lanzalo
 */

const budgetManager = require('./services/budget-manager');
const governance = require('./services/governance');
const heartbeat = require('./services/heartbeat');
const { pool } = require('../db');

/**
 * Check budget before executing an action
 */
async function checkBudgetBeforeAction(agentType, tokensUsed = 0, hoursUsed = 0) {
  try {
    const status = await budgetManager.checkBudget(agentType, tokensUsed, hoursUsed);

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
    // Don't block action on budget check error
    return { allowed: true };
  }
}

/**
 * Record budget usage after executing an action
 */
async function recordBudgetUsage(agentType, tokensUsed = 0, hoursUsed = 0) {
  try {
    await budgetManager.recordUsage(agentType, tokensUsed, hoursUsed);
  } catch (error) {
    console.error('[GovernanceHelper] Error recording budget usage:', error);
  }
}

/**
 * Check governance status (paused/terminated)
 */
async function checkGovernanceStatus(agentType) {
  try {
    const agent = await pool.query(
      `SELECT * FROM agents WHERE agent_type = $1 AND company_id IS NULL ORDER BY created_at DESC LIMIT 1`,
      [agentType]
    );

    const agentRow = agent.rows[0];

    if (!agentRow) {
      return {
        allowed: true,
        paused: false,
        terminated: false
      };
    }

    return {
      allowed: !agentRow.paused && agentRow.status !== 'terminated',
      paused: agentRow.paused,
      terminated: agentRow.status === 'terminated'
    };
  } catch (error) {
    console.error('[GovernanceHelper] Error checking governance status:', error);
    // Don't block action on governance check error
    return { allowed: true };
  }
}

/**
 * Record heartbeat after executing an action
 */
async function recordHeartbeat(agentType) {
  try {
    await heartbeat.recordHeartbeat(agentType);
  } catch (error) {
    console.error('[GovernanceHelper] Error recording heartbeat:', error);
  }
}

/**
 * Validate budget from estimate
 */
async function estimateAndValidateBudget(agentType, estimatedTokens = 0) {
  const hourlyCost = 0.1; // Default hourly cost for agents
  const estimatedHours = estimatedTokens > 0 ? estimatedTokens / 1000 : 0; // 1000 tokens ≈ 1 minute

  const budgetCheck = await checkBudgetBeforeAction(agentType, 0, estimatedHours);

  return {
    ...budgetCheck,
    estimated_hours: estimatedHours,
    estimated_cost: (budgetCheck.remaining_budget * hourlyCost).toFixed(4)
  };
}

/**
 * Batch check for multiple actions
 */
async function validateAction(agentType, estimatedTokens = 0) {
  const governanceCheck = await checkGovernanceStatus(agentType);
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
async function getUsageReport(agentType, hours = 24) {
  try {
    const budget = budgetManager.BUDGETS[agentType];
    if (!budget) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    const usage = await budgetManager.getBudgetStatus(agentType);
    const health = await heartbeat.getHealthStatus(agentType);
    const governance = await pool.query(
      `SELECT * FROM agents WHERE agent_type = $1 ORDER BY created_at DESC LIMIT 1`,
      [agentType]
    );

    const governanceRow = governance.rows[0];

    return {
      agent_type: agentType,
      name: budget.name,
      budgets: {
        daily_budget: budget.daily_budget,
        hourly_cost: budget.hourly_cost,
        token_cost: budget.token_cost,
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
        paused: governanceRow?.paused || false,
        terminated: governanceRow?.status === 'terminated' || false,
        terminated_at: governanceRow?.terminated_at || null
      }
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