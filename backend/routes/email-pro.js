/**
 * Email Pro Routes — Cold email subscription management
 * 
 * Plan: $15/mes
 * - 1 dominio dedicado (DFY via Instantly)
 * - 1 cuenta de email calentada
 * - 500 emails/mes
 * - Campañas ilimitadas
 * - Upload CSV de leads
 * - Estadísticas (opens, replies, bounces)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const instantly = require('../services/instantly-service');
const multer = require('multer');
const csv = require('csv-parse/sync');

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const EMAIL_PRO_PRICE = 1500; // $15.00 in cents (USD)
const EMAILS_PER_MONTH = 500;

// All routes require auth
router.use(requireAuth);

// ═══════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ═══════════════════════════════════════

/**
 * Get Email Pro status for a company
 */
router.get('/companies/:companyId/email-pro/status', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;

    const sub = await pool.query(
      `SELECT * FROM email_pro_subscriptions 
       WHERE company_id = $1 AND status NOT IN ('cancelled', 'failed')
       ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    );

    if (sub.rows.length === 0) {
      return res.json({
        hasEmailPro: false,
        status: null,
        plan: {
          price: '$15/mes',
          emails_per_month: EMAILS_PER_MONTH,
          features: [
            'Dominio dedicado configurado automáticamente',
            'Email calentado y listo para enviar',
            'Hasta 500 emails fríos al mes',
            'Campañas automáticas con IA',
            'El agente busca leads y crea campañas',
            'Estadísticas de opens, replies, bounces'
          ]
        }
      });
    }

    const subscription = sub.rows[0];

    // Get campaigns count
    const campaignsCount = await pool.query(
      'SELECT COUNT(*) as count FROM instantly_campaigns WHERE company_id = $1',
      [companyId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    // Get leads count
    const leadsCount = await pool.query(
      'SELECT COUNT(*) as count FROM leads WHERE company_id = $1',
      [companyId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    res.json({
      hasEmailPro: ['active', 'setting_up'].includes(subscription.status),
      status: subscription.status,
      subscription: {
        id: subscription.id,
        domain: subscription.instantly_domain,
        email: subscription.instantly_account_email,
        warmup_status: subscription.instantly_warmup_status,
        emails_per_month: subscription.emails_per_month,
        emails_sent_this_month: subscription.emails_sent_this_month,
        activated_at: subscription.activated_at,
      },
      stats: {
        campaigns: parseInt(campaignsCount.rows[0].count),
        leads: parseInt(leadsCount.rows[0].count),
      }
    });

  } catch (error) {
    console.error('[Email Pro] Status error:', error);
    res.status(500).json({ error: 'Error obteniendo estado' });
  }
});

/**
 * Create Stripe checkout for Email Pro
 */
router.post('/companies/:companyId/email-pro/subscribe', requireCompanyAccess, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no configurado' });
  }

  try {
    const { companyId } = req.params;
    const user = req.user;

    // Check if already subscribed
    const existing = await pool.query(
      `SELECT id FROM email_pro_subscriptions 
       WHERE company_id = $1 AND status IN ('active', 'setting_up', 'pending')`,
      [companyId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ya tienes Email Pro activo para esta empresa' });
    }

    // Get or create Stripe customer
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

    // Create pending subscription record
    const subResult = await pool.query(
      `INSERT INTO email_pro_subscriptions (company_id, user_id, status)
       VALUES ($1, $2, 'pending') RETURNING id`,
      [companyId, user.id]
    );
    const subscriptionId = subResult.rows[0].id;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_EMAIL_PRO_PRICE_ID,
        quantity: 1
      }],
      subscription_data: {
        metadata: {
          userId: user.id,
          companyId,
          subscriptionId,
          type: 'email_pro'
        }
      },
      success_url: `${process.env.FRONTEND_URL || 'https://app.lanzalo.pro'}/marketing?tab=emails&activated=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://app.lanzalo.pro'}/marketing?tab=emails&cancelled=true`,
      metadata: {
        userId: user.id,
        companyId,
        subscriptionId,
        type: 'email_pro'
      }
    });

    res.json({ url: session.url, sessionId: session.id });

  } catch (error) {
    console.error('[Email Pro] Subscribe error:', error);
    res.status(500).json({ error: 'Error creando checkout' });
  }
});

