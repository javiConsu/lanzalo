const express = require('express');
const router = express.Router();
const { runMigrations } = require('../migrate');

const MIGRATE_SECRET = process.env.MIGRATE_SECRET || 'lanzalo-migrate-2026';

async function handleMigrate(req, res) {
  const secret = req.body?.secret || req.query?.secret;

  if (secret !== MIGRATE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Pass ?secret=lanzalo-migrate-2026' });
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
}

router.post('/', handleMigrate);
router.get('/', handleMigrate);

module.exports = router;
