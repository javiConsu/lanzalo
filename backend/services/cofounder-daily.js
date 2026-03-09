/**
 * Co-Founder Daily Briefing — Lánzalo
 * 
 * 2 emails al día:
 *  - 08:00 CET (07:00 UTC) → Briefing matutino: plan del día
 *  - 20:00 CET (19:00 UTC) → Resumen vespertino: qué se hizo hoy
 * 
 * Formato tipo "CEO Briefing" de Polsia:
 *  - Resumen ejecutivo
 *  - Tareas completadas / fallidas / en cola
 *  - Métricas del sistema
 *  - Plan de acción
 * 
 * POLÍTICA: Este es el ÚNICO email que recibe el usuario sobre tareas.
 * NO hay emails individuales por tarea creada/completada/fallida.
 */

const cron = require('node-cron');
const { pool } = require('../db');
const { callLLM } = require('../llm');
const { getSystemPrompt } = require('../../agents/system-prompts');
const { Resend } = require('resend');
const { TAG_NAMES } = require('./task-notifications');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = 'Lanzalo <noreply@lanzalo.pro>';

// ═══════════════════════════════════════
// SCHEDULING
// ═══════════════════════════════════════

function scheduleCofounderDaily() {
  // Briefing matutino: L-V, 07:00 UTC (08:00 CET)
  cron.schedule('0 7 * * 1-5', async () => {
    console.log('[Daily Briefing] ☀️ Arrancando briefing matutino...');
    await runBriefingForAll('morning');
  });

  // Resumen vespertino: L-V, 19:00 UTC (20:00 CET)
  cron.schedule('0 19 * * 1-5', async () => {
    console.log('[Daily Briefing] 🌙 Arrancando resumen vespertino...');
    await runBriefingForAll('evening');
  });

  console.log('[Daily Briefing] Programado: L-V 08:00 CET (matutino) + 20:00 CET (vespertino)');
}

// ═══════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════

