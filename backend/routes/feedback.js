/**
 * User Feedback Routes
 * 
 * Thumbs up/down on tasks and CEO messages.
 * Feeds into Growth Agent analysis and memory curation.
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const { pool } = require('../db');
const crypto = require('crypto');

router.use(requireAuth);

/**
 * Submit feedback on a chat message (thumbs up/down)
 */
router.post('/companies/:companyId/chat/:messageId/feedback', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId, messageId } = req.params;
    const { rating, comment } = req.body; // rating: 'positive' | 'negative'

    if (!['positive', 'negative'].includes(rating)) {
      return res.status(400).json({ error: 'Rating debe ser "positive" o "negative"' });
    }

    // Ensure feedback table exists
    await ensureFeedbackTable();

    // Upsert feedback (one feedback per user per message)
    await pool.query(
      `INSERT INTO user_feedback (id, company_id, user_id, entity_type, entity_id, rating, comment, created_at)
       VALUES ($1, $2, $3, 'chat_message', $4, $5, $6, NOW())
       ON CONFLICT (user_id, entity_type, entity_id)
       DO UPDATE SET rating = $5, comment = $6, updated_at = NOW()`,
      [crypto.randomUUID(), companyId, req.user.id, messageId, rating, comment || null]
    );

    // If negative, update memory Layer 2 to track preferences
    if (rating === 'negative' && comment) {
      try {
        const MemorySystem = require('../../agents/memory-system');
        const memory = new MemorySystem(companyId);
        const layer2 = await memory.getLayer2();
        const negFeedback = layer2.negativeFeedback || [];
        negFeedback.push({
          context: 'chat_message',
          comment,
          date: new Date().toISOString()
        });
        await memory.updateLayer2({
          ...layer2,
          negativeFeedback: negFeedback.slice(-10) // Keep last 10
        });
      } catch (e) {
        // Silencioso — feedback es un plus
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Feedback] Error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Submit feedback on a task (thumbs up/down)
 */
router.post('/companies/:companyId/tasks/:taskId/feedback', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId, taskId } = req.params;
    const { rating, comment } = req.body;

    if (!['positive', 'negative'].includes(rating)) {
      return res.status(400).json({ error: 'Rating debe ser "positive" o "negative"' });
    }

    await ensureFeedbackTable();

    await pool.query(
      `INSERT INTO user_feedback (id, company_id, user_id, entity_type, entity_id, rating, comment, created_at)
       VALUES ($1, $2, $3, 'task', $4, $5, $6, NOW())
       ON CONFLICT (user_id, entity_type, entity_id)
       DO UPDATE SET rating = $5, comment = $6, updated_at = NOW()`,
      [crypto.randomUUID(), companyId, req.user.id, taskId, rating, comment || null]
    );

    // Track in memory for learning
    if (rating === 'negative') {
      try {
        // Get task info for context
        const taskResult = await pool.query(
          'SELECT title, tag FROM tasks WHERE id = $1',
          [taskId]
        );
        const task = taskResult.rows[0];
        if (task) {
          const MemorySystem = require('../../agents/memory-system');
          const memory = new MemorySystem(companyId);
          const layer2 = await memory.getLayer2();
          const negTasks = layer2.negativeTaskFeedback || [];
          negTasks.push({
            taskTitle: task.title,
            agent: task.tag,
            comment,
            date: new Date().toISOString()
          });
          await memory.updateLayer2({
            ...layer2,
            negativeTaskFeedback: negTasks.slice(-10)
          });
        }
      } catch (e) {
        // Silencioso
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Feedback] Error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Get feedback stats for a company
 */
router.get('/companies/:companyId/feedback/stats', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      `SELECT 
         entity_type,
         COUNT(CASE WHEN rating = 'positive' THEN 1 END) as positive,
         COUNT(CASE WHEN rating = 'negative' THEN 1 END) as negative,
         COUNT(*) as total
       FROM user_feedback
       WHERE company_id = $1
       GROUP BY entity_type`,
      [companyId]
    );

    const recentNegative = await pool.query(
      `SELECT entity_type, entity_id, comment, created_at
       FROM user_feedback
       WHERE company_id = $1 AND rating = 'negative' AND comment IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 5`,
      [companyId]
    );

    res.json({
      stats: result.rows,
      recentNegative: recentNegative.rows
    });
  } catch (error) {
    console.error('[Feedback] Stats error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ensure feedback table exists
 */
async function ensureFeedbackTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id UUID PRIMARY KEY,
        company_id UUID NOT NULL,
        user_id UUID NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        rating VARCHAR(20) NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, entity_type, entity_id)
      )
    `);
  } catch (e) {
    // Table already exists or creation failed — either way, proceed
  }
}

module.exports = router;
