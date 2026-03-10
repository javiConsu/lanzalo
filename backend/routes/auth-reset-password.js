/**
 * Rutas para recuperación de contraseña
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'lanzalo-secret-key-change-in-production';
const JWT_RESET_EXPIRATION = '24h';

// Configurar transporter de email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Solicitar recuperación de contraseña
 * POST /api/auth/reset-password-request
 */
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    // Buscar usuario por email
    const result = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // No revelar si el email existe o no (seguridad)
      return res.json({ success: true, message: 'Si el email existe, recibirás un link de recuperación' });
    }

    const user = result.rows[0];

    // Generar token de reset
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password-reset' },
      JWT_SECRET,
      { expiresIn: JWT_RESET_EXPIRATION }
    );

    // Guardar token en la base de datos con expiración de 1 hora
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')
       ON CONFLICT (user_id) DO UPDATE
       SET token = $2, expires_at = NOW() + INTERVAL '1 hour'`,
      [user.id, resetToken]
    );

    // Construir link de reset
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password-confirm?token=${resetToken}`;

    // Enviar email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'no-reply@lanzalo.com',
      to: user.email,
      subject: 'Recuperar contraseña - Lanzalo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a2e; border-radius: 10px;">
          <h2 style="color: #fff; text-align: center;">Recuperar contraseña</h2>
          <p style="color: #ccc; text-align: center;">Hemos recibido una solicitud para recuperar tu contraseña.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #6366f1; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Restablecer mi contraseña
            </a>
          </div>

          <p style="color: #ccc; text-align: center; font-size: 14px;">
            Este link expira en 24 horas. Si no has solicitado recuperación, puedes ignorar este email.
          </p>

          <p style="color: #666; text-align: center; font-size: 12px; margin-top: 30px;">
            Lanzalo Co-Fundador IA
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`Password reset link enviado a: ${user.email}`);

    res.json({
      success: true,
      message: 'Si el email existe, recibirás un link de recuperación'
    });
  } catch (error) {
    console.error('Error enviando email de recuperación:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Confirmar recuperación de contraseña
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // Verificar que el token existe y no está expirado
    const tokenResult = await pool.query(
      'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const userId = tokenResult.rows[0].user_id;

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    // Eliminar token usado
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE token = $1',
      [token]
    );

    console.log(`Contraseña actualizada para usuario: ${userId}`);

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando contraseña:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