/**
 * Cancel Email Pro subscription
 */
router.post('/companies/:companyId/email-pro/cancel', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;

    const sub = await pool.query(
      `SELECT * FROM email_pro_subscriptions 
       WHERE company_id = $1 AND status = 'active'
       LIMIT 1`,
      [companyId]
    );

    if (sub.rows.length === 0) {
      return res.status(404).json({ error: 'No hay suscripción activa' });
    }

    const subscription = sub.rows[0];

    // Cancel in Stripe
    if (stripe && subscription.stripe_subscription_id) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true
      });
    }

    await pool.query(
      `UPDATE email_pro_subscriptions 
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [subscription.id]
    );

    res.json({ success: true, message: 'Suscripción cancelada al final del período' });

  } catch (error) {
    console.error('[Email Pro] Cancel error:', error);
    res.status(500).json({ error: 'Error cancelando suscripción' });
  }
});

// ═══════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════

/**
 * List campaigns for a company
 */
router.get('/companies/:companyId/email-pro/campaigns', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await pool.query(
      `SELECT * FROM instantly_campaigns 
       WHERE company_id = $1 
       ORDER BY created_at DESC LIMIT 50`,
      [companyId]
    );
    res.json({ campaigns: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error listando campañas' });
  }
});

/**
 * Get campaign details with leads
 */
router.get('/companies/:companyId/email-pro/campaigns/:campaignId', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId, campaignId } = req.params;
    
    const campaign = await pool.query(
      'SELECT * FROM instantly_campaigns WHERE id = $1 AND company_id = $2',
      [campaignId, companyId]
    );
    if (campaign.rows.length === 0) {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }

    const leads = await pool.query(
      `SELECT * FROM leads WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [campaignId]
    );

    res.json({
      campaign: campaign.rows[0],
      leads: leads.rows
    });

  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo campaña' });
  }
});

// ═══════════════════════════════════════
// LEADS
// ═══════════════════════════════════════

/**
 * List leads for a company
 */
router.get('/companies/:companyId/email-pro/leads', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, campaign_id, limit = 100 } = req.query;

    let query = 'SELECT * FROM leads WHERE company_id = $1';
    const params = [companyId];
    let paramIdx = 2;

    if (status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    if (campaign_id) {
      query += ` AND campaign_id = $${paramIdx++}`;
      params.push(campaign_id);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // Get status counts
    const counts = await pool.query(
      `SELECT status, COUNT(*) as count FROM leads 
       WHERE company_id = $1 GROUP BY status`,
      [companyId]
    );

    const statusCounts = {};
    counts.rows.forEach(r => { statusCounts[r.status] = parseInt(r.count); });

    res.json({
      leads: result.rows,
      total: result.rows.length,
      statusCounts
    });

  } catch (error) {
    res.status(500).json({ error: 'Error listando leads' });
  }
});

/**
 * Upload CSV of leads
 */
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

