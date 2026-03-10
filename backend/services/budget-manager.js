/**
 * Budget Manager Service
 * Handles budget allocation, usage tracking, and auto-pause
 */

const { pool } = require('../db');

class BudgetManager {
  constructor() {
    this.budgets = {
      CEO: { total: 4.00, color: 'purple' },
      CTO: { total: 8.00, color: 'blue' },
      Marketing: { total: 4.00, color: 'green' },
      Twitter: { total: 2.00, color: 'orange' },
      Email: { total: 2.00, color: 'pink' },
      Data: { total: 4.00, color: 'teal' },
      Trends: { total: 2.00, color: 'violet' }
    };
  }

  /**
   * Get current budget for an agent
   */
  async getBudget(companyId, agentRole) {
    try {
      const result = await pool.query(
        'SELECT * FROM budget_history WHERE company_id = $1 AND agent_role = $2 ORDER BY recorded_at DESC LIMIT 1',
        [companyId, agentRole]
      );

      if (result.rows.length === 0) {
        return { used: 0, total: 0 };
      }

      const budget = result.rows[0];
      return {
        id: budget.id,
        used: parseFloat(budget.used_amount),
        total: parseFloat(budget.total_amount),
        metric_type: budget.metric_type,
        last_recorded_at: budget.recorded_at
      };
    } catch (error) {
      console.error('BudgetManager.getBudget error:', error);
      return { used: 0, total: 0 };
    }
  }

  /**
   * Record budget usage
   */
  async recordUsage(companyId, agentRole, amount, metricType = 'dollars') {
    try {
      // Get current budget
      const current = await this.getBudget(companyId, agentRole);

      // Check if budget exceeded
      if (current.used + amount > current.total) {
        console.warn(`⚠️ Budget exceeded for ${agentRole}: ${current.used + amount} > ${current.total}`);
        return {
          success: false,
          exceeded: true,
          remaining: Math.max(0, current.total - current.used),
          message: 'Budget exceeded - agent would be paused'
        };
      }

      // Record usage
      const result = await pool.query(
        `INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [companyId, agentRole, current.used + amount, current.total, metricType]
      );

      return {
        success: true,
        exceeded: false,
        used: parseFloat(result.rows[0].used_amount),
        total: parseFloat(result.rows[0].total_amount)
      };
    } catch (error) {
      console.error('BudgetManager.recordUsage error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update budget manually (for manual adjustments)
   */
  async updateBudget(companyId, agentRole, totalAmount) {
    try {
      await pool.query(
        `UPDATE budget_history
         SET total_amount = $1, recorded_at = NOW()
         WHERE company_id = $2 AND agent_role = $3`,
        [totalAmount, companyId, agentRole]
      );

      return { success: true };
    } catch (error) {
      console.error('BudgetManager.updateBudget error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all budgets for a company
   */
  async getAllBudgets(companyId) {
    try {
      const result = await pool.query(
        'SELECT * FROM budget_history WHERE company_id = $1 ORDER BY agent_role',
        [companyId]
      );

      return result.rows.map(row => ({
        id: row.id,
        agent_role: row.agent_role,
        used: parseFloat(row.used_amount),
        total: parseFloat(row.total_amount),
        metric_type: row.metric_type,
        recorded_at: row.recorded_at
      }));
    } catch (error) {
      console.error('BudgetManager.getAllBudgets error:', error);
      return [];
    }
  }

  /**
   * Check if agent budget can be used
   */
  async canUseBudget(companyId, agentRole, amount) {
    const budget = await this.getBudget(companyId, agentRole);
    return (budget.used + amount) <= budget.total;
  }

  // Compatibility functions for governance-helper
  async checkBudget(agentType, tokensUsed = 0, hoursUsed = 0) {
    const budget = this.budgets[agentType];
    if (!budget) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    const estimatedCost = (tokensUsed * 0.00015) + (hoursUsed * budget.total / 24);

    if (estimatedCost >= budget.total) {
      return {
        allowed: false,
        current_cost: estimatedCost.toFixed(4),
        daily_budget: budget.total,
        remaining_budget: (budget.total - estimatedCost).toFixed(4),
        error: 'Budget exceeded'
      };
    }

    return {
      allowed: true,
      current_cost: estimatedCost.toFixed(4),
      daily_budget: budget.total,
      remaining_budget: (budget.total - estimatedCost).toFixed(4)
    };
  }

  async recordUsage(agentType, tokensUsed = 0, hoursUsed = 0) {
    const budget = this.budgets[agentType];
    if (!budget) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    try {
      await pool.query(
        `INSERT INTO agent_usage (agent_type, company_id, total_tokens, total_hours)
         VALUES ($1, NULL, $2, $3)
         ON CONFLICT (agent_type, company_id)
         DO UPDATE SET total_tokens = agent_usage.total_tokens + $2,
                      total_hours = agent_usage.total_hours + $3`,
        [agentType, tokensUsed, hoursUsed]
      );
    } catch (error) {
      console.error('[BudgetManager] Error recording usage:', error);
    }
  }

  async getBudgetStatus(agentType) {
    const budget = this.budgets[agentType];
    if (!budget) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    try {
      const result = await pool.query(
        'SELECT total_tokens, total_hours FROM agent_usage WHERE agent_type = $1 ORDER BY created_at DESC LIMIT 1',
        [agentType]
      );

      const usage = result.rows[0] || { total_tokens: 0, total_hours: 0 };

      const estimatedCost = (usage.total_tokens * 0.00015) + (usage.total_hours * budget.total / 24);

      return {
        agent_type: agentType,
        name: agentType,
        daily_budget: budget.total,
        hourly_cost: budget.total / 24,
        token_cost: 0.00015,
        current_cost: estimatedCost.toFixed(4),
        remaining_budget: (budget.total - estimatedCost).toFixed(4),
        status: parseFloat((budget.total - estimatedCost)) < 1 ? 'warning' : 'ok'
      };
    } catch (error) {
      console.error('[BudgetManager] Error getting budget status:', error);
      return {
        agent_type: agentType,
        name: agentType,
        daily_budget: budget.total,
        hourly_cost: budget.total / 24,
        token_cost: 0.00015,
        current_cost: '0.0000',
        remaining_budget: budget.total.toFixed(4),
        status: 'ok'
      };
    }
  }

  async getAllBudgets() {
    const budgets = await Promise.all(
      Object.keys(this.budgets).map(agentType => this.getBudgetStatus(agentType))
    );

    return {
      budgets,
      summary: {
        total_agents: budgets.length,
        total_daily_budget: budgets.reduce((sum, b) => sum + b.daily_budget, 0),
        total_current_cost: budgets.reduce((sum, b) => sum + parseFloat(b.current_cost), 0),
        total_remaining: budgets.reduce((sum, b) => sum + parseFloat(b.remaining_budget), 0)
      }
    };
  }
}

const instance = new BudgetManager();

module.exports = instance;
module.exports.BUDGETS = instance.budgets;