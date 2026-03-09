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
const { callLLM } = require('../llm');

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
      message: 'Recibido. Nos ponemos con ello ya mismo. Gracias por avisar, eres un sol ☀️'
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

    if (!message || message.trim().length < 50) {
      return res.status(400).json({ error: 'Necesitamos al menos 50 caracteres para poder valorar bien tu idea. Cuanto más detalle, mejor.' });
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

    // Pre-análisis IA (async, no bloquea la respuesta al usuario)
    analyzeIdeaAndNotifyAdmin(ticket.id, message.trim(), req.user.email || 'desconocido', companyId, isInTrial)
      .catch(e => console.error('[Support] Error en análisis IA:', e.message));

    const potentialCredits = isInTrial ? 2 : 1;
    res.json({
      success: true,
      ticketId: ticket.id,
      credits: 0,
      message: `Idea recibida. La revisamos en 24-48h. Si la implementamos, te sumamos ${potentialCredits} crédito${potentialCredits > 1 ? 's' : ''} automáticamente y te avisamos por email.`,
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
    const type = req.query.type; // 'feedback' | 'bug' | 'agent_feedback' | undefined (all)
    const source = req.query.source; // 'user' | 'agent' | undefined (all)
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    let whereClause = 't.status = $1';
    const params = [status, limit];
    
    if (type) {
      params.push(type);
      whereClause += ` AND t.type = $${params.length}`;
    }
    if (source === 'agent') {
      whereClause += ` AND t.source = 'agent'`;
    } else if (source === 'user') {
      whereClause += ` AND (t.source IS NULL OR t.source = 'user')`;
    }

    const result = await pool.query(
      `SELECT t.*, u.email as user_email, u.name as user_name,
              u.trial_started_at, u.plan as user_plan,
              c.name as company_name
       FROM support_tickets t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN companies c ON t.company_id = c.id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $2`,
      params
    );

    // Contar por status y tipo
    const counts = await pool.query(
      `SELECT status, type, source, COUNT(*) as count FROM support_tickets GROUP BY status, type, source`
    );

    const summary = { byStatus: {}, byType: {}, bySource: {} };
    counts.rows.forEach(r => {
      summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + parseInt(r.count);
      summary.byType[r.type] = (summary.byType[r.type] || 0) + parseInt(r.count);
      const src = r.source || 'user';
      summary.bySource[src] = (summary.bySource[src] || 0) + parseInt(r.count);
    });

    res.json({
      tickets: result.rows,
      counts: summary.byStatus,
      summary
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
          const userName = user.name ? user.name.split(' ')[0] : 'crack';
          const isAgentFeedback = ticket.source === 'agent';

          if (isAgentFeedback) {
            // ─── Email para feedback enviado por un AGENTE del negocio del usuario ───
            await resend.emails.send({
              from: FROM_EMAIL,
              to: user.email,
              subject: `${userName}, tu agente IA nos ha dado una idea genial 🤖🏆`,
              html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; color: #e2e8f0;">
                  <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 32px; margin-bottom: 20px;">
                    <h2 style="color: #a78bfa; margin: 0 0 16px 0; font-size: 22px;">Tu agente trabaja incluso cuando tú no estás 🤖</h2>
                    <p style="color: #c4b5fd; margin: 0 0 12px 0; font-size: 15px; line-height: 1.6;">
                      Resulta que uno de tus agentes IA nos ha mandado feedback con una idea para mejorar Lánzalo.
                      La hemos leído, nos ha molado, y la vamos a desarrollar.
                    </p>
                    <p style="color: #c4b5fd; margin: 0 0 12px 0; font-size: 15px; line-height: 1.6;">
                      Lo mejor: <strong style="color: white;">tú te llevas el crédito (literal)</strong>.
                      Ganar sin trabajar. El sueño de todo emprendedor. 😎
                    </p>
                    <div style="background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); padding: 16px; border-radius: 10px; margin: 16px 0;">
                      <div style="color: #a5b4fc; font-size: 12px; margin-bottom: 6px;">🤖 Lo que dijo tu agente:</div>
                      <p style="color: #e2e8f0; margin: 0; font-size: 14px; line-height: 1.5; font-style: italic;">"${ticket.message.length > 200 ? ticket.message.substring(0, 200) + '...' : ticket.message}"</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.08); padding: 24px; border-radius: 12px; text-align: center; margin: 0 0 20px 0;">
                      <div style="font-size: 42px; font-weight: 800; color: #34d399;">+${creditsAwarded}</div>
                      <div style="color: #a5b4fc; font-size: 14px; margin-top: 4px;">crédito${creditsAwarded > 1 ? 's' : ''} en tu cuenta</div>
                      ${creditsAwarded === 2 ? '<div style="color: #fbbf24; font-size: 12px; margin-top: 10px; padding: 6px 12px; background: rgba(251,191,36,0.1); border-radius: 8px; display: inline-block;">✨ Bonus trial x2</div>' : ''}
                    </div>
                    <p style="color: #94a3b8; margin: 0; font-size: 13px; line-height: 1.5;">
                      Tus agentes pueden seguir mandándonos ideas. Y tú también, claro.
                      Cada idea aprobada = créditos gratis. Así de fácil.
                    </p>
                  </div>
                  <div style="text-align: center; padding: 8px 0;">
                    <a href="https://www.lanzalo.pro" style="display: inline-block; padding: 12px 28px; background: #7c3aed; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Volver a Lánzalo</a>
                  </div>
                  <p style="text-align: center; color: #64748b; font-size: 11px; margin-top: 16px;">
                    Lánzalo — Tu co-fundador AI que no pide equity
                  </p>
                </div>
              `
            });
          } else {
            // ─── Email para feedback enviado directamente por el USUARIO ───
            await resend.emails.send({
              from: FROM_EMAIL,
              to: user.email,
              subject: `Oye ${userName}, que tu idea nos ha molado 🏆`,
              html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; color: #e2e8f0;">
                  <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 32px; margin-bottom: 20px;">
                    <h2 style="color: #a78bfa; margin: 0 0 16px 0; font-size: 22px;">¡Ey ${userName}! Tenemos buenas noticias 🎉</h2>
                    <p style="color: #c4b5fd; margin: 0 0 12px 0; font-size: 15px; line-height: 1.6;">
                      Hemos leído tu feedback y... nos ha encantado. Tanto que lo vamos a desarrollar de verdad.
                      Sí, de verdad de la buena, no de las que dicen "lo tenemos en el roadmap" y nunca pasa.
                    </p>
                    <p style="color: #c4b5fd; margin: 0 0 20px 0; font-size: 15px; line-height: 1.6;">
                      Como agradecimiento por tomarte el tiempo de escribirnos (que sabemos que podrías haber estado
                      viendo memes), te hemos regalado:
                    </p>
                    <div style="background: rgba(255,255,255,0.08); padding: 24px; border-radius: 12px; text-align: center; margin: 0 0 20px 0;">
                      <div style="font-size: 42px; font-weight: 800; color: #34d399;">+${creditsAwarded}</div>
                      <div style="color: #a5b4fc; font-size: 14px; margin-top: 4px;">crédito${creditsAwarded > 1 ? 's' : ''} extra${creditsAwarded > 1 ? 's' : ''} en tu cuenta</div>
                      ${creditsAwarded === 2 ? '<div style="color: #fbbf24; font-size: 12px; margin-top: 10px; padding: 6px 12px; background: rgba(251,191,36,0.1); border-radius: 8px; display: inline-block;">✨ Bonus por estar en trial — que luego no digas que no mimamos a los nuevos</div>' : ''}
                    </div>
                    <p style="color: #94a3b8; margin: 0 0 8px 0; font-size: 14px; line-height: 1.6;">
                      Cada crédito = una tarea nueva que tu Co-Founder resuelve por ti.
                      Vamos, que por escribir un párrafo te llevas trabajo gratis. <strong style="color: #c4b5fd;">Buen negocio, ¿eh?</strong> 😏
                    </p>
                    <p style="color: #94a3b8; margin: 0; font-size: 13px; line-height: 1.5;">
                      Sigue mandando feedback. Es la forma más fácil de sacarle créditos al sistema
                      (y encima nos ayudas a mejorar, win-win).
                    </p>
                  </div>
                  <div style="text-align: center; padding: 8px 0;">
                    <a href="https://www.lanzalo.pro" style="display: inline-block; padding: 12px 28px; background: #7c3aed; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Volver a Lánzalo</a>
                  </div>
                  <p style="text-align: center; color: #64748b; font-size: 11px; margin-top: 16px;">
                    Lánzalo — Tu co-fundador AI que no pide equity
                  </p>
                </div>
              `
            });
          }
        }
      } catch (e) {
        console.error('[Support] Error notifying user:', e.message);
      }
    }

    // Guardar resolución como actividad para que los agentes de CS puedan consultarla
    try {
      await pool.query(
        `INSERT INTO support_tickets (company_id, user_id, type, message, status, source, admin_notes)
         VALUES ($1, $2, 'resolution_log', $3, 'resolved', 'system', $4)`,
        [
          ticket.company_id,
          ticket.user_id,
          `[CS Log] Ticket ${ticketId.slice(0, 8)} ${status === 'approved' ? 'APROBADO' : 'RECHAZADO'}${ticket.source === 'agent' ? ' (origen: agente)' : ' (origen: usuario)'}. Créditos: +${creditsAwarded}. Idea: "${ticket.message.substring(0, 150)}"`,
          `resolution_of:${ticketId}`
        ]
      );
    } catch (e) {
      // Non-critical, just log
      console.error('[Support] Error logging resolution:', e.message);
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
 * Pre-análisis IA de la idea + notificación al owner
 */
async function analyzeIdeaAndNotifyAdmin(ticketId, message, userEmail, companyId, isInTrial) {
  let aiAnalysis = null;

  // Análisis IA de la idea
  try {
    const analysisResponse = await callLLM(
      `Analiza esta idea de mejora para Lánzalo (plataforma SaaS que ayuda a emprendedores a lanzar negocios con IA):

"${message}"

Responde en formato JSON con estos campos:
- viabilidad: "alta" | "media" | "baja" (qué tan fácil es implementar)
- impacto: "alto" | "medio" | "bajo" (impacto en retención y conversión)
- ya_existe: true | false (si ya existe algo parecido en la plataforma)
- resumen: string de 1 frase (qué pide el usuario)
- recomendacion: "aprobar" | "rechazar" | "revisar" (tu recomendación)
- razon: string de 1-2 frases explicando la recomendación`,
      {
        taskType: 'ceo_chat',
        temperature: 0.3,
        maxTokens: 500,
        systemPrompt: 'Eres un analista de producto para una startup SaaS. Responde SOLO con JSON válido, sin markdown.'
      }
    );

    const content = analysisResponse?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiAnalysis = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[Support] Error en análisis IA:', e.message);
  }

  // Guardar análisis en el ticket
  if (aiAnalysis) {
    try {
      await pool.query(
        `UPDATE support_tickets SET admin_notes = $2 WHERE id = $1`,
        [ticketId, `[AI] ${JSON.stringify(aiAnalysis)}`]
      );
    } catch (e) {}
  }

  // Notificar al owner con el análisis
  if (!resend) return;

  const recEmoji = aiAnalysis?.recomendacion === 'aprobar' ? '✅' : aiAnalysis?.recomendacion === 'rechazar' ? '❌' : '🔄';
  const impactoColor = aiAnalysis?.impacto === 'alto' ? '#10b981' : aiAnalysis?.impacto === 'medio' ? '#f59e0b' : '#6b7280';
  const viabilidadColor = aiAnalysis?.viabilidad === 'alta' ? '#10b981' : aiAnalysis?.viabilidad === 'media' ? '#f59e0b' : '#ef4444';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `💡 [Lánzalo] Nueva idea de producto ${aiAnalysis ? `— ${recEmoji} ${aiAnalysis.recomendacion?.toUpperCase()}` : ''} — ${userEmail}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; color: #1e293b;">
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 24px; margin-bottom: 20px;">
            <h2 style="color: #a78bfa; margin: 0 0 4px 0; font-size: 20px;">💡 Nueva idea de producto</h2>
            <p style="color: #94a3b8; margin: 0; font-size: 13px;">De: ${userEmail}${isInTrial ? ' • En trial (bonus x2)' : ''}</p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${message}</p>
          </div>

          ${aiAnalysis ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #166534;">Análisis IA</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Resumen</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600;">${aiAnalysis.resumen || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Impacto</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: ${impactoColor}; text-transform: uppercase;">${aiAnalysis.impacto || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Viabilidad</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: ${viabilidadColor}; text-transform: uppercase;">${aiAnalysis.viabilidad || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Ya existe</td>
                <td style="padding: 6px 0; font-size: 13px;">${aiAnalysis.ya_existe ? 'Sí' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Recomendación IA</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 700;">${recEmoji} ${(aiAnalysis.recomendacion || '-').toUpperCase()}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 8px 0 0 0; color: #64748b; font-size: 12px; font-style: italic;">${aiAnalysis.razon || ''}</td>
              </tr>
            </table>
          </div>
          ` : ''}

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #1e40af;">Ticket <code>${ticketId.slice(0, 8)}</code></p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <a href="https://www.lanzalo.pro/admin?tab=feedback&action=approve&ticket=${ticketId}" 
                 style="display: inline-block; padding: 10px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                ✅ Aprobar (+cr\u00e9dito)
              </a>
              <a href="https://www.lanzalo.pro/admin?tab=feedback&action=reject&ticket=${ticketId}" 
                 style="display: inline-block; padding: 10px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                ❌ Rechazar
              </a>
            </div>
            <p style="margin: 12px 0 0 0; font-size: 12px; color: #3b82f6;">
              <a href="https://www.lanzalo.pro/admin?tab=feedback" style="color: #3b82f6; text-decoration: underline;">Ver todo el feedback en el panel admin →</a>
            </p>
          </div>
        </div>
      `
    });
  } catch (e) {
    console.error('[Support] Error enviando email al admin:', e.message);
  }
}

/**
 * Notificar a admin por email (bugs)
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

// ═══════════════════════════════════════════════════════
// AGENT FEEDBACK — Los agentes de cada negocio pueden
// proponer mejoras para la plataforma Lánzalo
// ═══════════════════════════════════════════════════════

router.post('/agent/feedback', requireAuth, async (req, res) => {
  try {
    const { message, companyId, agentType } = req.body;

    if (!message || message.trim().length < 20) {
      return res.status(400).json({ error: 'El feedback del agente debe tener al menos 20 caracteres' });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (company_id, user_id, type, message, status, source, admin_notes)
       VALUES ($1, $2, 'feedback', $3, 'pending', 'agent', $4)
       RETURNING id, created_at`,
      [
        companyId || null,
        req.user.id,
        message.trim(),
        agentType ? `[Agent: ${agentType}]` : '[Agent]'
      ]
    );

    const ticket = result.rows[0];

    // Pre-análisis + notificación al admin (async)
    analyzeIdeaAndNotifyAdmin(
      ticket.id,
      `[Feedback de agente ${agentType || 'desconocido'}] ${message.trim()}`,
      `agent@${agentType || 'system'}.lanzalo`,
      companyId || null,
      false
    ).catch(e => console.error('[Agent Feedback] Error en análisis:', e.message));

    console.log(`[Agent Feedback] Ticket ${ticket.id} creado por agente ${agentType} (empresa: ${companyId || 'global'})`);

    res.json({
      success: true,
      ticketId: ticket.id,
      message: 'Feedback del agente registrado para revisión'
    });
  } catch (error) {
    console.error('[Agent Feedback] Error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ═══════════════════════════════════════════════════════
// SOPORTE GENERAL — Botón de soporte en cualquier parte
//    del dashboard (sin companyId requerido)
// ═══════════════════════════════════════════════════════

router.post('/support/ticket', requireAuth, async (req, res) => {
  try {
    const { message, type = 'bug', category, url } = req.body;

    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Describe el problema con al menos 10 caracteres' });
    }

    const validTypes = ['bug', 'feedback', 'question', 'other'];
    const ticketType = validTypes.includes(type) ? type : 'bug';

    // Incluir contexto adicional en admin_notes
    const adminNotes = [
      category ? `[Categoría: ${category}]` : null,
      url ? `[URL: ${url}]` : null,
    ].filter(Boolean).join(' ') || null;

    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, type, message, status, source, admin_notes)
       VALUES ($1, $2, $3, 'pending', 'user', $4)
       RETURNING id, created_at`,
      [req.user.id, ticketType, message.trim(), adminNotes]
    );

    const ticket = result.rows[0];

    // Notificar al admin por email (async, no bloquear respuesta)
    notifyAdminSupport(ticket.id, {
      userEmail: req.user.email,
      userName: req.user.name,
      type: ticketType,
      message: message.trim(),
      category: category || null,
      url: url || null,
    }).catch(e => console.error('[Support] Error notificando admin:', e.message));

    console.log(`[Support] Ticket ${ticket.id} creado por ${req.user.email} (tipo: ${ticketType})`);

    res.json({
      success: true,
      ticketId: ticket.id,
      message: 'Tu incidencia ha sido registrada. Nuestro equipo la revisará pronto.'
    });
  } catch (error) {
    console.error('[Support General] Error:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Notificar al admin de un nuevo ticket de soporte general
 */
async function notifyAdminSupport(ticketId, data) {
  if (!resend) return;
  const typeLabels = { bug: '🐛 Bug', feedback: '💡 Feedback', question: '❓ Pregunta', other: '📝 Otro' };
  const typeLabel = typeLabels[data.type] || '📝 Ticket';
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `${typeLabel} — ${data.userEmail} — Lánzalo Soporte`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #10b981;">🎫 Nuevo Ticket de Soporte</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="background: #f9fafb;"><td style="padding: 10px; color: #6b7280; width: 120px;">Tipo</td><td style="padding: 10px; font-weight: bold;">${typeLabel}</td></tr>
            <tr><td style="padding: 10px; color: #6b7280;">Usuario</td><td style="padding: 10px;">${data.userName || ''} &lt;${data.userEmail}&gt;</td></tr>
            ${data.category ? `<tr style="background: #f9fafb;"><td style="padding: 10px; color: #6b7280;">Categoría</td><td style="padding: 10px;">${data.category}</td></tr>` : ''}
            ${data.url ? `<tr><td style="padding: 10px; color: #6b7280;">URL</td><td style="padding: 10px;"><code>${data.url}</code></td></tr>` : ''}
            <tr style="background: #f9fafb;"><td style="padding: 10px; color: #6b7280;">Ticket ID</td><td style="padding: 10px;"><code>${ticketId.slice(0, 8)}</code></td></tr>
          </table>
          <div style="background: #f3f4f6; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap; font-size: 15px;">${data.message}</p>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
            <a href="https://www.lanzalo.pro/admin?tab=feedback" style="color: #10b981;">Ver todos los tickets en el panel admin →</a>
          </p>
        </div>
      `
    });
  } catch (e) {
    console.error('[Support] Error enviando email de soporte:', e.message);
  }
}

module.exports = router;
