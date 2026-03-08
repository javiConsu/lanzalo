/**
 * Verify Magic Link - Valida token y genera JWT
 */
const { pool } = require('../db');
const { generateToken } = require('../middleware/auth');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.lanzalo.pro';

module.exports = async (req, res) => {
  try {
    const { token } = req.query;
    console.log('[VERIFY-MAGIC] Token received:', token?.substring(0, 8) + '...');

    if (!token) {
      return res.status(400).send('<h1>Token no proporcionado</h1>');
    }

    // Buscar token en DB
    const result = await pool.query(
      'SELECT * FROM login_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send(`
        <div style="font-family: Arial; text-align: center; padding: 60px;">
          <h1>Enlace invalido o expirado</h1>
          <p>Solicita un nuevo enlace magico desde <a href="https://www.lanzalo.pro">lanzalo.pro</a></p>
        </div>
      `);
    }

    const loginToken = result.rows[0];

    // Borrar token (one-time use)
    await pool.query('DELETE FROM login_tokens WHERE id = $1', [loginToken.id]);

    // Buscar usuario
    const userResult = await pool.query(
      'SELECT id, email, name, role, plan FROM users WHERE email = $1',
      [loginToken.email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).send('<h1>Usuario no encontrado</h1>');
    }

    const user = userResult.rows[0];

    // Generar JWT
    const jwt = generateToken(user);
    console.log('[VERIFY-MAGIC] JWT generated for:', user.email);

    // Redirect to frontend with token as URL parameter
    // The frontend will read these params and store in localStorage
    const userEncoded = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${FRONTEND_URL}?auth_token=${jwt}&user=${userEncoded}`);

  } catch (error) {
    console.error('[VERIFY-MAGIC] Error:', error);
    res.status(500).send('<h1>Error interno</h1><p>' + error.message + '</p>');
  }
};
