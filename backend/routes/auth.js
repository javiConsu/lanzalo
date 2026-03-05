/**
 * Rutas de autenticación (placeholder - implementar según necesidad)
 */

const express = require('express');
const router = express.Router();

// TODO: Implementar autenticación real (JWT, OAuth, etc.)

router.post('/login', (req, res) => {
  res.json({ message: 'Auth no implementado aún' });
});

router.post('/register', (req, res) => {
  res.json({ message: 'Auth no implementado aún' });
});

module.exports = router;
