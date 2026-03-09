/**
 * Sistema de Feedback + Soporte — Lanzalo
 * 
 * 1. LIKE (thumbs up) en mensajes del Co-Founder → 0 créditos (entrena al AI)
 * 2. "ALGO VA MAL" → 0 créditos (support ticket tipo bug)
 * 3. "DAR FEEDBACK" → +1 crédito si se aprueba (+2 en trial primeros 15 días)
 * 
 * Cada crédito = resolver 1 tarea nueva
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireCompanyAccess, requireAdmin } = require('../middleware/auth');
const { addCredits } = require('../middleware/credits');
const { pool } = require('../db');
const crypto = require('crypto');

// Email via Resend
const { Resend } = require('resend');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'Lanzalo <noreply@lanzalo.pro>';
const ADMIN_EMAIL = 'javi@saleshackers.es';

router.use(requireAuth);

// ═══════════════════════════════════════════════════════
// 1. LIKE — Thumbs up/down en mensajes del Co-Founder
//    0 créditos, entrena preferencias del usuario
// ═══════════════════════════════════════════════════════

router.post('/companies/:companyId/chat/:messageId/feedback', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId, messageId } = req.params;
    const { rating, comment } = req.body; // rating: 'positive' | 'negative'

    if (!['positive', 'negative'].includes(rating)) {
      return res.status(400).json({ error: 'Rating debe ser "positive" o "negative"' });
    }

    // Upsert feedback
    await pool.query(
      `INSERT INTO user_feedback (id, company_id, user_id, entity_type, entity_id, rating, comment, created_at)
       VALUES ($1, $2, $3, 'chat_message', $4, $5, $6, NOW())
       ON CONFLICT (user_id, entity_type, entity_id)
       DO UPDATE SET rating = $5, comment = $6, updated_at = NOW()`,
      [crypto.randomUUID(), companyId, req.user.id, messageId, rating, comment || null]
    );

    // Si negativo con comentario, actualizar memory para learning
    if (rating === 'negative' && comment) {
      try {
        const MemorySystem = require('../../agents/memory-system');
        const memory = new MemorySystem(companyId);
        const layer2 = await memory.getLayer2();
        const negFeedback = layer2.negativeFeedback || [];
        negFeedback.push({
          context: 'chat_message',
          comment,
          date: new Date().toISOString()
        });
        await memory.updateLayer2({
          ...layer2,
          negativeFeedback: negFeedback.slice(-10)
        });
      } catch (e) {
        // Silencioso
      }
    }

    res.json({ success: true, credits: 0 });
  } catch (error) {
    console.error('[Feedback] Like error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// 2. ALGO VA MAL — Reportar un problema
//    0 créditos, envía email a admin
// ═══════════════════════════════════════════════════════

router.post('/companies/:companyId/support/bug', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { message, contextMessageId } = req.body;

    if (!message || message.trim().length < 5) {
      return res.status(400).json({ error: 'Cuéntanos un poco más sobre el problema' });
    }

    // Crear ticket
    const result = await pool.query(
      `INSERT INTO support_tickets (company_id, user_id, type, message, context_message_id, status)
       VALUES ($1, $2, 'bug', $3, $4, 'pending')
       RETURNING id, created_at`,
      [companyId, req.user.id, message.trim(), contextMessageId || null]
    );

    const ticket = result.rows[0];

    // Email a admin
    await notifyAdmin('bug', {
      ticketId: ticket.id,
      userEmail: req.user.email || 'desconocido',
      message: message.trim(),
      companyId
    });

    res.json({
      success: true,
      ticketId: ticket.id,
      credits: 0,
      message: '¡Gracias por avisarnos! Lo resolveremos lo antes posible. 🔧'
    });
  } catch (error) {
    console.error('[Support] Bug report error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// 3. DAR FEEDBACK — Sugerencia de mejora
//    +1 crédito si se aprueba (+2 en trial primeros 15 días)
// ═══════════════════════════════════════════════════════

router.post('/companies/:companyId/support/feedback', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { message, contextMessageId } = req.body;

    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Cuéntanos más detalle para que podamos valorarlo bien' });
    }

    // Comprobar si está en trial (primeros 15 días)
    const isInTrial = await checkTrialBonus(req.user.id);

    // Crear ticket
    const result = await pool.query(
      `INSERT INTO support_tickets (company_id, user_id, type, message, context_message_id, status)
       VALUES ($1, $2, 'feedback', $3, $4, 'pending')
       RETURNING id, created_at`,
      [companyId, req.user.id, message.trim(), contextMessageId || null]
    );

    const ticket = result.rows[0];

    // Email a admin
    await notifyAdmin('feedback', {
      ticketId: ticket.id,
      userEmail: req.user.email || 'desconocido',
      message: message.trim(),
      companyId,
      isInTrial
    });

    const potentialCredits = isInTrial ? 2 : 1;

    res.json({
      success: true,
      ticketId: ticket.id,
      credits: 0, // Todavía no se dan, se dan al aprobar
      message: `¡Gracias! Tu feedback es oro 🏆 Si lo aprobamos para desarrollo, te regalamos ${potentialCredits} crédito${potentialCredits > 1 ? 's' : ''} (${isInTrial ? '¡bonus trial!' : '1 tarea gratis'}).`,
      potentialCredits
    });
  } catch (error) {
    console.error('[Support] Feedback error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Listar tickets pendientes
// ═══════════════════════════════════════════════════════

router.get('/admin/support/tickets', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const result = await pool.query(
      `SELECT t.*, u.email as user_email, u.name as user_name,
              u.trial_started_at, u.plan as user_plan,
              c.name as company_name
       FROM support_tickets t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN companies c ON t.company_id = c.id
       WHERE t.status = $1
       ORDER BY t.created_at DESC
       LIMIT $2`,
      [status, limit]
    );

    // Contar por status
    const counts = await pool.query(
      `SELECT status, COUNT(*) as count FROM support_tickets GROUP BY status`
    );

    res.json({
      tickets: result.rows,
      counts: counts.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {})
    });
  } catch (error) {
    console.error('[Admin] Tickets error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Aprobar/rechazar ticket + asignar créditos
// ═══════════════════════════════════════════════════════

router.post('/admin/support/tickets/:ticketId/resolve', requireAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, adminNotes } = req.body; // status: 'approved' | 'rejected' | 'resolved'

    if (!['approved', 'rejected', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    // Obtener ticket
    const ticketResult = await pool.query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticket = ticketResult.rows[0];
    let creditsAwarded = 0;

    // Si es feedback aprobado → dar créditos
    if (ticket.type === 'feedback' && status === 'approved') {
      const isInTrial = await checkTrialBonus(ticket.user_id);
      creditsAwarded = isInTrial ? 2 : 1;

      // Dar créditos al usuario
      await addCredits(ticket.user_id, creditsAwarded, 'feedback_reward', {
        ticketId,
        reason: 'Feedback aprobado para desarrollo',
        isTrialBonus: isInTrial
      });

      console.log(`[Support] +${creditsAwarded} créditos a user ${ticket.user_id} por feedback aprobado`);
    }

    // Actualizar ticket
    await pool.query(
      `UPDATE support_tickets 
       SET status = $2, admin_notes = $3, credits_awarded = $4, updated_at = NOW()
       WHERE id = $1`,
      [ticketId, status, adminNotes || null, creditsAwarded]
    );

    // Notificar al usuario si se aprobó
    if (status === 'approved' && creditsAwarded > 0) {
      try {
        const userResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [ticket.user_id]);
        const user = userResult.rows[0];
        if (user && resend) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: user.email,
            subject: `🏆 ¡${creditsAwarded} crédito${creditsAwarded > 1 ? 's' : ''} por tu feedback!`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #8b5cf6;">¡Tu feedback mola! 🎉</h2>
                <p>Hemos revisado tu sugerencia y la vamos a desarrollar. Como agradecimiento:</p>
                <div style="background: #1e1b4b; color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                  <div style="font-size: 32px; font-weight: bold;">+${creditsAwarded}</div>
                  <div style="color: #a5b4fc;">crédito${creditsAwarded > 1 ? 's' : ''} añadido${creditsAwarded > 1 ? 's' : ''}</div>
                  ${creditsAwarded === 2 ? '<div style="color: #fbbf24; font-size: 12px; margin-top: 8px;">✨ Bonus trial — aprovecha estos primeros días</div>' : ''}
                </div>
                <p>Cada crédito te permite resolver una tarea nueva con tu Co-Founder. Bastante generoso por un feedback, ¿no? 😏</p>
                <p style="color: #6b7280; font-size: 13px;">Sigue enviando feedback — es la forma más fácil de conseguir créditos gratis.</p>
              </div>
            `
          });
        }
      } catch (e) {
        console.error('[Support] Error notifying user:', e.message);
      }
    }

    res.json({
      success: true,
      status,
      creditsAwarded,
      ticketId
    });
  } catch (error) {
    console.error('[Admin] Resolve ticket error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// STATS: Feedback stats para una empresa
// ═══════════════════════════════════════════════════════

router.get('/companies/:companyId/feedback/stats', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      `SELECT 
         entity_type,
         COUNT(CASE WHEN rating = 'positive' THEN 1 END) as positive,
         COUNT(CASE WHEN rating = 'negative' THEN 1 END) as negative,
         COUNT(*) as total
       FROM user_feedback
       WHERE company_id = $1
       GROUP BY entity_type`,
      [companyId]
    );

    res.json({ stats: result.rows });
  } catch (error) {
    console.error('[Feedback] Stats error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// USER: Mis tickets
// ═══════════════════════════════════════════════════════

router.get('/companies/:companyId/support/tickets', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      `SELECT id, type, message, status, credits_awarded, created_at, updated_at
       FROM support_tickets
       WHERE company_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [companyId, req.user.id]
    );

    res.json({ tickets: result.rows });
  } catch (error) {
    console.error('[Support] My tickets error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Comprobar si el usuario está en los primeros 15 días de trial
 */
