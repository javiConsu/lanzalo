/**
 * Stripe Payments — Checkout, Subscriptions, Revenue Share
 * 
 * Plan: Pro $39/mes + 5% revenue share
 * Trial: 14 días gratis
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY) 
  : null;

const PLAN_PRICE = 3900; // $39.00 en centavos
const TRIAL_DAYS = 14;

/**
 * Crear sesión de checkout para upgrade a Pro
 */
router.post('/create-checkout', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no configurado' });
  }

  try {
    const user = req.user;

    // Obtener o crear Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });
      customerId = customer.id;
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, user.id]
      );
    }

    // Crear checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { userId: user.id }
      },
      success_url: `${process.env.FRONTEND_URL || 'https://app.lanzalo.pro'}/dashboard?upgraded=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://app.lanzalo.pro'}/upgrade?cancelled=true`,
      metadata: { userId: user.id }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[Stripe] Checkout error:', error);
    res.status(500).json({ error: 'Error creando checkout' });
  }
});

/**
 * Portal de billing para gestionar suscripción
 */
router.post('/billing-portal', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no configurado' });
  }

  try {
    const user = req.user;
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No tienes suscripción activa' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL || 'https://app.lanzalo.pro'}/dashboard`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe] Portal error:', error);
    res.status(500).json({ error: 'Error abriendo portal' });
  }
});

/**
 * Estado de suscripción
 */
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT subscription_tier, trial_ends_at, stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];

    const isTrialActive = user.trial_ends_at && new Date(user.trial_ends_at) > new Date();
    const daysLeft = isTrialActive 
      ? Math.ceil((new Date(user.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      tier: user.subscription_tier,
      isTrialActive,
      daysLeft,
      hasStripe: !!user.stripe_customer_id
    });
  } catch (error) {
    res.status(500).json({ error: 'Error consultando suscripción' });
  }
});

module.exports = router;