router.post('/companies/:companyId/email-pro/leads/upload', requireCompanyAccess, upload.single('file'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { campaign_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo' });
    }

    // Parse CSV
    const content = req.file.buffer.toString('utf-8');
    let records;
    try {
      records = csv.parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (parseErr) {
      return res.status(400).json({ error: `Error parseando CSV: ${parseErr.message}` });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'El CSV está vacío' });
    }

    // Map CSV columns to lead fields (flexible column naming)
    const columnMap = {
      email: ['email', 'correo', 'e-mail', 'email_address', 'mail'],
      first_name: ['first_name', 'nombre', 'first', 'name', 'firstName'],
      last_name: ['last_name', 'apellido', 'last', 'lastName', 'surname'],
      company_name: ['company_name', 'empresa', 'company', 'companyName', 'organization'],
      phone: ['phone', 'telefono', 'tel', 'mobile', 'whatsapp'],
      website: ['website', 'web', 'url', 'site'],
      linkedin_url: ['linkedin', 'linkedin_url', 'linkedIn'],
      job_title: ['job_title', 'puesto', 'cargo', 'title', 'position', 'role'],
    };

    function findColumn(record, aliases) {
      for (const alias of aliases) {
        const key = Object.keys(record).find(k => k.toLowerCase().trim() === alias.toLowerCase());
        if (key && record[key]) return record[key];
      }
      return null;
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (const record of records) {
      const email = findColumn(record, columnMap.email);
      if (!email || !email.includes('@')) {
        skipped++;
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO leads (company_id, campaign_id, email, first_name, last_name, company_name, phone, website, linkedin_url, job_title, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'manual')
           ON CONFLICT (company_id, email) DO UPDATE SET
             first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
             last_name = COALESCE(EXCLUDED.last_name, leads.last_name),
             company_name = COALESCE(EXCLUDED.company_name, leads.company_name),
             phone = COALESCE(EXCLUDED.phone, leads.phone),
             updated_at = NOW()`,
          [
            companyId,
            campaign_id || null,
            email.toLowerCase().trim(),
            findColumn(record, columnMap.first_name),
            findColumn(record, columnMap.last_name),
            findColumn(record, columnMap.company_name),
            findColumn(record, columnMap.phone),
            findColumn(record, columnMap.website),
            findColumn(record, columnMap.linkedin_url),
            findColumn(record, columnMap.job_title),
          ]
        );
        imported++;
      } catch (err) {
        errors.push({ email, error: err.message });
        skipped++;
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      total: records.length,
      errors: errors.slice(0, 10) // Max 10 error details
    });

  } catch (error) {
    console.error('[Email Pro] CSV upload error:', error);
    res.status(500).json({ error: 'Error importando leads' });
  }
});

// ═══════════════════════════════════════
// INSTANTLY WEBHOOK (receives events from Instantly)
// ═══════════════════════════════════════

/**
 * Instantly webhook — receives reply/bounce/open events
 * Public endpoint (no auth) — verified by event structure
 */
router.post('/instantly-webhook', express.json(), async (req, res) => {
  try {
    const event = req.body;
    console.log('[Instantly Webhook] Event:', event.event_type, event);

    const eventType = event.event_type;
    const leadEmail = event.lead_email || event.email;

    if (!leadEmail) {
      return res.json({ received: true });
    }

    switch (eventType) {
      case 'reply': {
        // Update lead status
        await pool.query(
          `UPDATE leads SET status = 'replied', last_replied_at = NOW(), 
           reply_content = $1, emails_opened = emails_opened + 1, updated_at = NOW()
           WHERE email = $2`,
          [event.reply_text || '', leadEmail]
        );

        // Create task for agent to analyze reply
        const leadRow = await pool.query('SELECT company_id FROM leads WHERE email = $1 LIMIT 1', [leadEmail]);
        if (leadRow.rows.length > 0) {
          await pool.query(
            `INSERT INTO tasks (company_id, agent_type, tag, title, description, status, priority, created_at)
             VALUES ($1, 'email', 'email', 'Analizar respuesta de lead', $2, 'todo', 'high', NOW())`,
            [leadRow.rows[0].company_id, `Lead ${leadEmail} ha respondido: "${(event.reply_text || '').substring(0, 200)}"`]
          );
        }
        break;
      }

      case 'bounce': {
        await pool.query(
          `UPDATE leads SET status = 'bounced', updated_at = NOW() WHERE email = $1`,
          [leadEmail]
        );
        break;
      }

      case 'open': {
        await pool.query(
          `UPDATE leads SET emails_opened = emails_opened + 1, updated_at = NOW() WHERE email = $1`,
          [leadEmail]
        );
        break;
      }

      case 'unsubscribe': {
        await pool.query(
          `UPDATE leads SET status = 'not_interested', updated_at = NOW() WHERE email = $1`,
          [leadEmail]
        );
        break;
      }
    }

    // Update campaign stats
    if (event.campaign_id) {
      const statsMap = {
        reply: 'emails_replied = emails_replied + 1',
        bounce: 'emails_bounced = emails_bounced + 1',
        open: 'emails_opened = emails_opened + 1',
      };
      const statUpdate = statsMap[eventType];
      if (statUpdate) {
        await pool.query(
          `UPDATE instantly_campaigns SET ${statUpdate}, updated_at = NOW()
           WHERE instantly_campaign_id = $1`,
          [event.campaign_id]
        );
      }
    }

    res.json({ received: true });

  } catch (error) {
    console.error('[Instantly Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
