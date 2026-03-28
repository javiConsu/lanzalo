/**
 * Stripe Payments — Checkout, Subscriptions, Plans
 * 
 * Planes:
 * - Starter: 29€/mes (10 creditos)
 * - Pro: 79€/mes (30 creditos)
 * - Business: 199€/mes (100 creditos)
 * 
 * Trial: 14 dias gratis (5 creditos)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY) 
  : null;

const TRIAL_DAYS = 14;

const PLAN_CONFIGS = {
  starter: {
    priceEur: 29,
    credits: 10,
    priceId: process.env.STRIPE_PRICE_ID_STARTER,
    features: ['soporte_email', '10_creditos_mensuales']
  },
  pro: {
    priceEur: 79,
    credits: 30,
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    features: ['soporte_prioritario', '30_creditos_mensuales', 'analytics_avanzados']
  },
  business: {
    priceEur: 199,
    credits: 100,
    priceId: process.env.STRIPE_PRICE_ID_BUSINESS,
    features: ['soporte_dedicado', '100_creditos_mensuales', 'api_access', '3_business_slots']
  }
};

/**
 * GET /api/payments/plans
 * Devuelve los planes disponibles con precios y features
 */
router.get('/plans', async (req, res) => {
  try {
    const dbPlans = await pool.query(
      'SELECT * FROM plan_configs WHERE tier != $1 ORDER BY monthly_price_eur',
      ['free']
    );
    
    const plans = dbPlans.rows.map(row => ({
      tier: row.tier,
      price: row.monthly_price_eur,
      credits: row.monthly_credits,
      businessSlots: row.business_slots,
      features: row.features,
      priceId: PLAN_CONFIGS[row.tier]?.priceId || null
    }));
    
    res.json({ plans, trial: { days: TRIAL_DAYS, credits: 5 } });
  } catch (error) {
    console.error('[Payments] Error fetching plans:', error);
    res.json({ 
      plans: Object.entries(PLAN_CONFIGS).map(([tier, config]) => ({
        tier,
        price: config.priceEur,
        credits: config.credits,
        priceId: config.priceId,
        features: config.features
      })),
      trial: { days: TRIAL_DAYS, credits: 5 }
    });
  }
});

/**
 * POST /api/payments/create-checkout
 * Crear sesion de checkout para un plan
 * Body: { tier: 'starter' | 'pro' | 'business' }
 */
router.post('/create-checkout', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no configurado' });
  }

  const { tier = 'pro' } = req.body;
  const planConfig = PLAN_CONFIGS[tier];
  
  if (!planConfig) {
    return res.status(400).json({ error: 'Plan invalido. Usa: starter, pro, business' });
  }

  if (!planConfig.priceId) {
    return res.status(503).json({ error: `Price ID no configurado para plan ${tier}` });
  }

  try {
    const user = req.user;

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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: planConfig.priceId,
        quantity: 1
      }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { userId: user.id, tier }
      },
      success_url: `${process.env.FRONTEND_URL || 'https://app.lanzalo.pro'}/dashboard?upgraded=true&tier=${tier}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://app.lanzalo.pro'}/precios?cancelled=true`,
      metadata: { userId: user.id, tier }
    });

    res.json({ url: session.url, sessionId: session.id, tier });
  } catch (error) {
    console.error('[Stripe] Checkout error:', error);
    res.status(500).json({ error: 'Error creando checkout', details: error.message });
  }
});

/**
 * POST /api/payments/billing-portal
 * Portal de billing para gestionar suscripcion
 */
router.post('/billing-portal', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no configurado' });
  }

  try {
    const user = req.user;
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No tienes suscripcion activa' });
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
 * GET /api/payments/subscription
 * Estado de suscripcion del usuario
 */
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT subscription_tier, trial_ends_at, stripe_customer_id, stripe_subscription_id 
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];

    const isTrialActive = user.trial_ends_at && new Date(user.trial_ends_at) > new Date();
    const daysLeft = isTrialActive 
      ? Math.ceil((new Date(user.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
      : 0;

    const planConfig = PLAN_CONFIGS[user.subscription_tier] || { priceEur: 0, credits: 5 };

    res.json({
      tier: user.subscription_tier,
      isTrialActive,
      daysLeft,
      hasStripe: !!user.stripe_customer_id,
      hasSubscription: !!user.stripe_subscription_id,
      monthlyCredits: planConfig.credits,
      price: planConfig.priceEur
    });
  } catch (error) {
    console.error('[Payments] Subscription error:', error);
    res.status(500).json({ error: 'Error consultando suscripcion' });
  }
});

/**
 * POST /api/payments/upgrade
 * Cambiar a un plan superior (upgrade)
 */
router.post('/upgrade', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no configurado' });
  }

  const { tier } = req.body;
  const planConfig = PLAN_CONFIGS[tier];
  
  if (!planConfig) {
    return res.status(400).json({ error: 'Plan invalido' });
  }

  try {
    const user = req.user;
    
    if (!user.stripe_subscription_id) {
      return res.status(400).json({ error: 'No tienes suscripcion activa. Usa create-checkout.' });
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    
    const updatedSubscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
      items: [{
        id: subscription.items.data[0].id,
        price: planConfig.priceId
      }],
      proration_behavior: 'always_invoice',
      metadata: { ...subscription.metadata, tier }
    });

    res.json({ 
      success: true, 
      subscriptionId: updatedSubscription.id,
      tier,
      message: `Plan actualizado a ${tier}`
    });
  } catch (error) {
    console.error('[Stripe] Upgrade error:', error);
    res.status(500).json({ error: 'Error actualizando plan', details: error.message });
  }
});

/**
 * POST /api/payments/cancel
 * Cancelar suscripcion (al final del periodo)
 */
router.post('/cancel', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no configurado' });
  }

  try {
    const user = req.user;
    
    if (!user.stripe_subscription_id) {
      return res.status(400).json({ error: 'No tienes suscripcion activa' });
    }

    const subscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    res.json({ 
      success: true, 
      cancelAt: new Date(subscription.current_period_end * 1000),
      message: 'Suscripcion cancelada. Seguiras teniendo acceso hasta el final del periodo.'
    });
  } catch (error) {
    console.error('[Stripe] Cancel error:', error);
    res.status(500).json({ error: 'Error cancelando suscripcion' });
  }
});

module.exports = router;
