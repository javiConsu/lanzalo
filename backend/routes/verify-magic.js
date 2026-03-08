/**
 * Verify Magic Link - Valida token y genera JWT
 */
const { pool } = require('../db');
const { generateToken } = require('../middleware/auth');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://lanzalo.vercel.app';

module.exports = async (req, res) => {
  try {
    const { token } = req.query;
    console.log('[VERIFY-MAGIC] Token received:', token?.substring(0, 8) + '...');

    if (!token) {
      return res.status(400).send('<h1>Token no proporcionado</h1>');
    }

    // Buscar token en DB
    const result = await pool.query(
      'SELECT * FROM login_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
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

    // Marcar token como usado
    await pool.query('UPDATE login_tokens SET used = true WHERE id = $1', [loginToken.id]);

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

    console.log('[VERIFY-MAGIC] Login successful for:', user.email);

    // Redirigir al frontend con el token
    // El frontend guardara el token en localStorage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Accediendo a Lanzalo...</title></head>
      <body>
        <div style="font-family: Arial; text-align: center; padding: 60px;">
          <h2>Acceso verificado!</h2>
          <p>Redirigiendo a Lanzalo...</p>
        </div>
        <script>
          localStorage.setItem('token', '${jwt}');
          localStorage.setItem('user', JSON.stringify(${JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role })}));
          window.location.href = '${FRONTEND_URL}/dashboard';
        </script>
      </body>
      </html>
    `);

  } catch (err) {
    console.error('[VERIFY-MAGIC] Error:', err);
    res.status(500).send('<h1>Error interno</h1><p>' + err.message + '</p>');
  }
};
