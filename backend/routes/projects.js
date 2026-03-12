/**
 * Projects routes — MVP Cofundador modelo unificado Project/Idea
 * Stub creado para desbloquear deploy de Railway.
 * TODO: implementar CRUD de proyectos si se necesita.
 */
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

// Placeholder — devuelve lista vacia hasta implementar
router.get('/', requireAuth, async (req, res) => {
  res.json({ projects: [], message: 'Projects endpoint — coming soon' });
});

module.exports = router;
