/**
 * Rutas de autenticación — Clerk
 *
 * Login, registro y recuperación de contraseña gestionados por Clerk (frontend).
 * Este archivo expone:
 *  - POST /api/auth/sync    → crea/vincula usuario en nuestra DB tras sign-in con Clerk
 *  - GET  /api/auth/verify  → valida token y devuelve usuario actual
 */

const express = require('express');
const router = express.Router();
const { ClerkExpressRequireAuth, clerkClient } = require('@clerk/clerk-sdk-node');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db');
const crypto = require('crypto');

/**
 * POST /api/auth/sync
 * Llamado por el frontend tras cada sign-in con Clerk.
 * Crea el usuario en nuestra DB si no existe, o vincula clerk_user_id si ya existe por email.
 */
router.post('/sync', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = req.auth;

    // Obtener datos del usuario desde Clerk
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return res.status(400).json({ error: 'El usuario de Clerk no tiene email asociado' });
    }

    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || email.split('@')[0];

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Crear o vincular usuario
    // ON CONFLICT (email) → actualiza clerk_user_id (usuarios existentes con password)
    const result = await pool.query(
      `INSERT INTO users (email, name, clerk_user_id, plan, subscription_tier, trial_ends_at, referral_code)
       VALUES ($1, $2, $3, 'trial', 'free', $4, $5)
       ON CONFLICT (email) DO UPDATE
         SET clerk_user_id = EXCLUDED.clerk_user_id,
             updated_at    = NOW()
       RETURNING id, email, name, role, plan, subscription_tier,
                 trial_ends_at, onboarding_completed, business_slots,
                 referral_code, created_at`,
      [email, name, clerkUserId, trialEndsAt, referralCode]
    );

    const user = result.rows[0];
    console.log(`[AUTH SYNC] user=${user.id} email=${email} clerk=${clerkUserId}`);

    res.json({ status: 'ok', user });
  } catch (error) {
    console.error('[AUTH SYNC ERROR]', error);
    res.status(500).json({ error: 'Error al sincronizar usuario' });
  }
});

/**
 * GET /api/auth/verify
 * Verifica token Clerk y devuelve el usuario actual de nuestra DB.
 */
router.get('/verify', requireAuth, (req, res) => {
  res.json({
    status: 'ok',
    message: 'Token válido',
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      plan: req.user.plan,
    }
  });
});

module.exports = router;
