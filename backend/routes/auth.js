/**
 * Rutas de autenticación
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { register, login, requireAuth } = require('../middleware/auth');
const { pool } = require('../db');
const { Resend } = require('resend');
const { captureServerEvent } = require('../services/posthog');

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { email, password, name, referralCode } = req.body;

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

    // Track referral if provided
    if (referralCode) {
      try {
        const referrer = await pool.query('SELECT id FROM users WHERE referral_code = $1', [referralCode.toUpperCase()]);
        if (referrer.rows[0]) {
          await pool.query(
            'UPDATE users SET referred_by = $1 WHERE id = $2',
            [referrer.rows[0].id, result.user.id]
          );
        }
      } catch(e) { /* silencioso — no bloquear registro */ }
    }

    // Trackear registro en PostHog (server-side)
    captureServerEvent(String(result.user.id), 'user_registered', {
      email: result.user.email,
      plan: 'trial',
      origin: referralCode ? 'referral' : 'organic',
    });

    res.json({
      status: 'ok',
      message: 'Usuario registrado correctamente',
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role
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

// ============================
// FORGOT PASSWORD
// ============================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email es requerido' });

    // Always respond OK (don't reveal if email exists)
    const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userResult.rows.length === 0) {
      return res.json({ status: 'ok', message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' });
    }

    const user = userResult.rows[0];

    // Invalidate any existing tokens for this user
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.lanzalo.pro';
    const resetUrl = `${frontendUrl}?reset_token=${token}`;

    // Send email via Resend
    await resend.emails.send({
      from: 'Lanzalo <noreply@lanzalo.pro>',
      to: [user.email],
      subject: 'Restablecer contraseña - Lanzalo',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #10b981; margin-bottom: 16px;">🚀 Lanzalo</h2>
          <p style="color: #e5e7eb; font-size: 16px;">Hola,</p>
          <p style="color: #9ca3af; font-size: 14px;">Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">Restablecer contraseña</a>
          <p style="color: #6b7280; font-size: 12px;">Este enlace expira en 30 minutos. Si no solicitaste esto, ignora este email.</p>
        </div>
      `
    });

    console.log(`[FORGOT-PASSWORD] Reset email sent to ${user.email}`);
    res.json({ status: 'ok', message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' });
  } catch (error) {
    console.error('[FORGOT-PASSWORD ERROR]', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// ============================
// RESET PASSWORD
// ============================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

    // Validate token
    const tokenResult = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Enlace inválido o expirado. Solicita uno nuevo.' });
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password (column is password_hash, not password)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, resetToken.user_id]);

    // Mark token as used
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetToken.id]);

    console.log(`[RESET-PASSWORD] Password reset for user_id=${resetToken.user_id}`);
    res.json({ status: 'ok', message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('[RESET-PASSWORD ERROR]', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

module.exports = router;