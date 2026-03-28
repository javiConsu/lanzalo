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
 * Send post-onboarding email: Co-Founder already working on your idea
 * Polsia-style: personalized, shows work done, with brand voice
 */
async function sendCoFounderFirstEmail(user, company, intakeContext) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping co-founder email');
    return { success: false, reason: 'not_configured' };
  }

  try {
    // Generate personalized email content with LLM
    const { callLLM } = require('../llm');
    
    const prompt = `Eres el Co-Founder IA de Lanzalo. Acabas de crear la empresa de tu socio y ya estás trabajando.

DATOS DEL SOCIO:
- Nombre: ${user.name || 'Emprendedor'}
- Email: ${user.email}
${intakeContext || ''}

DATOS DE LA EMPRESA:
- Nombre: ${company.name}
- Descripción: ${company.description}
- Audiencia: ${company.audience || 'Por definir'}

ESCRIBE UN EMAIL DE BIENVENIDA POST-ONBOARDING.

ESTILO (IMPORTANTE):
- Como Polsia pero en español y más gamberro
- Demuestra que has LEÍDO lo que escribió el fundador (referencia datos concretos de su aboutMe o lookingFor)
- Dile QUÉ ya estás haciendo ("ya estoy analizando tu mercado", "estoy investigando competidores...")
- Menciona que va a recibir un análisis de mercado y plan de negocio con valoración de su idea
- NO seas un coach motivacional. Sé un socio que ya está currando.
- Tono: directo, un poco borde pero con cariño, nada corporativo
- Usa el nombre del usuario si lo tienes
- 4-8 frases de cuerpo. Nada de párrafos enormes.

FORMATO: Devuelve SOLO el texto del email (sin HTML, sin subject). Cada párrafo separado por línea en blanco.
No uses saludo tipo "Querido" ni "Estimado". Empieza directo con el nombre o un "Bueno,".
Termina con algo tipo "Tu Co-Founder, que ya está currando" o similar.`;

    const response = await callLLM(prompt, {
      taskType: 'ceo_chat',
      temperature: 0.8,
      maxTokens: 600
    });

    const emailBody = response.content || '';
    if (!emailBody) {
      console.warn('[Email] LLM returned empty body for co-founder email');
      return { success: false, reason: 'empty_body' };
    }

    const htmlBody = renderCoFounderFirstEmail(user, company, emailBody);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `${company.name} — ya estoy trabajando en tu idea`,
      html: htmlBody
    });

    if (error) {
      console.error('[Email] Error sending co-founder email:', error);
      return { success: false, error };
    }

    console.log(`[Email] Co-Founder first email sent to ${user.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception sending co-founder email:', error);
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

/**
 * Send upgrade required email (company paused due to budget limits)
 */
async function sendUpgradeRequiredEmail(user, company, reason) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping upgrade required email');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `🛑 ${company.name} pausada — Upgrade requerido`,
      html: renderUpgradeRequiredEmail(user, company, reason)
    });

    if (error) {
      console.error('[Email] Error sending upgrade required:', error);
      return { success: false, error };
    }

    console.log(`[Email] Upgrade required email sent to ${user.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception sending upgrade required:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send payment failed email
 */
async function sendPaymentFailedEmail(user, companyName) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping payment failed email');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `❌ Pago fallido — ${companyName}`,
      html: renderPaymentFailedEmail(user, companyName)
    });

    if (error) {
      console.error('[Email] Error sending payment failed:', error);
      return { success: false, error };
    }

    console.log(`[Email] Payment failed email sent to ${user.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception sending payment failed:', error);
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
      
      <p><strong>Qué va a pasar ahora:</strong></p>
      <ol>
        <li>Describe tu idea de negocio</li>
        <li>Tu Co-Founder analiza mercado, competencia y viabilidad</li>
        <li>Te da un veredicto sincero con opciones claras</li>
        <li>Construís juntos (o pivotas, si hace falta)</li>
      </ol>
      
      <a href="https://lanzalo.pro" class="cta">Entrar a Lanzalo →</a>
      
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
        Ver cola de tareas →
      </a>
      
    </body>
    </html>
  `;
}

