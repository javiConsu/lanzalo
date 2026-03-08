/**
 * Magic Link Login - Genera token, guarda en DB, envia email con Resend
 */
const crypto = require('crypto');
const { pool } = require('../db');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.lanzalo.pro';
const FROM_EMAIL = 'Lanzalo <noreply@lanzalo.pro>';

module.exports = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('[MAGIC-LOGIN] Request for:', email);

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Email invalido' });
    }

    // Generar token unico
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Crear tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Borrar tokens anteriores de este email
    await pool.query('DELETE FROM login_tokens WHERE email = $1', [email]);

    // Guardar nuevo token
    await pool.query(
      'INSERT INTO login_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
      [email, token, expiresAt]
    );

    // Crear o encontrar usuario
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      // Crear usuario nuevo sin password
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role, plan)
         VALUES ($1, 'magic-link', $2, 'user', 'free')`,
        [email, email.split('@')[0]]
      );
      console.log('[MAGIC-LOGIN] New user created:', email);
    }

    // Construir magic link
    const magicLink = `https://lanzalo-production.up.railway.app/api/verify-magic?token=${token}`;

    // Enviar email
    if (!resend) {
      console.error('[MAGIC-LOGIN] RESEND_API_KEY not configured');
      return res.status(500).json({ success: false, error: 'Email service not configured' });
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Tu enlace magico para Lanzalo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e;">Accede a Lanzalo</h2>
          <p>Haz clic en el boton para acceder a tu cuenta:</p>
          <a href="${magicLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Acceder a Lanzalo</a>
          <p style="color: #666; font-size: 13px;">Este enlace expira en 15 minutos.</p>
          <p style="color: #999; font-size: 11px;">Si no solicitaste este enlace, ignora este email.</p>
        </div>
      `
    });

    if (error) {
      console.error('[MAGIC-LOGIN] Resend error:', error);
      return res.status(500).json({ success: false, error: 'Error enviando email' });
    }

    console.log('[MAGIC-LOGIN] Email sent to:', email, 'resend-id:', data?.id);
    res.json({ success: true, message: 'Link enviado! Revisa tu email.' });

  } catch (err) {
    console.error('[MAGIC-LOGIN] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
