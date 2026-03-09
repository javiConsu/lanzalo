/**
 * Landing Page Routes
 * 
 * - POST /api/public/waitlist — Captura emails desde landings de usuarios (público)
 * - GET  /api/user/companies/:id/landing — Estado del deploy de la landing
 * - POST /api/user/companies/:id/landing/redeploy — Forzar re-deploy
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const vercelDeploy = require('../services/vercel-deploy');

// ─── Public: Waitlist signup ────────────────────────────────
router.post('/api/public/waitlist', async (req, res) => {
  try {
    const { email, company_id } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Crear tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id),
        email VARCHAR(255) NOT NULL,
        source VARCHAR(50) DEFAULT 'landing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, email)
      )
    `);

    // Insertar (ignorar duplicados)
    await pool.query(
      `INSERT INTO waitlist (company_id, email) 
       VALUES ($1, $2) 
       ON CONFLICT (company_id, email) DO NOTHING`,
      [company_id || null, email]
    );

    // Contar total de signups para esta empresa
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM waitlist WHERE company_id = $1',
      [company_id]
    );
    const total = parseInt(countResult.rows[0].total);

    // Log actividad
    if (company_id) {
      await pool.query(
        `INSERT INTO activity_log (company_id, activity_type, message, created_at)
         VALUES ($1, 'waitlist', $2, NOW())`,
        [company_id, `📧 Nuevo signup en waitlist: ${email} (total: ${total})`]
      );

      // Broadcast
      if (global.broadcastActivity) {
        global.broadcastActivity({
          companyId: company_id,
          type: 'waitlist_signup',
          message: `📧 Nuevo lead: ${email}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Enviar email de confirmación al lead
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Get company name
      let companyName = 'tu nuevo producto favorito';
      if (company_id) {
        const compResult = await pool.query('SELECT name FROM companies WHERE id = $1', [company_id]);
        if (compResult.rows[0]) companyName = compResult.rows[0].name;
      }

      await resend.emails.send({
        from: 'Lanzalo <noreply@lanzalo.pro>',
        to: email,
        subject: `Estás dentro 🎉 — ${companyName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #10b981;">¡Apuntado! 🚀</h2>
            <p style="color: #d1d5db; line-height: 1.6;">
              Te has unido a la lista de espera de <strong>${companyName}</strong>.
            </p>
            <p style="color: #9ca3af; line-height: 1.6;">
              Te avisaremos en cuanto estemos listos. Mientras tanto, relájate — estás en buenas manos.
            </p>
            <hr style="border: none; border-top: 1px solid #374151; margin: 24px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              Construido con <a href="https://lanzalo.pro" style="color: #10b981;">Lánzalo</a> — Tu co-fundador de IA
            </p>
          </div>
        `
      });
    } catch (emailErr) {
      console.warn('[Waitlist] Email confirmation error:', emailErr.message);
    }

    res.json({ 
      success: true, 
      message: '¡Apuntado! Te avisaremos pronto.',
      total 
    });
  } catch (error) {
    console.error('[Waitlist] Error:', error);
    // Duplicate key is fine
    if (error.code === '23505') {
      return res.json({ success: true, message: '¡Ya estás en la lista!' });
    }
    res.status(500).json({ error: 'Error al registrarse' });
  }
});

// ─── Auth: Landing deploy status ────────────────────────────
router.get('/api/user/companies/:id/landing', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const status = await vercelDeploy.getDeployStatus(id);

    // Get waitlist count
    let waitlistCount = 0;
    try {
      const wResult = await pool.query(
        'SELECT COUNT(*) as total FROM waitlist WHERE company_id = $1', [id]
      );
      waitlistCount = parseInt(wResult.rows[0].total);
    } catch (e) { /* table might not exist */ }

    res.json({
      ...status,
      waitlistCount
    });
  } catch (error) {
    console.error('[Landing] Status error:', error);
    res.status(500).json({ error: 'Error obteniendo estado' });
  }
});

// ─── Auth: Waitlist subscribers list ────────────────────────
router.get('/api/user/companies/:id/waitlist', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT email, source, created_at 
       FROM waitlist 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [id]
    );

    res.json({ subscribers: result.rows });
  } catch (error) {
    res.json({ subscribers: [] });
  }
});

module.exports = router;
