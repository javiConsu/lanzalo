const express = require('express');
const router = express.Router();
const budgetManager = require('../services/budget-manager');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/budgets/summary - Get budget summary for all agents
 */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const data = await budgetManager.getAllBudgets();

    const totalDaily = data.summary.total_daily_budget || 0;
    const totalCurrent = data.summary.total_current_cost || 0;
    const totalRemaining = data.summary.total_remaining || 0;

    const summary = {
      total_agents: data.summary.total_agents,
      total_daily_budget: totalDaily,
      total_current_cost: totalCurrent,
      total_remaining: totalRemaining,
      cost_percentage_used: totalDaily > 0 ? ((totalCurrent / totalDaily) * 100).toFixed(2) : '0.00',
      remaining_percentage: totalDaily > 0 ? ((totalRemaining / totalDaily) * 100).toFixed(2) : '0.00'
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting budget summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/budgets - Get all global budgets (legacy)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await budgetManager.getAllBudgets();
    res.json(data);
  } catch (error) {
    console.error('Error getting budgets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/budgets/company/:companyId - Get company-scoped budgets
 */
router.get('/company/:companyId', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const budgets = await budgetManager.getCompanyBudgets(companyId);

    res.json({
      company_id: companyId,
      budgets,
      total: budgets.length
    });
  } catch (error) {
    console.error('Error getting company budgets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/budgets/:agentType/usage - Get usage history for an agent
 */
router.get('/:agentType/usage', requireAuth, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));

    const result = await pool.query(
      'SELECT * FROM agent_usage WHERE agent_type = $1 AND created_at >= $2 ORDER BY created_at DESC',
      [agentType, startDate]
    );

    res.json({
      agent_type: agentType,
      days: parseInt(days, 10),
      usage: result.rows
    });
  } catch (error) {
    console.error('Error getting usage history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/budgets/:agentType - Get budget status for a specific agent (legacy)
 */
router.get('/:agentType', requireAuth, async (req, res) => {
  try {
    const { agentType } = req.params;
    const status = await budgetManager.getBudgetStatus(agentType);
    res.json(status);
  } catch (error) {
    console.error('Error getting budget status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/budgets/:agentType - Update budget for a specific agent
 * Requires company_id because LAN budgets are company-scoped.
 */
router.put('/:agentType', requireAdmin, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { daily_budget, company_id } = req.body;

    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    if (!daily_budget || typeof daily_budget !== 'number' || daily_budget <= 0) {
      return res.status(400).json({ error: 'Invalid daily_budget. Must be a positive number.' });
    }

    const updated = await budgetManager.updateBudget(company_id, agentType, daily_budget);
    res.json({
      success: true,
      message: `Budget updated for ${agentType}`,
      company_id,
      data: updated
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
