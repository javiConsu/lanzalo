/**
 * Middleware de autenticación — Clerk
 * Reemplaza el sistema JWT custom por verificación de tokens Clerk.
 */

const { ClerkExpressRequireAuth, ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const { pool } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';

// Funciones utilitarias — mantenidas por compatibilidad con rutas legacy
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, plan: user.plan }, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Middleware principal de autenticación.
 * Verifica el token Clerk del header Authorization y carga req.user desde la DB.
 */
async function requireAuth(req, res, next) {
  ClerkExpressRequireAuth()(req, res, async (err) => {
    if (err) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Token de Clerk requerido o inválido'
      });
    }

    try {
      const clerkUserId = req.auth?.userId;
      if (!clerkUserId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const result = await pool.query(
        `SELECT id, email, name, role, plan, subscription_tier,
                trial_ends_at, onboarding_completed, business_slots,
                referral_code, credits, created_at
         FROM users WHERE clerk_user_id = $1`,
        [clerkUserId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          error: 'Usuario no encontrado. Llama a POST /api/auth/sync para sincronizar tu cuenta.'
        });
      }

      req.user = result.rows[0];
      next();
    } catch (error) {
      console.error('[requireAuth] Error:', error);
      res.status(500).json({ error: 'Error de autenticación' });
    }
  });
}

/**
 * Auth opcional — si hay token Clerk válido, carga req.user; si no, continúa sin auth.
 */
async function optionalAuth(req, res, next) {
  ClerkExpressWithAuth()(req, res, async () => {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) return next();

    try {
      const result = await pool.query(
        `SELECT id, email, name, role, plan, subscription_tier,
                trial_ends_at, onboarding_completed
         FROM users WHERE clerk_user_id = $1`,
        [clerkUserId]
      );
      if (result.rows[0]) req.user = result.rows[0];
    } catch (e) {
      // Silencioso — no bloquear peticiones públicas
    }
    next();
  });
}

/**
 * Requiere rol admin.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
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
 * Verifica que el usuario tiene acceso a una empresa concreta.
 */
async function requireCompanyAccess(req, res, next) {
  try {
    const companyId = req.params.companyId || req.params.id || req.body.company_id || req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({ error: 'company_id requerido' });
    }

    if (req.user.role === 'admin') {
      req.companyId = companyId;
      return next();
    }

    const result = await pool.query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta empresa' });
    }

    req.companyId = companyId;
    next();
  } catch (error) {
    console.error('[requireCompanyAccess] Error:', error);
    res.status(500).json({ error: 'Error verificando acceso' });
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireCompanyAccess,
  authenticate: requireAuth,   // alias para compatibilidad
  hashPassword,
  verifyPassword,
  generateToken,
};
