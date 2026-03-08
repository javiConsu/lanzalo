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

    res.json({
      status: 'ok',
      message: 'Usuario registrado correctamente',
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role
      }
    });
  } catch (error) {
    console.error('[REGISTER ERROR]', error);
    res.status(500).json({
      error: error.message || 'Error al registrar usuario'
    });
  }
});

/**
 * Login de usuario
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y password son requeridos'
      });
    }

    const result = await login(email, password);

    res.json({
      status: 'ok',
      message: 'Login exitoso',
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role
      }
    });
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.status(401).json({
      error: error.message || 'Credenciales inválidas'
    });
  }
});

/**
 * Validar token (requiere autenticación)
 */
router.get('/verify', requireAuth, (req, res) => {
  res.json({
    status: 'ok',
    message: 'Token válido',
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    }
  });
});

module.exports = router;