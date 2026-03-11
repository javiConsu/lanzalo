/**
 * Sistema de Autenticación
 * Separación Admin vs Users
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const JWT_EXPIRY = '24h';

/**
 * Generar JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verificar JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Hash password
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * Verificar password
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Middleware: Requiere autenticación
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Token requerido' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        error: 'Token inválido o expirado' 
      });
    }

    // Obtener usuario de DB
    const result = await pool.query(
      'SELECT id, email, name, role, plan FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    req.user = result.rows[0];
    next();

  } catch (error) {
    console.error('Error en requireAuth:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

/**
 * Middleware: Optional auth — sets req.user if valid token, continues otherwise
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token — continue as unauthenticated
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) return next();

    const result = await pool.query(
      'SELECT id, email, name, role, plan, subscription_tier FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows[0]) {
      req.user = result.rows[0];
    }
    next();
  } catch (error) {
    next(); // On error, continue without auth
  }
}

/**
 * Middleware: Requiere rol admin
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'No autenticado' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado',
      message: 'Solo administradores pueden acceder' 
    });
  }

  next();
}

/**
 * Middleware: Verifica que el usuario tiene acceso a la empresa
 */
async function requireCompanyAccess(req, res, next) {
  try {
    const companyId = req.params.companyId || req.params.id || req.body.company_id || req.headers['x-company-id'];
    
    if (!companyId) {
      return res.status(400).json({ 
        error: 'company_id requerido' 
      });
    }

    // Admins tienen acceso a todo
    if (req.user.role === 'admin') {
      req.companyId = companyId;
      return next();
    }

    // Users solo a sus empresas
    const result = await pool.query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'No tienes acceso a esta empresa' 
      });
    }

    req.companyId = companyId;
    next();

  } catch (error) {
    console.error('Error en requireCompanyAccess:', error);
    res.status(500).json({ error: 'Error verificando acceso' });
  }
}

/**
 * Registro de nuevo usuario
 */
async function register(email, password, name) {
  // Verificar si existe
  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error('Email ya registrado');
  }

  // Crear usuario con créditos iniciales (50) y trial (14 días)
  const passwordHash = await hashPassword(password);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, plan, credits, trial_ends_at)
     VALUES ($1, $2, $3, 'user', 'trial', 50, $4)
     RETURNING id, email, name, role, plan, credits, trial_ends_at`,
    [email, passwordHash, name, trialEndsAt]
  );

  const user = result.rows[0];
  const token = generateToken(user);

  return { user, token };
}

/**
 * Login
 */
async function login(email, password) {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Credenciales inválidas');
  }

  const user = result.rows[0];
  const validPassword = await verifyPassword(password, user.password_hash);

  if (!validPassword) {
    throw new Error('Credenciales inválidas');
  }

  // No retornar password_hash
  delete user.password_hash;

  const token = generateToken(user);

  return { user, token };
}

/**
 * Crear admin inicial
 */
async function createInitialAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@lanzalo.app';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [adminEmail]
  );

  if (existing.rows.length > 0) {
    console.log('⚠️  Admin ya existe');
    return;
  }

  const passwordHash = await hashPassword(adminPassword);

  await pool.query(
    `INSERT INTO users (email, password_hash, name, role, plan, email_verified)
     VALUES ($1, $2, 'Admin', 'admin', 'pro', true)`,
    [adminEmail, passwordHash]
  );

  console.log('✅ Admin creado:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('   ⚠️  CAMBIA LA CONTRASEÑA INMEDIATAMENTE');
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireCompanyAccess,
  register,
  login,
  createInitialAdmin,
  authenticate: requireAuth,
};
