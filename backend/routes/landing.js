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

// ─── Auth: Add custom domain ─────────────────────────────────
router.post('/api/user/companies/:id/domain', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { domain } = req.body;

    if (!domain || domain.length < 4) {
      return res.status(400).json({ error: 'Dominio inválido' });
    }

    // Sanitizar dominio
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');

    // Buscar el proyecto Vercel de esta empresa
    const company = await pool.query('SELECT subdomain, website_url FROM companies WHERE id = $1', [id]);
    if (!company.rows[0]) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const { subdomain } = company.rows[0];
    const projectName = `lanzalo-${subdomain}`;

    if (!process.env.VERCEL_TOKEN) {
      return res.status(400).json({ error: 'Dominios custom no disponibles (sin Vercel token)' });
    }

    const teamParam = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : '';

    // Añadir dominio al proyecto en Vercel
    const addRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectName}/domains${teamParam}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: cleanDomain })
      }
    );

    const addData = await addRes.json();

    if (!addRes.ok && addRes.status !== 409) {
      // Si el dominio ya existe en otro proyecto, informar
      if (addData.error?.code === 'domain_already_in_use') {
        return res.status(409).json({ error: 'Este dominio ya está en uso en otro proyecto' });
      }
      return res.status(400).json({ error: addData.error?.message || 'Error añadiendo dominio' });
    }

    // Verificar configuración DNS
    const verifyRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectName}/domains/${cleanDomain}/verify${teamParam}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }
      }
    );
    const verifyData = await verifyRes.json();

    // Guardar dominio en la empresa
    await pool.query(
      `UPDATE companies SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
      [JSON.stringify({ custom_domain: cleanDomain, domain_verified: verifyData.verified || false }), id]
    );

    // Si está verificado, actualizar website_url
    if (verifyData.verified) {
      await pool.query(
        `UPDATE companies SET website_url = $1 WHERE id = $2`,
        [`https://${cleanDomain}`, id]
      );
    }

    res.json({
      domain: cleanDomain,
      verified: verifyData.verified || false,
      // Instrucciones DNS para el usuario
      dns_instructions: verifyData.verified ? null : {
        type: cleanDomain.split('.').length > 2 ? 'CNAME' : 'A',
        name: cleanDomain.split('.').length > 2 ? cleanDomain.split('.')[0] : '@',
        value: cleanDomain.split('.').length > 2 ? 'cname.vercel-dns.com' : '76.76.21.21',
        message: `Configura un registro ${cleanDomain.split('.').length > 2 ? 'CNAME → cname.vercel-dns.com' : 'A → 76.76.21.21'} en tu proveedor de DNS`
      }
    });
  } catch (error) {
    console.error('[Domain] Error:', error);
    res.status(500).json({ error: 'Error configurando dominio' });
  }
});

// ─── Auth: Check domain verification status ─────────────────
router.get('/api/user/companies/:id/domain', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const company = await pool.query(
      `SELECT subdomain, settings->'custom_domain' as custom_domain, 
              settings->'domain_verified' as domain_verified, website_url
       FROM companies WHERE id = $1`, [id]
    );

    if (!company.rows[0] || !company.rows[0].custom_domain) {
      return res.json({ has_custom_domain: false });
    }

    const { subdomain, custom_domain, domain_verified, website_url } = company.rows[0];
    const cleanDomain = custom_domain.replace(/"/g, '');

    // Si ya verificado, devolver estado
    if (domain_verified === true || domain_verified === 'true') {
      return res.json({
        has_custom_domain: true,
        domain: cleanDomain,
        verified: true,
        url: `https://${cleanDomain}`
      });
    }

    // Re-verificar con Vercel
    if (process.env.VERCEL_TOKEN) {
      const projectName = `lanzalo-${subdomain}`;
      const teamParam = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : '';

      try {
        const verifyRes = await fetch(
          `https://api.vercel.com/v10/projects/${projectName}/domains/${cleanDomain}/verify${teamParam}`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }
          }
        );
        const verifyData = await verifyRes.json();

        if (verifyData.verified) {
          // Actualizar estado
          await pool.query(
            `UPDATE companies SET 
               settings = COALESCE(settings, '{}'::jsonb) || '{"domain_verified": true}'::jsonb,
               website_url = $1
             WHERE id = $2`,
            [`https://${cleanDomain}`, id]
          );

          return res.json({
            has_custom_domain: true,
            domain: cleanDomain,
            verified: true,
            url: `https://${cleanDomain}`
          });
        }
      } catch (e) {
        console.warn('[Domain] Verify error:', e.message);
      }
    }

    // Aún no verificado
    res.json({
      has_custom_domain: true,
      domain: cleanDomain,
      verified: false,
      dns_instructions: {
        type: cleanDomain.split('.').length > 2 ? 'CNAME' : 'A',
        name: cleanDomain.split('.').length > 2 ? cleanDomain.split('.')[0] : '@',
        value: cleanDomain.split('.').length > 2 ? 'cname.vercel-dns.com' : '76.76.21.21'
      }
    });
  } catch (error) {
    console.error('[Domain] Status error:', error);
    res.status(500).json({ error: 'Error verificando dominio' });
  }
});

// ─── Auth: Remove custom domain ─────────────────────────────
router.delete('/api/user/companies/:id/domain', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const company = await pool.query(
      `SELECT subdomain, settings->'custom_domain' as custom_domain FROM companies WHERE id = $1`, [id]
    );

    if (!company.rows[0]?.custom_domain) {
      return res.json({ success: true });
    }

    const { subdomain, custom_domain } = company.rows[0];
    const cleanDomain = custom_domain.replace(/"/g, '');

    // Eliminar de Vercel
    if (process.env.VERCEL_TOKEN) {
      const projectName = `lanzalo-${subdomain}`;
      const teamParam = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : '';

      await fetch(
        `https://api.vercel.com/v10/projects/${projectName}/domains/${cleanDomain}${teamParam}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }
        }
      );
    }

    // Limpiar de DB, restaurar URL de lanzalo.pro
    await pool.query(
      `UPDATE companies SET 
         settings = settings - 'custom_domain' - 'domain_verified',
         website_url = $1
       WHERE id = $2`,
      [`https://${subdomain}.lanzalo.pro`, id]
    );

    res.json({ success: true, message: 'Dominio eliminado' });
  } catch (error) {
    console.error('[Domain] Delete error:', error);
    res.status(500).json({ error: 'Error eliminando dominio' });
  }
});

module.exports = router;
