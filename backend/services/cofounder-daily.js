/**
 * Co-Founder Proactivo Diario
 * 
 * Cada mañana (08:00 CET = 07:00 UTC):
 * 1. Revisa estado de cada proyecto activo
 * 2. Genera plan del día con el tono del Co-Founder
 * 3. Envía mensaje por chat Y email al usuario
 * 
 * El Co-Founder NO espera — propone, decide, mueve.
 */

const cron = require('node-cron');
const { pool } = require('../db');
const { callLLM } = require('../llm');
const { getSystemPrompt } = require('../../agents/system-prompts');
const { Resend } = require('resend');
const crypto = require('crypto');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = 'Lanzalo <noreply@lanzalo.pro>';

/**
 * Programar el briefing diario del Co-Founder
 * Lunes a Viernes, 08:00 CET (07:00 UTC)
 */
function scheduleCofounderDaily() {
  // Lunes a Viernes, 07:00 UTC (08:00 CET)
  cron.schedule('0 7 * * 1-5', async () => {
    console.log('[Co-Founder Daily] Arrancando briefing matutino...');
    await runDailyBriefingForAll();
  });

  console.log('[Co-Founder Daily] Programado: L-V a las 08:00 CET');
}

/**
 * Ejecutar briefing para TODOS los proyectos activos
 */
