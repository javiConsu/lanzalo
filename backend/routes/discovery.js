/**
 * Strategic Discovery Routes
 * CEO Agent's deep discovery mode
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { 
  getAllQuestions,
  getQuestionsByCategory,
  analyzeDiscoverySession,
  formatAnalysisForDisplay 
} = require('../../agents/strategic-discovery');

/**
 * GET /api/discovery/questions
 * Get all discovery questions
 */
router.get('/questions', authenticate, async (req, res) => {
  try {
    const questions = getAllQuestions();
    
    res.json({
      total: questions.length,
      questions
    });
  } catch (error) {
    console.error('[Discovery] Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

/**
 * GET /api/discovery/questions/:category
 * Get questions by category
 */
router.get('/questions/:category', authenticate, async (req, res) => {
  try {
    const { category } = req.params;
    const questions = getQuestionsByCategory(category);
    
    if (!questions.length) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({
      category,
      questions
    });
  } catch (error) {
    console.error('[Discovery] Error fetching category questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

/**
 * POST /api/discovery/submit
 * Submit discovery responses and get strategic analysis
 */
router.post('/submit', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { responses } = req.body;

    if (!responses || Object.keys(responses).length === 0) {
      return res.status(400).json({ error: 'No responses provided' });
    }

    console.log(`[Discovery] User ${userId} submitted discovery session`);

    // Analyze with LLM
    const analysis = await analyzeDiscoverySession(userId, responses);

    // Save to database
    await pool.query(
      `UPDATE users 
       SET discovery_responses = $1,
           discovery_analysis = $2,
           discovery_completed_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(responses), JSON.stringify(analysis), userId]
    );

    // Format for display
    const formatted = formatAnalysisForDisplay(analysis);

    res.json({
      success: true,
      analysis,
      formatted
    });

  } catch (error) {
    console.error('[Discovery] Error analyzing session:', error);
    res.status(500).json({ error: 'Failed to analyze discovery session' });
  }
});

/**
 * GET /api/discovery/status
 * Check if user has completed discovery
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
         discovery_completed_at,
         discovery_analysis
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    res.json({
      completed: !!user.discovery_completed_at,
      completedAt: user.discovery_completed_at,
      hasAnalysis: !!user.discovery_analysis
    });

  } catch (error) {
    console.error('[Discovery] Error checking status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * GET /api/discovery/analysis
 * Get user's strategic analysis
 */
router.get('/analysis', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT discovery_analysis
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user.discovery_analysis) {
      return res.status(404).json({ error: 'No analysis found' });
    }

    const analysis = user.discovery_analysis;
    const formatted = formatAnalysisForDisplay(analysis);

    res.json({
      analysis,
      formatted
    });

  } catch (error) {
    console.error('[Discovery] Error fetching analysis:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

/**
 * POST /api/discovery/select-path
 * User selects a strategic path from analysis
 */
router.post('/select-path', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { pathName } = req.body;

    if (!pathName) {
      return res.status(400).json({ error: 'Path name required' });
    }

    // Get user's analysis
    const result = await pool.query(
      `SELECT discovery_analysis FROM users WHERE id = $1`,
      [userId]
    );

    const analysis = result.rows[0]?.discovery_analysis;
    
    if (!analysis) {
      return res.status(404).json({ error: 'No analysis found' });
    }

    // Find selected path
    const selectedPath = analysis.paths.find(p => p.name === pathName);

    if (!selectedPath) {
      return res.status(404).json({ error: 'Path not found' });
    }

    // Save selected path
    await pool.query(
      `UPDATE users 
       SET selected_path = $1,
           selected_path_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(selectedPath), userId]
    );

    console.log(`[Discovery] User ${userId} selected path: ${pathName}`);

    res.json({
      success: true,
      selectedPath
    });

  } catch (error) {
    console.error('[Discovery] Error selecting path:', error);
    res.status(500).json({ error: 'Failed to select path' });
  }
});

module.exports = router;