async function checkTrialBonus(userId) {
  try {
    const result = await pool.query(
      'SELECT trial_started_at, plan FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return false;

    const user = result.rows[0];
    if (!user.trial_started_at) return false;

    const trialStart = new Date(user.trial_started_at);
    const now = new Date();
    const daysSinceTrialStart = (now - trialStart) / (1000 * 60 * 60 * 24);

    return daysSinceTrialStart <= 15;
  } catch (e) {
    return false;
  }
}

/**
 * Notificar a admin por email
 */
async function notifyAdmin(type, data) {
  if (!resend) {
    console.log(`[Support] Resend no configurado, skip notificación admin (${type})`);
    return;
  }

  const emoji = type === 'bug' ? '🐛' : '💡';
  const typeLabel = type === 'bug' ? 'Bug Report' : 'Feedback';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `${emoji} [Lánzalo] Nuevo ${typeLabel} — ${data.userEmail}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px;">
          <h2>${emoji} Nuevo ${typeLabel}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; color: #6b7280;">Usuario</td><td style="padding: 8px; font-weight: bold;">${data.userEmail}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280;">Ticket ID</td><td style="padding: 8px;"><code>${data.ticketId}</code></td></tr>
            ${data.isInTrial !== undefined ? `<tr><td style="padding: 8px; color: #6b7280;">En trial</td><td style="padding: 8px;">${data.isInTrial ? '✅ Sí (bonus x2)' : 'No'}</td></tr>` : ''}
          </table>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
          </div>
          <p style="color: #6b7280; font-size: 13px;">
            ${type === 'feedback' 
              ? 'Para aprobar y dar créditos, ve al panel admin → Soporte → Aprobar' 
              : 'Resuelve el bug y marca como resuelto en el admin'}
          </p>
        </div>
      `
    });
  } catch (e) {
    console.error(`[Support] Error sending admin notification:`, e.message);
  }
}

module.exports = router;
