/**
 * Stripe Webhooks — Procesar eventos de pago automáticamente
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { activatePro, renewMonthly, addCredits } = require('../middleware/credits');

const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY) 
  : null;

/**
 * Webhook de Stripe
 * IMPORTANTE: Este endpoint recibe raw body (no JSON parsed)
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no configurado' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Procesar evento
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[Webhook] Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`[Webhook] Error procesando ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Checkout completado → activar suscripción
 */
async function handleCheckoutComplete(session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  console.log(`[Webhook] Checkout completado para usuario ${userId}`);

  // Verificar si es compra de pack de créditos
  if (session.metadata?.type === 'credit_pack') {
    const credits = parseInt(session.metadata.credits);
    await addCredits(userId, credits, 'pack_purchase', { packId: session.metadata.packId });
    console.log(`[Webhook] Pack de ${credits} créditos añadido a ${userId}`);
    return;
  }

  // Suscripción Pro
  await pool.query(
    `UPDATE users SET 
      subscription_tier = 'pro',
      stripe_subscription_id = $1,
      updated_at = NOW()
     WHERE id = $2`,
    [session.subscription, userId]
  );

  // Activar créditos Pro (20/mes)
  await activatePro(userId).catch(err => {
    console.error('[Webhook] Error activando créditos Pro:', err);
  });

  // Log actividad
  const companies = await pool.query(
    'SELECT id FROM companies WHERE user_id = $1 LIMIT 1', [userId]
  );
  if (companies.rows.length > 0) {
    await pool.query(
      `INSERT INTO activity_log (company_id, activity_type, message, created_at)
       VALUES ($1, 'subscription_activated', '💰 Plan Pro activado', NOW())`,
      [companies.rows[0].id]
    );
  }
}

/**
 * Suscripción actualizada
 */
async function handleSubscriptionUpdate(subscription) {
  const customerId = subscription.customer;
  
  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1', [customerId]
  );
  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].id;
  const status = subscription.status; // active, past_due, canceled, etc.

  const tier = ['active', 'trialing'].includes(status) ? 'pro' : 'free';

  await pool.query(
    'UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2',
    [tier, userId]
  );

  console.log(`[Webhook] Suscripción ${status} → tier: ${tier} para ${userId}`);
}

/**
 * Suscripción cancelada → downgrade a free
 */
async function handleSubscriptionCancelled(subscription) {
  const customerId = subscription.customer;

  await pool.query(
    `UPDATE users SET subscription_tier = 'free', updated_at = NOW() 
     WHERE stripe_customer_id = $1`,
    [customerId]
  );

  console.log(`[Webhook] Suscripción cancelada para customer ${customerId}`);
}

/**
 * Pago exitoso → renovar créditos mensuales
 */
async function handlePaymentSuccess(invoice) {
  console.log(`[Webhook] Pago exitoso: $${(invoice.amount_paid / 100).toFixed(2)}`);
  
  // Renovar créditos mensuales
  const customerId = invoice.customer;
  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1', [customerId]
  );
  if (userResult.rows.length > 0) {
    await renewMonthly(userResult.rows[0].id).catch(err => {
      console.error('[Webhook] Error renovando créditos:', err);
    });
    console.log(`[Webhook] Créditos renovados para ${userResult.rows[0].id}`);
  }
}

/**
 * Pago fallido
 */
async function handlePaymentFailed(invoice) {
  console.error(`[Webhook] Pago fallido para customer ${invoice.customer}`);
  // TODO: Enviar email de pago fallido
}

module.exports = router;