async function runDailyBriefingForAll() {
  try {
    // Obtener todos los proyectos activos con sus usuarios
    const result = await pool.query(`
      SELECT c.id as company_id, c.name, c.description, c.industry, c.status,
             c.revenue_total, c.subdomain,
             u.id as user_id, u.email, u.name as user_name
      FROM companies c
      JOIN users u ON c.user_id = u.id
      WHERE c.status = 'active'
    `);

    const projects = result.rows;
    console.log(`[Co-Founder Daily] ${projects.length} proyectos activos`);

    for (const project of projects) {
      try {
        await generateDailyBriefing(project);
      } catch (error) {
        console.error(`[Co-Founder Daily] Error en ${project.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[Co-Founder Daily] Error general:', error.message);
  }
}

/**
 * Generar briefing diario para UN proyecto
 */
async function generateDailyBriefing(project) {
  const { company_id, name, description, industry, email, user_name } = project;

  // 1. Recopilar estado actual del proyecto
  const context = await gatherProjectContext(company_id);

  // 2. Generar plan del día con LLM
  const briefing = await generateBriefingWithLLM(project, context);
  if (!briefing) return;

  // 3. Guardar como mensaje del Co-Founder en el chat
  await pool.query(
    `INSERT INTO chat_messages (company_id, role, content, created_at)
     VALUES ($1, 'assistant', $2, NOW())`,
    [company_id, briefing]
  );

  // 4. Enviar email al usuario
  await sendBriefingEmail(email, user_name, name, briefing);

  console.log(`[Co-Founder Daily] Briefing enviado para ${name} → ${email}`);
}

/**
 * Recopilar contexto del proyecto para el briefing
 */
async function gatherProjectContext(companyId) {
  const context = {};

  // Tareas completadas ayer
  const completed = await pool.query(
    `SELECT title, tag, output FROM tasks 
     WHERE company_id = $1 AND status = 'completed'
       AND completed_at >= NOW() - INTERVAL '24 hours'
     ORDER BY completed_at DESC LIMIT 10`,
    [companyId]
  );
  context.completedYesterday = completed.rows;

  // Tareas fallidas
  const failed = await pool.query(
    `SELECT title, tag, error_message FROM tasks 
     WHERE company_id = $1 AND status = 'failed'
       AND updated_at >= NOW() - INTERVAL '24 hours'
     LIMIT 5`,
    [companyId]
  );
  context.failedYesterday = failed.rows;

  // Tareas pendientes en backlog
  const pending = await pool.query(
    `SELECT title, tag, priority, created_at FROM tasks 
     WHERE company_id = $1 AND status IN ('todo', 'in_progress')
     ORDER BY 
       CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       created_at
     LIMIT 10`,
    [companyId]
  );
  context.pendingTasks = pending.rows;

  // Últimos mensajes del chat (para contexto de conversación)
  const chat = await pool.query(
    `SELECT role, content FROM chat_messages 
     WHERE company_id = $1 
     ORDER BY created_at DESC LIMIT 5`,
    [companyId]
  );
  context.recentChat = chat.rows.reverse();

  // Memoria del proyecto
  try {
    const memory = await pool.query(
      'SELECT layer, content FROM memory WHERE company_id = $1 AND layer IN (1, 2)',
      [companyId]
    );
    context.memory = memory.rows;
  } catch (e) {
    context.memory = [];
  }

  // Reports/análisis generados
  try {
    const reports = await pool.query(
      `SELECT title, type, created_at FROM reports
       WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 3`,
      [companyId]
    );
    context.recentReports = reports.rows;
  } catch (e) {
    context.recentReports = [];
  }

  return context;
}

/**
 * Generar el briefing con LLM usando la voz del Co-Founder
 */
async function generateBriefingWithLLM(project, context) {
  const { name, description, industry } = project;

  // Formatear contexto
  let contextStr = `EMPRESA: ${name}\nINDUSTRIA: ${industry || 'No definida'}\nDESCRIPCIÓN: ${description || 'Sin descripción'}`;

  if (context.completedYesterday.length > 0) {
    contextStr += '\n\nTAREAS COMPLETADAS AYER:';
    for (const t of context.completedYesterday) {
      contextStr += `\n- [${t.tag}] ${t.title}`;
      if (t.output) contextStr += ` → ${t.output.substring(0, 100)}`;
    }
  }

  if (context.failedYesterday.length > 0) {
    contextStr += '\n\nTAREAS FALLIDAS:';
    for (const t of context.failedYesterday) {
      contextStr += `\n- [${t.tag}] ${t.title}: ${t.error_message || 'Error desconocido'}`;
    }
  }

  if (context.pendingTasks.length > 0) {
    contextStr += '\n\nBACKLOG PENDIENTE:';
    for (const t of context.pendingTasks) {
      contextStr += `\n- [${t.priority}/${t.tag}] ${t.title}`;
    }
  }

  if (context.recentChat.length > 0) {
    contextStr += '\n\nÚLTIMOS MENSAJES DEL CHAT:';
    for (const m of context.recentChat.slice(-3)) {
      contextStr += `\n[${m.role}]: ${m.content.substring(0, 200)}`;
    }
  }

  // Memory context
  for (const mem of context.memory) {
    try {
      const data = typeof mem.content === 'string' ? JSON.parse(mem.content) : mem.content;
      if (data.targetAudience) contextStr += `\nAUDIENCIA: ${data.targetAudience}`;
      if (data.keyFeatures?.length) contextStr += `\nFEATURES: ${data.keyFeatures.join(', ')}`;
    } catch (e) {}
  }

  const systemPrompt = getSystemPrompt('ceo', name, contextStr);

  const prompt = `INSTRUCCIÓN INTERNA (no repitas esto):
Es por la mañana. Eres el Co-Founder y acabas de llegar a la oficina (virtual). 
Revisa TODO lo que ha pasado y propón el plan del día.

GENERA un mensaje de briefing matutino para tu socio. ESTRUCTURA:

1. SALUDO RÁPIDO (1 frase, con tu humor habitual — referencia algo del contexto si puedes)

2. RESUMEN RÁPIDO de lo que pasó ayer (2-3 frases max):
   - Tareas completadas: menciiona las importantes
   - Problemas: si algo falló, dilo
   - Si no pasó nada ayer, dilo también ("Ayer día tranquilo. Hoy toca moverse.")

3. PLAN DEL DÍA — Lo importante. Propón 2-4 acciones concretas:
   "Hoy tengo planeado hacer esto:"
   1. [acción específica] → quién lo hace
   2. [acción específica] → quién lo hace
   3. [acción específica] → quién lo hace

4. CIERRE con una pregunta que requiera mínima fricción:
   "¿Te parece bien o cambio algo?"
   o "Si no me dices nada, arranco a las 10."
   o "¿Alguna prioridad que me esté saltando?"

REGLAS:
- TODO en español
- Tono Co-Founder: directo, con humor, sin corporativismo
- NUNCA preguntes "¿qué quieres hacer hoy?" — TÚ propones
- El plan debe ser ESPECÍFICO al estado actual del proyecto
- Si el proyecto está parado, propón tú lo siguiente lógico
- Si hay tareas fallidas, propón solución
- Si no hay backlog, propón nuevas tareas basándote en la fase del proyecto
- CORTO: máximo 10-15 líneas. No te enrolles.
- Si el proyecto acaba de empezar y no hay análisis de mercado → proponerlo
- Si ya hay análisis pero no hay web → proponer la web
- Si hay web pero no hay tráfico → proponer marketing/outreach`;

  try {
    const response = await callLLM(prompt, {
      systemPrompt,
      taskType: 'ceo_chat',
      temperature: 0.8,
      maxTokens: 400
    });

    return response.content || null;
  } catch (error) {
    console.error('[Co-Founder Daily] Error LLM:', error.message);
    return null;
  }
}

/**
 * Enviar email con el briefing
 */
async function sendBriefingEmail(userEmail, userName, companyName, briefing) {
  if (!resend) {
    console.log('[Co-Founder Daily] Resend no configurado, skip email');
    return;
  }

  const today = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  });

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: `☕ ${companyName} — Plan del día (${today})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1419; color: #e7e9ea; padding: 32px; border-radius: 12px;">
          <div style="border-bottom: 1px solid #2f3336; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="margin: 0; color: #1d9bf0; font-size: 18px;">🚀 Tu Co-Founder — Briefing del día</h2>
            <p style="margin: 4px 0 0; color: #71767b; font-size: 14px;">${companyName} · ${today}</p>
          </div>
          
          <div style="white-space: pre-line; line-height: 1.6; font-size: 15px;">
${briefing}
          </div>
          
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #2f3336; text-align: center;">
            <a href="https://lanzalo.pro" style="display: inline-block; background: #1d9bf0; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Abrir Lánzalo y responder
            </a>
          </div>
          
          <p style="margin-top: 24px; color: #71767b; font-size: 12px; text-align: center;">
            Lánzalo · Tu co-fundador IA · <a href="https://lanzalo.pro" style="color: #1d9bf0;">lanzalo.pro</a>
          </p>
        </div>
      `
    });

    console.log(`[Co-Founder Daily] Email enviado a ${userEmail}`);
  } catch (error) {
    console.error('[Co-Founder Daily] Error enviando email:', error.message);
  }
}

module.exports = {
  scheduleCofounderDaily,
  runDailyBriefingForAll,
  generateDailyBriefing
};
