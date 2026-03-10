const express = require('express');
const router = express.Router();
const budgetManager = require('../services/budget-manager');
const { pool } = require('../db');

// Protect routes with middleware (TODO: implement proper auth middleware)
const authMiddleware = (req, res, next) => {
  // TODO: Add proper JWT authentication
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

/**
 * GET /api/budgets - Get all budgets
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const data = await budgetManager.getAllBudgets();
    res.json(data);
  } catch (error) {
    console.error('Error getting budgets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/budgets/:agentType - Get budget status for a specific agent
 */
router.get('/:agentType', authMiddleware, async (req, res) => {
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
 * GET /api/budgets/:agentType/usage - Get usage history for an agent
 */
router.get('/:agentType/usage', authMiddleware, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const result = await pool.query(
        'SELECT * FROM agent_usage WHERE agent_type = $1 AND created_at >= $2 ORDER BY created_at DESC',
        [agentType, startDate]
      );
      const usage = result.rows;

    res.json({
      agent_type: agentType,
      days,
      usage
    });
  } catch (error) {
    console.error('Error getting usage history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/budgets/:agentType - Update budget for a specific agent
 */
router.put('/:agentType', authMiddleware, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { daily_budget } = req.body;

    if (!daily_budget || typeof daily_budget !== 'number' || daily_budget <= 0) {
      return res.status(400).json({ error: 'Invalid daily_budget. Must be a positive number.' });
    }

    const updated = await budgetManager.updateBudget(agentType, daily_budget);
    res.json({
      success: true,
      message: `Budget updated for ${agentType}`,
      data: updated
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/budgets/summary - Get budget summary for all agents
 */
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const data = await budgetManager.getAllBudgets();

    const summary = {
      total_agents: data.summary.total_agents,
      total_daily_budget: data.summary.total_daily_budget,
      total_current_cost: data.summary.total_current_cost,
      total_remaining: data.summary.total_remaining,
      cost_percentage_used: ((data.summary.total_current_cost / data.summary.total_daily_budget) * 100).toFixed(2),
      remaining_percentage: ((data.summary.total_remaining / data.summary.total_daily_budget) * 100).toFixed(2)
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting budget summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