function renderCoFounderFirstEmail(user, company, bodyText) {
  // Convert plain text paragraphs to HTML
  const htmlParagraphs = bodyText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 16px 0; color: #e5e7eb; font-size: 15px; line-height: 1.7;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  // Email template uses table-based layout for maximum email client compatibility.
  // Many clients strip body background-color, so we use a wrapper table with bgcolor.
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- Outer wrapper table for background color (email client safe) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0a0a0a;">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <!-- Inner content table -->
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
              
              <!-- Logo -->
              <tr>
                <td style="padding-bottom: 32px;">
                  <span style="font-size: 20px; font-weight: 800; color: #10b981; letter-spacing: -0.5px;">Lanzalo.pro</span>
                </td>
              </tr>
              
              <!-- Body text -->
              <tr>
                <td style="color: #e5e7eb; font-size: 15px; line-height: 1.7;">
                  ${htmlParagraphs}
                </td>
              </tr>
              
              <!-- Status box -->
              <tr>
                <td style="padding: 24px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #111827; border: 1px solid #1f2937; border-left: 3px solid #10b981; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="color: #10b981; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; font-weight: 700;">Lo que ya estoy haciendo</p>
                        <p style="color: #9ca3af; font-size: 14px; margin: 4px 0;"><span style="color: #10b981; margin-right: 8px;">✓</span> Empresa creada: ${company.name}</p>
                        <p style="color: #9ca3af; font-size: 14px; margin: 4px 0;"><span style="color: #f59e0b; margin-right: 8px;">○</span> Análisis de mercado y competencia en curso</p>
                        <p style="color: #9ca3af; font-size: 14px; margin: 4px 0;"><span style="color: #f59e0b; margin-right: 8px;">○</span> Plan de negocio con valoración de la idea</p>
                        <p style="color: #9ca3af; font-size: 14px; margin: 4px 0;"><span style="color: #f59e0b; margin-right: 8px;">○</span> Veredicto del Co-Founder en tu chat</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- CTA button -->
              <tr>
                <td style="padding-bottom: 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color: #10b981; border-radius: 8px;">
                        <a href="https://lanzalo.pro" target="_blank" style="display: inline-block; padding: 14px 28px; color: #000000; text-decoration: none; font-weight: 600; font-size: 15px;">Abrir tu dashboard →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding-top: 20px; border-top: 1px solid #1f2937;">
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;"><strong style="color: #9ca3af;">Lanzalo</strong> — Tu equipo de IA que no duerme</p>
                  <p style="color: #6b7280; font-size: 13px; font-style: italic; margin: 0;">PD: Si esto fuera un co-founder humano, te estaría cobrando equity. A mí me vale con $39/mes.</p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
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

function renderUpgradeRequiredEmail(user, company, reason) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 16px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; }
        .cta { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <h1>🛑 ${company.name} pausada</h1>
      
      <p>Hola ${user.name || 'ahí'},</p>
      
      <div class="warning">
        <strong>Tu empresa está pausada.</strong><br>
        Razón: ${reason || 'Límite de presupuesto excedido'}
      </div>
      
      <p>Tus agentes han dejado de trabajar en ${company.name}.</p>
      
      <p>Para reactivar:</p>
      
      <a href="https://lanzalo.pro/settings/billing" class="cta">Upgrade de plan →</a>
      
      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        Planes disponibles: Starter €29/mes | Pro €79/mes | Business €199/mes
      </p>
      
    </body>
    </html>
  `;
}

function renderPaymentFailedEmail(user, companyName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 16px; }
        .error { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; }
        .cta { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <h1>❌ Pago fallido</h1>
      
      <p>Hola ${user.name || 'ahí'},</p>
      
      <div class="error">
        <strong>No pudimos procesar tu pago.</strong><br>
        Empresa: ${companyName}
      </div>
      
      <p>Posibles causas:</p>
      <ul>
        <li>Tarjeta expirada</li>
        <li>Fondos insuficientes</li>
        <li>Tarjeta bloqueada</li>
      </ul>
      
      <a href="https://lanzalo.pro/settings/billing" class="cta">Actualizar método de pago →</a>
      
      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        Intentaremos cobrar de nuevo en 3 días. Si falla otra vez, tu cuenta pasará a plan Free.
      </p>
      
    </body>
    </html>
  `;
}

module.exports = {
  sendWelcomeEmail,
  sendCoFounderFirstEmail,
  sendTrialReminder,
  sendValidationComplete,
  sendDailySync,
  sendTaskCompleted,
  sendDowngradeNotification,
  sendUpgradeRequiredEmail,
  sendPaymentFailedEmail
};
