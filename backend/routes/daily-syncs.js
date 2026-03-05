/**
 * Daily Syncs API Routes
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { runSyncNow } = require('../../agents/daily-sync');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/user/companies/:companyId/syncs
 * Get daily sync history for a company
 */
router.get('/companies/:companyId/syncs', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const limit = parseInt(req.query.limit) || 30;
    
    const result = await pool.query(
      `SELECT * FROM daily_syncs 
       WHERE company_id = ? 
       ORDER BY sync_date DESC 
       LIMIT ?`,
      [companyId, limit]
    );
    
    const syncs = result.rows.map(row => ({
      id: row.id,
      companyId: row.company_id,
      syncDate: row.sync_date,
      summary: row.summary,
      wins: JSON.parse(row.wins || '[]'),
      issues: JSON.parse(row.issues || '[]'),
      trends: JSON.parse(row.trends || '{}'),
      decisions: JSON.parse(row.decisions || '[]'),
      recommendations: JSON.parse(row.recommendations || '[]'),
      createdAt: row.created_at
    }));
    
    res.json({ syncs });
    
  } catch (error) {
    console.error('[Daily Syncs API] Error getting syncs:', error);
    res.status(500).json({ error: 'Failed to get daily syncs' });
  }
});

/**
 * GET /api/user/companies/:companyId/syncs/:syncId
 * Get detailed daily sync with agent reports
 */
router.get('/companies/:companyId/syncs/:syncId', authenticate, async (req, res) => {
  try {
    const { syncId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM daily_syncs WHERE id = ?',
      [syncId]
    );
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Sync not found' });
    }
    
    const row = result.rows[0];
    
    const sync = {
      id: row.id,
      companyId: row.company_id,
      syncDate: row.sync_date,
      summary: row.summary,
      wins: JSON.parse(row.wins || '[]'),
      issues: JSON.parse(row.issues || '[]'),
      trends: JSON.parse(row.trends || '{}'),
      decisions: JSON.parse(row.decisions || '[]'),
      recommendations: JSON.parse(row.recommendations || '[]'),
      agentReports: JSON.parse(row.agent_reports || '[]'),
      metricsSnapshot: JSON.parse(row.metrics_snapshot || '[]'),
      createdAt: row.created_at
    };
    
    res.json(sync);
    
  } catch (error) {
    console.error('[Daily Syncs API] Error getting sync detail:', error);
    res.status(500).json({ error: 'Failed to get sync detail' });
  }
});

/**
 * POST /api/user/companies/:companyId/syncs/run
 * Manually trigger daily sync (for testing)
 */
router.post('/companies/:companyId/syncs/run', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    console.log(`[Daily Syncs API] Manual sync triggered for company ${companyId}`);
    
    // Run sync asynchronously
    runSyncNow(companyId)
      .then(() => console.log(`[Daily Syncs API] Sync completed for ${companyId}`))
      .catch(error => console.error(`[Daily Syncs API] Sync failed:`, error));
    
    res.json({ 
      success: true, 
      message: 'Daily sync started. Check back in a few seconds.' 
    });
    
  } catch (error) {
    console.error('[Daily Syncs API] Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

/**
 * PATCH /api/user/companies/:companyId/sync-settings
 * Update daily sync settings
 */
router.patch('/companies/:companyId/sync-settings', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { enabled, time } = req.body;
    
    const updates = [];
    const values = [];
    
    if (typeof enabled === 'boolean') {
      updates.push('daily_sync_enabled = ?');
      values.push(enabled);
    }
    
    if (time && /^\d{2}:\d{2}$/.test(time)) {
      updates.push('daily_sync_time = ?');
      values.push(time);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    values.push(companyId);
    
    await pool.query(
      `UPDATE companies SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('[Daily Syncs API] Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update sync settings' });
  }
});

module.exports = router;
