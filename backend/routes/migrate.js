const express = require('express');
const router = express.Router();
const { runMigrations } = require('../migrate');

// Endpoint para ejecutar migraciones (protegido por secret)
// POST /api/migrate { secret: 'MIGRATE_SECRET' }
router.post('/', async (req, res) => {
  const { secret } = req.body;
  const MIGRATE_SECRET = process.env.MIGRATE_SECRET || 'lanzalo-migrate-2026';

  if (secret !== MIGRATE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[MIGRATE] Starting migrations...');
    const results = await runMigrations();
    console.log('[MIGRATE] Done:', results);
    const errors = results.filter(r => r.status.startsWith('error'));
    res.json({
      success: errors.length === 0,
      results,
      errors
    });
  } catch (err) {
    console.error('[MIGRATE] Fatal error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