async function runBriefingForAll(type = 'morning') {
  try {
    const result = await pool.query(`
      SELECT c.id as company_id, c.name, c.description, c.industry, c.status,
             c.revenue_total, c.subdomain,
             u.id as user_id, u.email, u.name as user_name
      FROM companies c
      JOIN users u ON c.user_id = u.id
      WHERE c.status IN ('active', 'planning')
        AND u.email NOT LIKE '%@test.com'
        AND u.email NOT LIKE 'e2e_%'
        AND u.email NOT LIKE 'test_%'
        AND u.email NOT LIKE 'debug_%'
        AND u.email NOT LIKE 'welcome-test%'
        AND u.email NOT LIKE 'dashboard-test%'
    `);

    const projects = result.rows;
    console.log(`[Daily Briefing] ${projects.length} proyectos activos`);

    for (const project of projects) {
      try {
        await generateAndSendBriefing(project, type);
      } catch (error) {
        console.error(`[Daily Briefing] Error en ${project.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[Daily Briefing] Error general:', error.message);
  }
}

// For backwards compat
const runDailyBriefingForAll = () => runBriefingForAll('morning');

// ═══════════════════════════════════════
// GATHER DATA
// ═══════════════════════════════════════

async function gatherBriefingData(companyId) {
  const data = {};

  // Tasks completed in last 24h
  const completed = await pool.query(
    `SELECT id, title, tag, output, completed_at FROM tasks 
     WHERE company_id = $1 AND status = 'completed'
       AND completed_at >= NOW() - INTERVAL '24 hours'
     ORDER BY completed_at DESC LIMIT 15`,
    [companyId]
  );
  data.completed = completed.rows;

  // Tasks failed in last 24h
  const failed = await pool.query(
    `SELECT id, title, tag, error_message, COALESCE(failed_at, completed_at, created_at) as failed_at FROM tasks 
     WHERE company_id = $1 AND status = 'failed'
       AND COALESCE(failed_at, completed_at, created_at) >= NOW() - INTERVAL '24 hours'
     LIMIT 10`,
    [companyId]
  );
  data.failed = failed.rows;

  // Tasks currently in progress
  const inProgress = await pool.query(
    `SELECT id, title, tag, started_at FROM tasks 
     WHERE company_id = $1 AND status = 'in_progress'
     ORDER BY started_at DESC LIMIT 10`,
    [companyId]
  );
  data.inProgress = inProgress.rows;

  // Tasks in backlog (todo)
  const backlog = await pool.query(
    `SELECT id, title, tag, priority, created_at FROM tasks 
     WHERE company_id = $1 AND status = 'todo'
     ORDER BY 
       CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       created_at
     LIMIT 15`,
    [companyId]
  );
  data.backlog = backlog.rows;

  // Total stats
  const stats = await pool.query(
    `SELECT 
       COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
       COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
       COUNT(*) FILTER (WHERE status = 'todo') as total_todo,
       COUNT(*) FILTER (WHERE status = 'in_progress') as total_in_progress,
       COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '24 hours') as completed_today,
       COUNT(*) FILTER (WHERE status = 'failed' AND COALESCE(failed_at, completed_at, created_at) >= NOW() - INTERVAL '24 hours') as failed_today,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as created_today
     FROM tasks WHERE company_id = $1`,
    [companyId]
  );
  data.stats = stats.rows[0] || {};

  // Content pieces generated recently
  try {
    const content = await pool.query(
      `SELECT type, platform, status, COUNT(*) as cnt 
       FROM content_pieces 
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY type, platform, status`,
      [companyId]
    );
    data.contentPieces = content.rows;
  } catch (e) { data.contentPieces = []; }

  // Recent chat messages
  const chat = await pool.query(
    `SELECT role, content FROM chat_messages 
     WHERE company_id = $1 
     ORDER BY created_at DESC LIMIT 3`,
    [companyId]
  );
  data.recentChat = chat.rows.reverse();

  // Memory
  try {
    const memory = await pool.query(
      'SELECT layer, content FROM memory WHERE company_id = $1 AND layer IN (1, 2)',
      [companyId]
    );
    data.memory = memory.rows;
  } catch (e) { data.memory = []; }

  return data;
}

// ═══════════════════════════════════════
// GENERATE & SEND
// ═══════════════════════════════════════

async function generateAndSendBriefing(project, type) {
  const { company_id, name, description, industry, email, user_name } = project;
  const data = await gatherBriefingData(company_id);

  // Generate AI narrative
  const narrative = await generateNarrative(project, data, type);

  // Save as Co-Founder chat message (only morning briefing)
  if (type === 'morning' && narrative) {
    await pool.query(
      `INSERT INTO chat_messages (company_id, role, content, created_at)
       VALUES ($1, 'assistant', $2, NOW())`,
      [company_id, narrative]
    );
  }

  // Send structured email
  await sendBriefingEmail(project, data, narrative, type);

  console.log(`[Daily Briefing] ${type} enviado para ${name} → ${email}`);
}

// ═══════════════════════════════════════
// AI NARRATIVE
// ═══════════════════════════════════════

async function generateNarrative(project, data, type) {
  const { name, description, industry } = project;
  const systemPrompt = getSystemPrompt('ceo', name, '');

  const isMorning = type === 'morning';
  
  let contextStr = `EMPRESA: ${name}\nINDUSTRIA: ${industry || 'No definida'}\nDESCRIPCIÓN: ${description || 'Sin descripción'}`;
  
  if (data.completed.length > 0) {
    contextStr += '\n\nTAREAS COMPLETADAS (últimas 24h):';
    for (const t of data.completed) {
      contextStr += `\n- ✅ [${TAG_NAMES[t.tag] || t.tag}] ${t.title}`;
    }
  }

  if (data.failed.length > 0) {
    contextStr += '\n\nTAREAS FALLIDAS:';
    for (const t of data.failed) {
      contextStr += `\n- ❌ [${TAG_NAMES[t.tag] || t.tag}] ${t.title}: ${(t.error_message || 'Error desconocido').substring(0, 80)}`;
    }
  }

  if (data.inProgress.length > 0) {
    contextStr += '\n\nEN PROGRESO AHORA:';
    for (const t of data.inProgress) {
      contextStr += `\n- ⚡ [${TAG_NAMES[t.tag] || t.tag}] ${t.title}`;
    }
  }

  if (data.backlog.length > 0) {
    contextStr += '\n\nBACKLOG PENDIENTE:';
    for (const t of data.backlog.slice(0, 5)) {
      contextStr += `\n- [${t.priority}/${t.tag}] ${t.title}`;
    }
  }

  contextStr += `\n\nESTADÍSTICAS HOY: ${data.stats.completed_today || 0} completadas, ${data.stats.failed_today || 0} fallidas, ${data.stats.created_today || 0} creadas`;
  contextStr += `\nTOTAL BACKLOG: ${data.stats.total_todo || 0} pendientes, ${data.stats.total_in_progress || 0} en progreso`;

  const prompt = isMorning 
    ? `INSTRUCCIÓN INTERNA (no repitas esto):
Es por la mañana. Genera un briefing matutino CORTO para tu socio.

CONTEXTO:
${contextStr}

ESTRUCTURA:
1. Saludo rápido (1 frase, humor habitual)
2. Resumen de ayer (2-3 frases: qué se hizo, qué falló, qué quedó pendiente)
3. Plan de hoy: 2-4 acciones concretas numeradas
4. Cierre con pregunta de baja fricción ("¿Te parece o cambio algo?")

REGLAS:
- Español, tono Co-Founder directo, con humor
- CORTO: máximo 10-12 líneas
- Si algo falló, propon solución, no excusas
- TÚ propones, no preguntas qué hacer`
    : `INSTRUCCIÓN INTERNA (no repitas esto):
Son las 8 de la tarde. Genera un resumen del día CORTO.

CONTEXTO:
${contextStr}

ESTRUCTURA:
1. Comentario sobre el día (1 frase)
2. Resumen: qué se completó hoy, qué falló, qué queda
3. Plan para mañana (1-2 líneas)
4. Cierre motivacional o con humor

REGLAS:
- Español, tono Co-Founder directo
- CORTO: máximo 8-10 líneas
- Si fue un día productivo, celébralo
- Si no, sé honesto pero propositivo`;

  try {
    const response = await callLLM(prompt, {
      systemPrompt,
      taskType: 'ceo_chat',
      temperature: 0.8,
      maxTokens: 400
    });
    return response.content || null;
  } catch (error) {
    console.error('[Daily Briefing] Error LLM:', error.message);
    return null;
  }
}

// ═══════════════════════════════════════
// EMAIL TEMPLATE
// ═══════════════════════════════════════

function buildTaskRow(task, statusIcon, statusColor) {
  const agentName = TAG_NAMES[task.tag] || task.tag || 'Equipo';
  const priorityColors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };
  const prioColor = priorityColors[task.priority] || '#6b7280';
  const prioLabel = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : '';
  
  return `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #1f2937; color: #e5e7eb; font-size: 13px;">
        ${statusIcon} ${task.title.substring(0, 60)}${task.title.length > 60 ? '...' : ''}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #1f2937; color: #9ca3af; font-size: 12px; white-space: nowrap;">
        ${agentName}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #1f2937; font-size: 11px; white-space: nowrap;">
        <span style="color: ${statusColor}; font-weight: 600;">${statusIcon === '✅' ? 'Hecho' : statusIcon === '❌' ? 'Error' : statusIcon === '⚡' ? 'En curso' : prioLabel}</span>
      </td>
    </tr>`;
}

async function sendBriefingEmail(project, data, narrative, type) {
  if (!resend) {
    console.log('[Daily Briefing] Resend no configurado, skip email');
    return;
  }

  const { email, user_name, name: companyName } = project;
  const userName = user_name ? user_name.split(' ')[0] : 'crack';
  const isMorning = type === 'morning';

  const today = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  });

  const stats = data.stats;
  const completedToday = parseInt(stats.completed_today) || 0;
  const failedToday = parseInt(stats.failed_today) || 0;
  const createdToday = parseInt(stats.created_today) || 0;
  const totalTodo = parseInt(stats.total_todo) || 0;
  const totalInProgress = parseInt(stats.total_in_progress) || 0;

  // Build task rows
  let completedRows = '';
  for (const t of data.completed.slice(0, 5)) {
    completedRows += buildTaskRow(t, '✅', '#34d399');
  }

  let failedRows = '';
  for (const t of data.failed.slice(0, 3)) {
    failedRows += buildTaskRow(t, '❌', '#f87171');
  }

  let inProgressRows = '';
  for (const t of data.inProgress.slice(0, 3)) {
    inProgressRows += buildTaskRow(t, '⚡', '#fbbf24');
  }

  let backlogRows = '';
  for (const t of data.backlog.slice(0, 5)) {
    const prioIcon = t.priority === 'critical' ? '🔴' : t.priority === 'high' ? '🟡' : '🟢';
    backlogRows += buildTaskRow(t, prioIcon, '#9ca3af');
  }

  // Content generated
  let contentSection = '';
  if (data.contentPieces.length > 0) {
    const contentSummary = data.contentPieces.map(c => 
      `${c.cnt}x ${c.type}${c.platform ? ` (${c.platform})` : ''} — ${c.status}`
    ).join(', ');
    contentSection = `
      <div style="margin-top: 16px; padding: 12px; background: #1a1a2e; border-radius: 8px; border-left: 3px solid #8b5cf6;">
        <p style="margin: 0; color: #a78bfa; font-size: 12px; font-weight: 600;">📣 Contenido generado</p>
        <p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">${contentSummary}</p>
      </div>`;
  }

  const subject = isMorning
    ? `☀️ ${companyName} — Briefing del día (${today})`
    : `🌙 ${companyName} — Resumen del día (${today})`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #0f1419; color: #e7e9ea;">
      
      <!-- Header -->
      <div style="padding: 24px 24px 16px; border-bottom: 1px solid #2f3336;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <h1 style="margin: 0; color: #10b981; font-size: 20px; font-weight: 700;">
              ${isMorning ? '☀️' : '🌙'} ${isMorning ? 'Briefing' : 'Resumen'} — ${companyName}
            </h1>
            <p style="margin: 4px 0 0; color: #71767b; font-size: 13px;">${today}</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 11px; color: #6b7280; background: #1f2937; padding: 4px 10px; border-radius: 12px;">
              ${isMorning ? 'Matutino' : 'Vespertino'}
            </span>
          </td>
        </tr></table>
      </div>

      <!-- Stats Bar -->
      <div style="padding: 16px 24px; background: #111827;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 24px; font-weight: 700; color: #34d399;">${completedToday}</div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Completadas</div>
            </td>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 24px; font-weight: 700; color: ${failedToday > 0 ? '#f87171' : '#6b7280'};">${failedToday}</div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Errores</div>
            </td>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 24px; font-weight: 700; color: #fbbf24;">${totalInProgress}</div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">En curso</div>
            </td>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 24px; font-weight: 700; color: #60a5fa;">${totalTodo}</div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">En cola</div>
            </td>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 24px; font-weight: 700; color: #a78bfa;">${createdToday}</div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Nuevas</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Narrative from Co-Founder -->
      ${narrative ? `
      <div style="padding: 20px 24px; border-bottom: 1px solid #2f3336;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-size: 11px; font-weight: 600; color: #10b981; background: #10b98120; padding: 3px 8px; border-radius: 6px;">🧠 Co-Founder</span>
        </div>
        <div style="color: #d1d5db; font-size: 14px; line-height: 1.7; white-space: pre-line;">${narrative}</div>
      </div>
      ` : ''}

      <!-- Completed Tasks -->
      ${data.completed.length > 0 ? `
      <div style="padding: 16px 24px;">
        <h3 style="margin: 0 0 10px; color: #34d399; font-size: 14px; font-weight: 600;">✅ Completadas hoy (${data.completed.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${completedRows}
        </table>
      </div>
      ` : ''}

      <!-- Failed Tasks -->
      ${data.failed.length > 0 ? `
      <div style="padding: 16px 24px;">
        <h3 style="margin: 0 0 10px; color: #f87171; font-size: 14px; font-weight: 600;">❌ Errores hoy (${data.failed.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${failedRows}
        </table>
        <p style="color: #71767b; font-size: 11px; margin: 8px 0 0;">No se ha cobrado ningún crédito por tareas fallidas.</p>
      </div>
      ` : ''}

      <!-- In Progress -->
      ${data.inProgress.length > 0 ? `
      <div style="padding: 16px 24px;">
        <h3 style="margin: 0 0 10px; color: #fbbf24; font-size: 14px; font-weight: 600;">⚡ En progreso (${data.inProgress.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${inProgressRows}
        </table>
      </div>
      ` : ''}

      <!-- Backlog -->
      ${data.backlog.length > 0 ? `
      <div style="padding: 16px 24px;">
        <h3 style="margin: 0 0 10px; color: #60a5fa; font-size: 14px; font-weight: 600;">📋 Cola de tareas (${data.backlog.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${backlogRows}
        </table>
      </div>
      ` : ''}

      <!-- Content Section -->
      ${contentSection ? `<div style="padding: 0 24px 16px;">${contentSection}</div>` : ''}

      <!-- CTA -->
      <div style="padding: 20px 24px; text-align: center; border-top: 1px solid #2f3336;">
        <a href="https://www.lanzalo.pro" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Abrir Lánzalo →
        </a>
        <p style="margin: 12px 0 0; color: #71767b; font-size: 12px;">
          Habla con tu Co-Founder para crear nuevas tareas o ajustar prioridades.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 16px 24px; border-top: 1px solid #2f3336; text-align: center;">
        <p style="margin: 0; color: #4b5563; font-size: 11px;">
          Lánzalo · Tu co-fundador IA · <a href="https://www.lanzalo.pro" style="color: #6b7280;">lanzalo.pro</a>
        </p>
        <p style="margin: 4px 0 0; color: #374151; font-size: 10px;">
          Recibes este email 2 veces al día (08:00 y 20:00 CET). Toda la actividad de tus agentes aquí.
        </p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject,
      html,
    });
    console.log(`[Daily Briefing] Email enviado a ${email}`);
  } catch (error) {
    console.error('[Daily Briefing] Error enviando email:', error.message);
  }
}

// Keep old function name for backwards compat
const generateDailyBriefing = (project) => generateAndSendBriefing(project, 'morning');

module.exports = {
  scheduleCofounderDaily,
  runDailyBriefingForAll,
  runBriefingForAll,
  generateDailyBriefing,
  generateAndSendBriefing,
  gatherBriefingData
};
