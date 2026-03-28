/**
 * Budget Manager Service
 * Handles budget allocation, usage tracking, and auto-pause
 */

const { pool } = require('../db');

class BudgetManager {
  constructor() {
    this.budgets = {
      CEO: { total: 4.0, color: 'purple' },
      CTO: { total: 8.0, color: 'blue' },
      Marketing: { total: 4.0, color: 'green' },
      Twitter: { total: 2.0, color: 'orange' },
      Email: { total: 2.0, color: 'pink' },
      Data: { total: 4.0, color: 'teal' },
      Trends: { total: 2.0, color: 'violet' },
      Code: { total: 6.0, color: 'indigo' }
    };
  }

  normalizeAgentRole(agentRole) {
    if (!agentRole) return agentRole;
    if (agentRole === 'code') return 'Code';
    return String(agentRole);
  }

  getDefaultBudgetTotal(agentRole) {
    const normalized = this.normalizeAgentRole(agentRole);
    return this.budgets[normalized]?.total || 2.0;
  }

  estimateCost(tokensUsed = 0, hoursUsed = 0, agentRole = 'CEO') {
    const totalBudget = this.getDefaultBudgetTotal(agentRole);
    return (tokensUsed * 0.00015) + (hoursUsed * totalBudget / 24);
  }

