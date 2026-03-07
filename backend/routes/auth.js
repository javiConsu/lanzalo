/**
 * Rutas de autenticación
 */

const express = require('express');
const router = express.Router();
const { register, login, requireAuth } = require('../middleware/auth');

// ============================
// ENDPOINT DE PRUEBA - SIN AUTH
// ============================
router.post('/test-login', (req, res) => {
  console.log('[TEST] /api/auth/test-login recibido');
  console.log('[TEST] Body:', req.body);

  res.json({
    status: 'ok',
    message: 'Test endpoint funcionando!',
    timestamp: new Date().toISOString()
  });
});

/**
 * Registro de nuevo usuario
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y password son requeridos' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password debe tener al menos 8 caracteres' 
      });
    }

    const result = await register(email, password, name);

    res.json({// Quick test endpoint
