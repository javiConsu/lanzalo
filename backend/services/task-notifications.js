/**
 * Task Notifications — Lánzalo
 * 
 * Envía email al usuario cuando:
 * - Se crea una tarea (el Co-Founder la ha mandado al equipo)
 * - Se completa una tarea (resultados listos)
 * - Falla una tarea (algo salió mal)
 * 
 * El objetivo: que el usuario vea movimiento, entre, y se enganche.
 */

const { Resend } = require('resend');
const { pool } = require('../db');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'Lanzalo <noreply@lanzalo.pro>';

const TAG_NAMES = {
  code: '💻 Ingeniería',
  engineering: '💻 Ingeniería',
  marketing: '📣 Marketing',
  email: '📧 Email',
  twitter: '🐦 Twitter',
  research: '🔍 Investigación',
  data: '📊 Datos',
  browser: '🌐 Web',
  trends: '🔮 Tendencias',
  ideas: '💡 Ideas'
};

/**
 * Notificar que una tarea ha sido creada
 */
async function notifyTaskCreated(task) {
  if (!resend) return;
  
  try {
    const user = await getTaskOwner(task.company_id);
    if (!user) return;

    const userName = user.name ? user.name.split(' ')[0] : 'crack';
    const agentName = TAG_NAMES[task.tag] || task.tag || 'Equipo';

    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `⚡ [${user.company_name}] ${agentName} está en marcha`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 24px;">
            <p style="color: #6b7280; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">${user.company_name}</p>
            <p style="color: #9ca3af; font-size: 13px; margin: 0 0 12px 0;">Ey ${userName}, movimiento en tu negocio:</p>
            <div style="background: #1f2937; border-radius: 10px; padding: 16px; margin: 0 0 16px 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 12px; color: #6b7280;">${agentName}</span>
                <span style="font-size: 11px; color: #374151;">•</span>
                <span style="font-size: 11px; color: ${task.priority === 'high' || task.priority === 'critical' ? '#f87171' : '#6b7280'};">${task.priority || 'medium'}</span>
              </div>
              <p style="color: #e5e7eb; font-size: 15px; font-weight: 600; margin: 0 0 6px 0;">${task.title}</p>
              ${task.description ? `<p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">${task.description.substring(0, 150)}${task.description.length > 150 ? '...' : ''}</p>` : ''}
            </div>
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 16px 0;">
              Tu equipo de agentes está en ello. Te avisamos cuando termine.
            </p>
            <div style="text-align: center;">
              <a href="https://www.lanzalo.pro" style="display: inline-block; padding: 10px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px;">Ver en Lánzalo →</a>
            </div>
          </div>
        </div>
      `
    });

    console.log(`[Task Notify] Email enviado a ${user.email}: tarea creada "${task.title}"`);
  } catch (e) {
    console.error('[Task Notify] Error notifying task created:', e.message);
  }
}

/**
 * Notificar que una tarea ha sido completada
 */
async function notifyTaskCompleted(task) {
  if (!resend) return;

  try {
    const user = await getTaskOwner(task.company_id);
    if (!user) return;

    const userName = user.name ? user.name.split(' ')[0] : 'crack';
    const agentName = TAG_NAMES[task.tag] || task.tag || 'Equipo';

    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `✅ [${user.company_name}] ${task.title.substring(0, 45)} — listo`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 24px;">
            <p style="color: #6b7280; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">${user.company_name}</p>
            <h2 style="color: #34d399; margin: 0 0 6px 0; font-size: 18px;">¡Hecho! ✅</h2>
            <p style="color: #9ca3af; font-size: 13px; margin: 0 0 16px 0;">${agentName} ha terminado su trabajo, ${userName}.</p>
            <div style="background: #1f2937; border-left: 3px solid #34d399; border-radius: 0 10px 10px 0; padding: 16px; margin: 0 0 16px 0;">
              <p style="color: #e5e7eb; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">${task.title}</p>
              ${task.output ? `<p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">${String(task.output).substring(0, 200)}${String(task.output).length > 200 ? '...' : ''}</p>` : ''}
            </div>
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 16px 0;">
              Entra para ver el resultado completo y decidir los siguientes pasos con tu Co-Founder.
            </p>
            <div style="text-align: center;">
              <a href="https://www.lanzalo.pro" style="display: inline-block; padding: 10px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px;">Ver resultado →</a>
            </div>
          </div>
        </div>
      `
    });

    console.log(`[Task Notify] Email enviado a ${user.email}: tarea completada "${task.title}"`);
  } catch (e) {
    console.error('[Task Notify] Error notifying task completed:', e.message);
  }
}

/**
 * Notificar que una tarea ha fallado
 */
async function notifyTaskFailed(task) {
  if (!resend) return;

  try {
    const user = await getTaskOwner(task.company_id);
    if (!user) return;

    const userName = user.name ? user.name.split(' ')[0] : 'crack';

    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `⚠️ [${user.company_name}] Problema con: ${task.title.substring(0, 40)}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 24px;">
            <p style="color: #6b7280; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">${user.company_name}</p>
            <h2 style="color: #f59e0b; margin: 0 0 6px 0; font-size: 18px;">Hmm, algo no ha ido bien ⚠️</h2>
            <p style="color: #9ca3af; font-size: 13px; margin: 0 0 16px 0;">
              ${userName}, la tarea "${task.title}" ha tenido un problema. 
              Tranqui, no se ha perdido ningún crédito — solo se cobra si funciona.
              Tu Co-Founder puede reintentarlo o buscar otra forma.
            </p>
            <div style="text-align: center;">
              <a href="https://www.lanzalo.pro" style="display: inline-block; padding: 10px 24px; background: #f59e0b; color: #111827; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px;">Hablar con Co-Founder →</a>
            </div>
          </div>
        </div>
      `
    });
  } catch (e) {
    console.error('[Task Notify] Error notifying task failed:', e.message);
  }
}

/**
 * Helper: Obtener owner de la empresa
 */
async function getTaskOwner(companyId) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, c.name as company_name
       FROM users u 
       INNER JOIN companies c ON c.user_id = u.id 
       WHERE c.id = $1`,
      [companyId]
    );
    return result.rows[0] || null;
  } catch (e) {
    return null;
  }
}

module.exports = { notifyTaskCreated, notifyTaskCompleted, notifyTaskFailed };
