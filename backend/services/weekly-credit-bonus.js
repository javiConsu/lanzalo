/**
 * Weekly Credit Bonus — Lánzalo
 * 
 * Cada lunes a las 09:00 CET, regala +1 crédito a TODOS los usuarios activos.
 * No es mucho, pero algo se hace. El usuario entra, ve cosas, le llegan emails...
 * 
 * "No avanzas rápido, pero avanzas" — filosofía anti-abandono.
 */

const cron = require('node-cron');
const { pool } = require('../db');
const { addCredits } = require('../middleware/credits');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'Lanzalo <noreply@lanzalo.pro>';

/**
 * Dar +1 crédito semanal a todos los usuarios activos
 */
async function grantWeeklyCredit() {
  console.log('[Weekly Credit] Iniciando bonus semanal...');

  try {
    // Usuarios activos: tienen al menos 1 empresa y login en los últimos 30 días
    const result = await pool.query(`
      SELECT DISTINCT u.id, u.email, u.name, u.plan
      FROM users u
      INNER JOIN companies c ON c.user_id = u.id
      WHERE u.role != 'admin'
        AND (u.last_login_at > NOW() - INTERVAL '30 days' 
             OR u.last_login > NOW() - INTERVAL '30 days'
             OR u.created_at > NOW() - INTERVAL '30 days')
    `);

    const users = result.rows;
    console.log(`[Weekly Credit] ${users.length} usuarios activos encontrados`);

    let credited = 0;
    let emailed = 0;

    for (const user of users) {
      try {
        // Dar el crédito
        await addCredits(user.id, 1, 'weekly_bonus', { 
          reason: 'Bonus semanal automático',
          week: new Date().toISOString().slice(0, 10)
        });
        credited++;

        // Email de notificación
        if (resend && user.email) {
          const userName = user.name ? user.name.split(' ')[0] : 'crack';
          await resend.emails.send({
            from: FROM_EMAIL,
            to: user.email,
            subject: `🎫 Tu crédito semanal está aquí, ${userName}`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 28px; color: white;">
                  <h2 style="color: #a78bfa; margin: 0 0 12px 0; font-size: 20px;">¡Ey ${userName}! Regalo de los lunes 🎁</h2>
                  <p style="color: #c4b5fd; margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">
                    Como cada semana, aquí tienes tu crédito gratis. 
                    Es uno solo, pero oye, Roma no se construyó en un día 
                    (aunque con tu Co-Founder igual sí).
                  </p>
                  <div style="background: rgba(255,255,255,0.08); padding: 16px; border-radius: 10px; text-align: center; margin: 0 0 16px 0;">
                    <div style="font-size: 36px; font-weight: 800; color: #34d399;">+1</div>
                    <div style="color: #a5b4fc; font-size: 13px;">crédito añadido a tu cuenta</div>
                  </div>
                  <p style="color: #94a3b8; margin: 0 0 16px 0; font-size: 13px; line-height: 1.5;">
                    Úsalo para una tarea nueva: análisis de mercado, landing, campaña de email...
                    tu Co-Founder está esperando órdenes.
                  </p>
                  <div style="text-align: center;">
                    <a href="https://www.lanzalo.pro" style="display: inline-block; padding: 10px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 13px;">Usar mi crédito →</a>
                  </div>
                </div>
                <p style="text-align: center; color: #64748b; font-size: 11px; margin-top: 14px;">
                  ¿Quieres más créditos? Envía feedback o compra un pack 💰
                </p>
              </div>
            `
          });
          emailed++;
        }
      } catch (e) {
        console.error(`[Weekly Credit] Error para user ${user.id}:`, e.message);
      }
    }

    console.log(`[Weekly Credit] ✅ Completado: ${credited} créditos otorgados, ${emailed} emails enviados`);
    return { credited, emailed, total: users.length };

  } catch (error) {
    console.error('[Weekly Credit] Error general:', error.message);
    return { credited: 0, emailed: 0, error: error.message };
  }
}

/**
 * Programar: Lunes a las 08:00 UTC (09:00 CET)
 */
function scheduleWeeklyCredit() {
  // Lunes 08:00 UTC = 09:00 CET
  cron.schedule('0 8 * * 1', async () => {
    console.log('[Weekly Credit] Cron disparado — lunes 09:00 CET');
    await grantWeeklyCredit();
  }, { timezone: 'UTC' });

  console.log('[Weekly Credit] ✅ Programado: lunes 08:00 UTC (09:00 CET)');
}

module.exports = { grantWeeklyCredit, scheduleWeeklyCredit };
