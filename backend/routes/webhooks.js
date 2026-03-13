/**
 * Stripe Webhooks — Procesar eventos de pago automáticamente
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { activatePro, renewMonthly, addCredits } = require('../middleware/credits');
const { captureServerEvent } = require('../services/posthog');

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

    // Award referral credits on first purchase
    try {
      const referrerCheck = await pool.query(
        `SELECT u.referred_by FROM users u
         LEFT JOIN referral_conversions rc ON rc.referred_id = u.id
         WHERE u.id = $1 AND u.referred_by IS NOT NULL AND rc.id IS NULL`,
        [userId]
      );
      if (referrerCheck.rows[0]?.referred_by) {
        const referrerId = referrerCheck.rows[0].referred_by;
        await pool.query(
          `INSERT INTO referral_conversions (referrer_id, referred_id, credits_awarded)
           VALUES ($1, $2, 20) ON CONFLICT (referred_id) DO NOTHING`,
          [referrerId, userId]
        );
        await addCredits(referrerId, 20, 'referral_bonus', { referredUserId: userId });
        console.log(`[Webhook] 20 créditos de referral añadidos a ${referrerId}`);
      }
    } catch(e) { console.warn('[Webhook] Referral credit error:', e.message); }

    return;
  }

  // ── Business slot purchase ───────────────────────────
  if (session.metadata?.type === 'business_slot') {
    await pool.query(
      'UPDATE users SET business_slots = business_slots + 1 WHERE id = $1',
      [userId]
    );
    console.log(`[Webhook] Business slot añadido a ${userId}`);
    return;
  }

  // ── Email Pro subscription ────────────────────────────
  if (session.metadata?.type === 'email_pro') {
    await handleEmailProActivation(session);
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

  // Trackear suscripción iniciada en PostHog (server-side)
  captureServerEvent(String(userId), 'subscription_started', {
    plan: 'pro',
    stripe_subscription_id: session.subscription,
  });
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

/**
 * Email Pro checkout completado → activar Instantly DFY setup
 */
async function handleEmailProActivation(session) {
  const { userId, companyId, subscriptionId } = session.metadata;
  if (!subscriptionId) return;

  console.log(`[Webhook] Email Pro activado para empresa ${companyId}`);

  try {
    // Update subscription record
    await pool.query(
      `UPDATE email_pro_subscriptions 
       SET status = 'setting_up', 
           stripe_subscription_id = $1,
           month_reset_at = NOW() + INTERVAL '30 days',
           updated_at = NOW()
       WHERE id = $2`,
      [session.subscription, subscriptionId]
    );

    // Get company info for domain suggestion
    const company = await pool.query(
      'SELECT name, subdomain FROM companies WHERE id = $1', [companyId]
    );
    const companyName = company.rows[0]?.subdomain || 'outreach';

    // Try to setup Instantly DFY account
    const instantly = require('../services/instantly-service');
    if (instantly.enabled) {
      try {
        // Generate domain name based on company
        const domainBase = companyName.replace(/[^a-z0-9]/g, '').substring(0, 15);
        const suggestedDomain = `${domainBase}-mail.com`;

        // Simulate order first to check pricing
        const quote = await instantly.simulateOrder(suggestedDomain, 'Team', companyName);
        console.log('[Email Pro] DFY quote:', quote);

        // Place actual order
        const order = await instantly.orderDFYAccount({
          domain: suggestedDomain,
          accounts: [{ email_address_prefix: 'hello', first_name: 'Team', last_name: companyName }],
          order_type: 'dfy',
        });

        // Update subscription with Instantly details
        await pool.query(
          `UPDATE email_pro_subscriptions 
           SET instantly_domain = $1, 
               instantly_account_email = $2,
               instantly_dfy_order_id = $3,
               instantly_warmup_status = 'warming',
               updated_at = NOW()
           WHERE id = $4`,
          [suggestedDomain, `hello@${suggestedDomain}`, order.id || 'pending', subscriptionId]
        );

        console.log(`[Email Pro] DFY order placed: ${suggestedDomain}`);
      } catch (instantlyErr) {
        console.error('[Email Pro] Instantly setup error (will retry):', instantlyErr);
        // Don't fail the whole activation — mark for manual review
        await pool.query(
          `UPDATE email_pro_subscriptions SET instantly_warmup_status = 'failed_setup', updated_at = NOW() WHERE id = $1`,
          [subscriptionId]
        );
      }
    }

    // Create activity log
    await pool.query(
      `INSERT INTO activity_log (company_id, activity_type, message, created_at)
       VALUES ($1, 'email_pro_activated', '📧 Email Pro activado — configurando dominio y warmup', NOW())`,
      [companyId]
    );

    // Create task for email agent to start working
    await pool.query(
      `INSERT INTO tasks (company_id, tag, title, description, status, priority, created_at)
       VALUES ($1, 'email', 'Configurar Email Pro', 
               'Email Pro activado. Preparar dominio, configurar warmup y crear primera campaña de prospección.',
               'todo', 'high', NOW())`,
      [companyId]
    );

  } catch (error) {
    console.error('[Webhook] Email Pro activation error:', error);
    await pool.query(
      `UPDATE email_pro_subscriptions SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [subscriptionId]
    ).catch(() => {});
  }
}

module.exports = router;
