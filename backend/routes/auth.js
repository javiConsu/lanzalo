/**
 * Rutas de autenticación
 */

const express = require('express');
const router = express.Router();
const { register, login, requireAuth } = require('../middleware/auth');

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
      user: result.user,
      token: result.token,
      message: 'Usuario creado exitosamente'
    });

  } catch (error) {
    console.error('Error en registro:', error);
    
    if (error.message === 'Email ya registrado') {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Login
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
      user: result.user,
      token: result.token,
      message: 'Login exitoso'
    });

  } catch (error) {
    console.error('Error en login:', error);

    if (error.message === 'Credenciales inválidas') {
      return res.status(401).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Verificar token (útil para refresh)
 */
router.get('/verify', requireAuth, (req, res) => {
  res.json({ 
    user: req.user,
    valid: true 
  });
});

/**
 * Logout (opcional - invalidar token del lado del cliente)
 */
router.post('/logout', requireAuth, (req, res) => {
  // En implementación con JWT, el cliente debe eliminar el token
  // Si usas sesiones, aquí las invalidarías
  res.json({ message: 'Logout exitoso' });
});

/**
 * Admin: reset password de un usuario (protegido con MIGRATE_SECRET)
 */
router.post('/admin/reset-password', async (req, res) => {
  const { secret, email, newPassword } = req.body;
  if (secret !== (process.env.MIGRATE_SECRET || 'lanzalo-migrate-2026')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const bcrypt = require('bcrypt');
    const { pool } = require('../db');
    const hash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [hash, email.toLowerCase()]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true, email: result.rows[0].email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
