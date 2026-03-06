/**
 * Email Service
 * Handles all email sending via Resend
 * Uses React Email templates
 */

const { Resend } = require('resend');

// Initialize Resend client
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = 'Lanzalo <noreply@lanzalo.pro>';

/**
 * Send welcome email on registration
 */
async function sendWelcomeEmail(user) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping welcome email');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: '🚀 Bienvenido a Lanzalo',
      html: renderWelcomeEmail(user)
    });

    if (error) {
      console.error('[Email] Error sending welcome:', error);
      return { success: false, error };
    }

    console.log(`[Email] Welcome sent to ${user.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception sending welcome:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send trial reminder (3, 2, or 1 days before expiry)
 */
async function sendTrialReminder(user, daysLeft) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping trial reminder');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `⏰ Tu trial termina en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`,
      html: renderTrialReminderEmail(user, daysLeft)
    });

    if (error) {
      console.error('[Email] Error sending trial reminder:', error);
      return { success: false, error };
    }

    console.log(`[Email] Trial reminder (${daysLeft}d) sent to ${user.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception sending trial reminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send validation complete email
 */
async function sendValidationComplete(user, company, validation) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping validation email');
    return { success: false, reason: 'not_configured' };
  }

  const verdictEmoji = validation.verdict === 'green' ? '🟢' : 
                      validation.verdict === 'yellow' ? '🟡' : '🔴';

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `${verdictEmoji} Idea validada — ${company.name}`,
      html: renderValidationCompleteEmail(company, validation)
    });

    if (error) {
      console.error('[Email] Error sending validation complete:', error);
      return { success: false, error };
    }

    console.log(`[Email] Validation complete sent to ${user.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception sending validation complete:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send daily sync summary
 */
async function sendDailySync(user, company, sync) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping daily sync');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `📊 Daily Sync — ${company.name}`,
      html: renderDailySyncEmail(company, sync)
    });

    if (error) {
      console.error('[Email] Error sending daily sync:', error);
      return { success: false, error };
    }

    console.log(`[Email] Daily sync sent to ${user.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception sending daily sync:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send task completed notification
 */
async function sendTaskCompleted(user, company, task) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping task notification');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `✅ Task completada — ${task.title}`,
      html: renderTaskCompletedEmail(company, task)
    });

    if (error) {
      console.error('[Email] Error sending task completed:', error);
      return { success: false, error };
    }

    console.log(`[Email] Task completed sent to ${user.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception sending task completed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send downgrade notification (trial ended)
 */
async function sendDowngradeNotification(user) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping downgrade email');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: '⚠️ Tu trial ha terminado',
      html: renderDowngradeEmail(user)
    });

    if (error) {
      console.error('[Email] Error sending downgrade:', error);
      return { success: false, error };
    }

    console.log(`[Email] Downgrade notification sent to ${user.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception sending downgrade:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EMAIL RENDERERS (Simple HTML versions)
// TODO: Replace with React Email when templates are built
// ============================================================================

function renderWelcomeEmail(user) {
  const trialEndsDate = new Date(user.trial_ends_at).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 16px; }
        .cta { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
        .footer { color: #6b7280; font-size: 14px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <h1>🚀 Bienvenido a Lanzalo</h1>
      
      <p>Hola ${user.name || 'ahí'},</p>
      
      <p>Acabas de conseguir algo raro:<br><strong>Un co-fundador que te dice la verdad.</strong></p>
      
      <p>No como esas IAs que dicen "sí" a todo.<br>
      Si tu idea es mala → Te lo digo.<br>
      Si tu plan no va a funcionar → Te explico por qué.<br>
      Si hay mejor manera → Te la muestro.</p>
      
      <p>Porque eso es lo que hace un co-fundador de verdad.</p>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      
      <h2 style="font-size: 18px;">Tienes 14 días gratis</h2>
      
      <p>Sin tarjeta. Sin compromiso. Sin trucos.</p>
      
      <p><strong>Próximos pasos:</strong></p>
      <ol>
        <li>Completa Strategic Discovery (28 preguntas)</li>
        <li>Te analizo y propongo 3-5 caminos</li>
        <li>Eliges el mejor para TI</li>
        <li>Construimos juntos</li>
      </ol>
      
      <a href="https://app.lanzalo.pro/discovery" class="cta">Empezar Discovery →</a>
      
      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        Tu trial termina el: ${trialEndsDate}
      </p>
      
      <div class="footer">
        <p><strong>Lanzalo</strong><br>Tu equipo de IA trabajando 24/7</p>
        <p style="margin-top: 12px; font-size: 13px; font-style: italic;">
          PD: Si quieres un asistente que diga "sí" a todo,<br>hay mil opciones. Nosotros no somos esa.
        </p>
      </div>
    </body>
    </html>
  `;
}

function renderTrialReminderEmail(user, daysLeft) {
  const isUrgent = daysLeft === 1;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 16px; }
        .urgent { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; }
        .cta { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
        .footer { color: #6b7280; font-size: 14px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <h1>⏰ Tu trial termina en ${daysLeft} día${daysLeft > 1 ? 's' : ''}</h1>
      
      <p>Hola ${user.name},</p>
      
      ${isUrgent ? `
        <div class="urgent">
          <strong>Último día de trial.</strong><br>
          Mañana tu cuenta pasa a plan Free automáticamente.
        </div>
      ` : `
        <p>Te quedan ${daysLeft} días de trial completo.<br>
        Después, downgradeas a Free automáticamente.</p>
      `}
      
      <h2 style="font-size: 18px;">Plan Pro — €39/mes</h2>
      <p>Todo ilimitado. Sin límites. Para siempre.</p>
      
      <a href="https://app.lanzalo.pro/upgrade" class="cta">Upgrade a Pro →</a>
      
      <div class="footer">
        <p><strong>Lanzalo</strong></p>
      </div>
    </body>
    </html>
  `;
}

function renderValidationCompleteEmail(company, validation) {
  const verdictEmoji = validation.verdict === 'green' ? '🟢' : 
                      validation.verdict === 'yellow' ? '🟡' : '🔴';
  const verdictText = validation.verdict === 'green' ? 'VERDE' : 
                     validation.verdict === 'yellow' ? 'AMARILLO' : 'ROJO';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 16px; }
        .cta { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <h1>🔍 Idea validada — ${company.name}</h1>
      
      <p>Hola,</p>
      
      <p>Terminé de investigar tu idea. Aquí el veredicto:</p>
      
      <div style="background: #f3f4f6; border-left: 4px solid ${validation.verdict === 'green' ? '#10b981' : validation.verdict === 'yellow' ? '#f59e0b' : '#ef4444'}; padding: 16px; margin: 16px 0;">
        <h2 style="margin: 0; color: ${validation.verdict === 'green' ? '#10b981' : validation.verdict === 'yellow' ? '#f59e0b' : '#ef4444'};">
          ${verdictEmoji} Veredicto: ${verdictText}
        </h2>
        <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: bold;">
          Score: ${validation.score}/10
        </p>
      </div>
      
      <a href="https://app.lanzalo.pro/chat/${company.id}" class="cta">Ver reporte completo →</a>
      
    </body>
    </html>
  `;
}

function renderDailySyncEmail(company, sync) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <h1>📊 Daily Sync — ${company.name}</h1>
      
      <p>Hola,</p>
      
      <p>${sync.summary}</p>
      
      <a href="https://app.lanzalo.pro/chat/${company.id}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Ver detalles →
      </a>
      
    </body>
    </html>
  `;
}

function renderTaskCompletedEmail(company, task) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <h1>✅ Task completada</h1>
      
      <p><strong>${task.title}</strong></p>
      <p>${task.description || ''}</p>
      
      <a href="https://app.lanzalo.pro/backlog" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Ver backlog →
      </a>
      
    </body>
    </html>
  `;
}

function renderDowngradeEmail(user) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <h1>⚠️ Tu trial ha terminado</h1>
      
      <p>Hola ${user.name},</p>
      
      <p>Tu trial de 14 días terminó. Tu cuenta ahora está en plan Free.</p>
      
      <p><strong>Qué mantiene access:</strong></p>
      <ul>
        <li>1 negocio (el primero)</li>
        <li>Landing page funcionando</li>
        <li>Dashboard básico</li>
      </ul>
      
      <p>Para recuperar todas las features, upgrade a Pro:</p>
      
      <a href="https://app.lanzalo.pro/upgrade" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Upgrade a Pro (€39/mes) →
      </a>
      
    </body>
    </html>
  `;
}

module.exports = {
  sendWelcomeEmail,
  sendTrialReminder,
  sendValidationComplete,
  sendDailySync,
  sendTaskCompleted,
  sendDowngradeNotification
};
