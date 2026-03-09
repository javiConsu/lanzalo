/**
 * Credits API — Lanzalo
 * 
 * GET  /api/credits          — Ver créditos actuales
 * GET  /api/credits/history   — Historial de transacciones
 * GET  /api/credits/packs     — Packs disponibles para comprar
 * POST /api/credits/purchase  — Comprar pack (inicia Stripe Checkout)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getCredits, CREDIT_PACKS, GENERATION_COSTS, GENERATION_LIMITS } = require('../middleware/credits');
const { pool } = require('../db');

// Todas las rutas requieren auth
router.use(authenticate);

/**
 * GET /api/credits — Créditos actuales del usuario
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const credits = await getCredits(userId);
    
    res.json({
      credits,
      costs: GENERATION_COSTS,
      plan: req.user.plan || 'trial'
    });
  } catch (error) {
    console.error('Error obteniendo créditos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * GET /api/credits/history — Historial de transacciones
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT id, amount, balance_after, type, action, project_id, metadata, created_at
       FROM credit_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM credit_transactions WHERE user_id = $1',
      [userId]
    );

    res.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * GET /api/credits/packs — Packs disponibles
 */
router.get('/packs', (req, res) => {
  res.json({ packs: CREDIT_PACKS });
});

/**
 * POST /api/credits/purchase — Iniciar compra de pack via Stripe
 */
router.post('/purchase', async (req, res) => {
  try {
    const { packId } = req.body;
    const pack = CREDIT_PACKS.find(p => p.id === packId);

    if (!pack) {
      return res.status(400).json({ error: 'Pack no válido' });
    }

    // Verificar que Stripe está configurado
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe no configurado' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const userId = req.user.userId || req.user.id;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Lanzalo — ${pack.name}`,
            description: `${pack.credits} créditos para generar negocios en Lanzalo`
          },
          unit_amount: pack.priceCents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'https://www.lanzalo.pro'}/credits?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://www.lanzalo.pro'}/credits?canceled=true`,
      metadata: {
        userId,
        packId: pack.id,
        credits: pack.credits.toString(),
        type: 'credit_pack'
      }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creando checkout:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * POST /api/credits/purchase-slot — Comprar hueco de negocio adicional via Stripe
 * Precio: 39€/mes por negocio adicional (suscripción)
 */
router.post('/purchase-slot', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe no configurado' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const userId = req.user.userId || req.user.id;

    // Get current slots info
    const slotCheck = await pool.query(
      `SELECT u.business_slots, COUNT(c.id)::int as company_count
       FROM users u
       LEFT JOIN companies c ON u.id = c.user_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    const currentSlots = slotCheck.rows[0]?.business_slots ?? 1;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Lánzalo — Negocio adicional',
            description: `Hueco para 1 negocio extra (slot #${currentSlots + 1})`
          },
          unit_amount: 3900, // 39€
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'https://www.lanzalo.pro'}/?slot_purchased=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://www.lanzalo.pro'}/?slot_canceled=true`,
      metadata: {
        userId,
        type: 'business_slot',
        newSlotNumber: (currentSlots + 1).toString()
      }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creando checkout de slot:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
