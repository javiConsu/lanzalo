/**
 * Login por Email con enlace mágico
 */
const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = express.Router();
const { pool } = require('../db');

// Configuración de email (usando Resend)
const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.RESEND_API_KEY,
    pass: process.env.RESEND_API_KEY
  }
});

// Generar token único
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * GET /login/email
 * Muestra formulario de email
 */
router.get('/email', (req, res) => {
  res.sendFile('/home/javi/.openclaw/workspace/lanzalo/backend/login.html', { root: __dirname });
});

/**
 * POST /api/login/send-link
 * Envía email con link de acceso
 */
router.post('/api/login/send-link', async (req, res) => {
  try {
    console.log('📨 recibiendo email:', req.body.email);
    const { email } = req.body;
    console.log('🔑 generando token...');

    const token = generateToken();
    console.log('💾 guardando token en BD...');

    // Guardar token en la base de datos con expiración de 24h
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO login_tokens (email, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET
         token = $2,
         expires_at = $3`,
      [email.toLowerCase(), token, expiresAt]
    );

    console.log('📧 enviando email...');

    // Enviar email
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.lanzalo.pro';
    const loginLink = `${frontendUrl}/auth/verify?token=${token}`;

    await transporter.sendMail({
      from: 'Lanzalo <onboarding@lanzalo.pro>',
      to: email.toLowerCase(),
      subject: 'Acceso a Lanzalo — Haz clic para entrar',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4a90e2;">🚀 Accede a Lanzalo</h1>
          <p>Hola 👋</p>
          <p>Has solicitado acceso a Lanzalo. Haz clic en el siguiente enlace para entrar:</p>
          <a href="${loginLink}" style="display: inline-block; background: #4a90e2; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            🎯 Entrar a Lanzalo
          </a>
          <p style="font-size: 12px; color: #888; margin-top: 20px;">
            Si no solicitaste acceso, puedes ignorar este email.
          </p>
        </div>
      `
    });

    console.log('✅ email enviado con éxito');

    res.json({
      success: true,
      message: 'Email enviado correctamente',
      email: email.toLowerCase()
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({ error: 'Error al enviar el email. Por favor, inténtalo de nuevo.' });
  }
});

/**
 * GET /auth/verify?token=XXX
 * Verifica el token y redirige al dashboard
 */
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'No se proporcionó un token de acceso.' });
    }

    // Buscar token en la base de datos
    const result = await pool.query(
      `SELECT email, expires_at FROM login_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'El enlace de acceso ha expirado o no es válido.' });
    }

    // Token válido → Login exitoso
    const user = result.rows[0];

    // Generar JWT
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const jwtToken = jwt.sign(
      { email: user.email },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Guardar en localStorage con JavaScript
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Accediendo...</title>
        <script>
          localStorage.setItem('token', '${jwtToken}');
          localStorage.setItem('user', JSON.stringify({
            email: '${user.email}'
          }));
          alert('✅ ¡Bienvenido! Redirigiendo al dashboard...');
          window.location.href = '/';
        </script>
      </head>
      <body>
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #111; color: #fff; font-family: Arial, sans-serif;">
          Cargando...
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).send('Error al verificar el enlace.');
  }
});

module.exports = router;