  /**
   * Ensure a company-scoped budget row exists for the agent role.
   */
  async ensureBudget(companyId, agentRole, metricType = 'dollars') {
    const normalizedRole = this.normalizeAgentRole(agentRole);
    const existing = await pool.query(
      `SELECT *
       FROM budget_history
       WHERE company_id = $1 AND agent_role = $2
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [companyId, normalizedRole]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const inserted = await pool.query(
      `INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
       VALUES ($1, $2, 0, $3, $4, NOW())
       RETURNING *`,
      [companyId, normalizedRole, this.getDefaultBudgetTotal(normalizedRole), metricType]
    );

    return inserted.rows[0];
  }

  /**
   * Get current budget for an agent in a company.
   */
  async getBudget(companyId, agentRole) {
    try {
      const budget = await this.ensureBudget(companyId, agentRole);
      return {
        id: budget.id,
        company_id: budget.company_id,
        agent_role: budget.agent_role,
        used: parseFloat(budget.used_amount || 0),
        total: parseFloat(budget.total_amount || 0),
        metric_type: budget.metric_type,
        last_recorded_at: budget.recorded_at
      };
    } catch (error) {
      console.error('BudgetManager.getBudget error:', error);
      return {
        company_id: companyId,
        agent_role: this.normalizeAgentRole(agentRole),
        used: 0,
        total: this.getDefaultBudgetTotal(agentRole),
        metric_type: 'dollars'
      };
    }
  }

  /**
   * Record budget usage for a specific company and agent role.
   */
  async recordCompanyUsage(companyId, agentRole, amount, metricType = 'dollars') {
    try {
      const current = await this.getBudget(companyId, agentRole);
      const nextUsed = current.used + amount;

      if (nextUsed > current.total) {
        console.warn(`⚠️ Budget exceeded for ${agentRole} in company ${companyId}: ${nextUsed} > ${current.total}`);
        return {
          success: false,
          exceeded: true,
          used: current.used,
          total: current.total,
          remaining: Math.max(0, current.total - current.used),
          message: 'Budget exceeded - agent should be paused'
        };
      }

      const result = await pool.query(
        `INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [companyId, this.normalizeAgentRole(agentRole), nextUsed, current.total, metricType]
      );

      return {
        success: true,
        exceeded: false,
        company_id: result.rows[0].company_id,
        agent_role: result.rows[0].agent_role,
        used: parseFloat(result.rows[0].used_amount),
        total: parseFloat(result.rows[0].total_amount),
        remaining: Math.max(0, parseFloat(result.rows[0].total_amount) - parseFloat(result.rows[0].used_amount))
      };
    } catch (error) {
      console.error('BudgetManager.recordCompanyUsage error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update budget manually for a company/agent role.
   */
  async updateBudget(companyId, agentRole, totalAmount) {
    try {
      const current = await this.getBudget(companyId, agentRole);
      const result = await pool.query(
        `INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [companyId, this.normalizeAgentRole(agentRole), current.used, totalAmount, current.metric_type || 'dollars']
      );

      return { success: true, budget: result.rows[0] };
    } catch (error) {
      console.error('BudgetManager.updateBudget error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get latest budgets for all roles in a company.
   */
  async getCompanyBudgets(companyId) {
    try {
      const result = await pool.query(
        `SELECT DISTINCT ON (agent_role)
            id, company_id, agent_role, used_amount, total_amount, metric_type, recorded_at
         FROM budget_history
         WHERE company_id = $1
         ORDER BY agent_role, recorded_at DESC`,
        [companyId]
      );

      return result.rows.map(row => ({
        id: row.id,
        company_id: row.company_id,
        agent_role: row.agent_role,
        role: row.agent_role,
        used: parseFloat(row.used_amount),
        total: parseFloat(row.total_amount),
        metric_type: row.metric_type,
        recorded_at: row.recorded_at
      }));
    } catch (error) {
      console.error('BudgetManager.getCompanyBudgets error:', error);
      return [];
    }
  }

  async canUseBudget(companyId, agentRole, amount) {
    const budget = await this.getBudget(companyId, agentRole);
    return (budget.used + amount) <= budget.total;
  }

  /**
   * Legacy-compatible budget check for non-company-scoped callers.
   */
  async checkBudget(agentType, tokensUsed = 0, hoursUsed = 0) {
    const normalized = this.normalizeAgentRole(agentType);
    const dailyBudget = this.getDefaultBudgetTotal(normalized);
    const estimatedCost = this.estimateCost(tokensUsed, hoursUsed, normalized);

    if (estimatedCost >= dailyBudget) {
      return {
        allowed: false,
        current_cost: estimatedCost.toFixed(4),
        daily_budget: dailyBudget,
        remaining_budget: Math.max(0, dailyBudget - estimatedCost).toFixed(4),
        error: 'Budget exceeded'
      };
    }

    return {
      allowed: true,
      current_cost: estimatedCost.toFixed(4),
      daily_budget: dailyBudget,
      remaining_budget: Math.max(0, dailyBudget - estimatedCost).toFixed(4)
    };
  }

  /**
   * Legacy-compatible usage recorder. Supports both:
   *   recordUsage(agentType, tokensUsed, hoursUsed)
   *   recordUsage(companyId, agentRole, amount, metricType)
   */
  async recordUsage(arg1, arg2 = 0, arg3 = 0, arg4 = 'dollars') {
    if (typeof arg1 === 'string' && /^[0-9a-fA-F-]{36}$/.test(arg1) && typeof arg2 === 'string') {
      return this.recordCompanyUsage(arg1, arg2, Number(arg3) || 0, arg4 || 'dollars');
    }

    const agentType = this.normalizeAgentRole(arg1);
    const tokensUsed = Number(arg2) || 0;
    const hoursUsed = Number(arg3) || 0;

    try {
      await pool.query(
        `INSERT INTO agent_usage (agent_type, company_id, total_tokens, total_hours)
         VALUES ($1, NULL, $2, $3)
         ON CONFLICT (agent_type, company_id)
         DO UPDATE SET total_tokens = agent_usage.total_tokens + $2,
                      total_hours = agent_usage.total_hours + $3`,
        [agentType, tokensUsed, hoursUsed]
      );

      return { success: true };
    } catch (error) {
      console.error('[BudgetManager] Error recording legacy usage:', error);
      return { success: false, error: error.message };
    }
  }

  async getBudgetStatus(agentType) {
    const normalized = this.normalizeAgentRole(agentType);
    const dailyBudget = this.getDefaultBudgetTotal(normalized);

    try {
      const result = await pool.query(
        'SELECT total_tokens, total_hours FROM agent_usage WHERE agent_type = $1 ORDER BY created_at DESC LIMIT 1',
        [normalized]
      );

      const usage = result.rows[0] || { total_tokens: 0, total_hours: 0 };
      const estimatedCost = this.estimateCost(usage.total_tokens, usage.total_hours, normalized);
      const remaining = Math.max(0, dailyBudget - estimatedCost);

      return {
        agent_type: normalized,
        name: normalized,
        daily_budget: dailyBudget,
        hourly_cost: dailyBudget / 24,
        token_cost: 0.00015,
        current_cost: estimatedCost.toFixed(4),
        remaining_budget: remaining.toFixed(4),
        status: remaining < 1 ? 'warning' : 'ok'
      };
    } catch (error) {
      console.error('[BudgetManager] Error getting budget status:', error);
      return {
        agent_type: normalized,
        name: normalized,
        daily_budget: dailyBudget,
        hourly_cost: dailyBudget / 24,
        token_cost: 0.00015,
        current_cost: '0.0000',
        remaining_budget: dailyBudget.toFixed(4),
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
module.exports.BudgetManager = BudgetManager;
