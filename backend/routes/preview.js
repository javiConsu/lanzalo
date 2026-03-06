/**
 * Preview Routes
 * Generate, view, approve/reject build previews
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateBuildPreview } = require('../../agents/preview-generator');

/**
 * POST /api/preview/generate
 * Generate build preview from Discovery analysis
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { companyId, discoveryAnalysis, selectedPath } = req.body;

    if (!companyId || !discoveryAnalysis || !selectedPath) {
      return res.status(400).json({ 
        error: 'companyId, discoveryAnalysis, and selectedPath required' 
      });
    }

    console.log(`[Preview] Generating preview for company ${companyId}`);

    // Generate preview with AI
    const previewData = await generateBuildPreview({
      discoveryAnalysis,
      selectedPath,
      companyId
    });

    // Save to database
    const result = await pool.query(
      `INSERT INTO build_previews 
       (company_id, user_id, title, description, industry, template_id,
        preview_data, preview_html, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [
        companyId,
        userId,
        previewData.title,
        previewData.description,
        previewData.industry,
        previewData.template_id,
        JSON.stringify(previewData),
        previewData.preview_html
      ]
    );

    const preview = result.rows[0];

    // Save initial version
    await pool.query(
      `INSERT INTO preview_versions 
       (preview_id, version_number, preview_data, preview_html, changes_from_previous)
       VALUES ($1, 1, $2, $3, 'Initial preview')`,
      [preview.id, JSON.stringify(previewData), previewData.preview_html]
    );

    console.log(`[Preview] Generated preview ${preview.id}`);

    res.json({
      success: true,
      preview: {
        id: preview.id,
        ...previewData
      }
    });

  } catch (error) {
    console.error('[Preview] Error generating:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

/**
 * GET /api/preview/:id
 * Get preview details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT p.*, c.name as company_name
       FROM build_previews p
       JOIN companies c ON p.company_id = c.id
       WHERE p.id = $1 AND p.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preview not found' });
    }

    const preview = result.rows[0];

    // Get versions
    const versionsResult = await pool.query(
      `SELECT * FROM preview_versions
       WHERE preview_id = $1
       ORDER BY version_number DESC`,
      [id]
    );

    // Get feedback
    const feedbackResult = await pool.query(
      `SELECT f.*, u.name as user_name
       FROM preview_feedback f
       LEFT JOIN users u ON f.user_id = u.id
       WHERE f.preview_id = $1
       ORDER BY f.created_at DESC`,
      [id]
    );

    res.json({
      preview,
      versions: versionsResult.rows || [],
      feedback: feedbackResult.rows || []
    });

  } catch (error) {
    console.error('[Preview] Error fetching:', error);
    res.status(500).json({ error: 'Failed to fetch preview' });
  }
});

/**
 * POST /api/preview/:id/approve
 * Approve preview and start build
 */
router.post('/:id/approve', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Update preview status
    const result = await pool.query(
      `UPDATE build_previews 
       SET status = 'approved', approved_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preview not found' });
    }

    const preview = result.rows[0];

    // Link preview to company
    await pool.query(
      `UPDATE companies SET preview_id = $1 WHERE id = $2`,
      [id, preview.company_id]
    );

    // Create build tasks from preview
    const previewData = preview.preview_data;
    
    // TODO: Create tasks for Code Agent, Design Agent, etc.
    // Based on preview_data structure

    console.log(`[Preview] Approved ${id}, creating build tasks...`);

    res.json({
      success: true,
      message: 'Preview approved, build started',
      preview
    });

  } catch (error) {
    console.error('[Preview] Error approving:', error);
    res.status(500).json({ error: 'Failed to approve preview' });
  }
});

/**
 * POST /api/preview/:id/reject
 * Reject preview
 */
router.post('/:id/reject', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    await pool.query(
      `UPDATE build_previews 
       SET status = 'rejected', 
           rejected_at = NOW(),
           rejection_reason = $3
       WHERE id = $1 AND user_id = $2`,
      [id, userId, reason || 'User rejected']
    );

    // Save feedback
    await pool.query(
      `INSERT INTO preview_feedback 
       (preview_id, user_id, feedback_type, feedback_text)
       VALUES ($1, $2, 'reject', $3)`,
      [id, userId, reason]
    );

    console.log(`[Preview] Rejected ${id}`);

    res.json({
      success: true,
      message: 'Preview rejected'
    });

  } catch (error) {
    console.error('[Preview] Error rejecting:', error);
    res.status(500).json({ error: 'Failed to reject preview' });
  }
});

/**
 * POST /api/preview/:id/iterate
 * Request changes to preview
 */
router.post('/:id/iterate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { changes } = req.body;

    if (!changes) {
      return res.status(400).json({ error: 'changes required' });
    }

    // Save feedback
    await pool.query(
      `INSERT INTO preview_feedback 
       (preview_id, user_id, feedback_type, feedback_text, changes_requested)
       VALUES ($1, $2, 'iterate', $3, $4)`,
      [id, userId, changes.text || 'User requested changes', JSON.stringify(changes)]
    );

    console.log(`[Preview] Iteration requested for ${id}`);

    // TODO: Regenerate preview with changes
    // Call preview-generator with changes context

    res.json({
      success: true,
      message: 'Changes requested, generating new version...'
    });

  } catch (error) {
    console.error('[Preview] Error iterating:', error);
    res.status(500).json({ error: 'Failed to request changes' });
  }
});

/**
 * GET /api/preview/company/:companyId
 * Get all previews for a company
 */
router.get('/company/:companyId', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM build_previews
       WHERE company_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [companyId, userId]
    );

    res.json({
      previews: result.rows || []
    });

  } catch (error) {
    console.error('[Preview] Error fetching company previews:', error);
    res.status(500).json({ error: 'Failed to fetch previews' });
  }
});

module.exports = router;
