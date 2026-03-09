/**
 * CEO Chat - API para chat conversacional con CEO Agent
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const CEOAgent = require('../../agents/ceo-agent');

// Todas las rutas requieren auth
router.use(requireAuth);

/**
 * Enviar mensaje al CEO Agent
 */
router.post('/companies/:companyId/chat', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    // Inicializar CEO Agent
    const ceo = new CEOAgent(companyId, req.user.id);
    await ceo.initialize();

    // Procesar mensaje
    const response = await ceo.processMessage(message);

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Error en CEO chat:', error);
    // Never leak internal error details to the frontend
    const userMessage = error.message?.includes('Cuota') 
      ? 'Has alcanzado el límite de uso este mes. Contacta soporte.'
      : 'Algo salió mal. Inténtalo de nuevo en unos segundos.';
    res.status(500).json({ error: userMessage });
  }
});

/**
 * Generar mensaje de bienvenida personalizado del Co-Founder
 * Se llama una sola vez cuando el usuario entra al chat por primera vez
 */
router.post('/companies/:companyId/chat/welcome', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { pool } = require('../db');

    // Si ya hay mensajes, no generar bienvenida
    const existing = await pool.query(
      'SELECT COUNT(*) as count FROM chat_messages WHERE company_id = $1',
      [companyId]
    );
    if (parseInt(existing.rows[0].count) > 0) {
      return res.json({ success: true, skipped: true });
    }

    // Leer intake data del usuario (aboutMe, lookingFor, survey answers)
    const userData = await pool.query(
      'SELECT survey_data, name, email FROM users WHERE id = $1',
      [req.user.id]
    );
    const surveyData = userData.rows[0]?.survey_data || {};
    const userName = userData.rows[0]?.name || '';

    // Leer datos de la empresa
    const companyData = await pool.query(
      'SELECT name, description, industry FROM companies WHERE id = $1',
      [companyId]
    );
    const company = companyData.rows[0];

    // Construir contexto para el welcome message
    let intakeContext = '';
    if (surveyData.aboutMe) intakeContext += `\nSOBRE EL FUNDADOR: ${surveyData.aboutMe}`;
    if (surveyData.lookingFor) intakeContext += `\nQUÉ BUSCA: ${surveyData.lookingFor}`;
    if (surveyData.surveyAnswers) {
      const answers = surveyData.surveyAnswers;
      if (answers.experience_level) intakeContext += `\nEXPERIENCIA: ${answers.experience_level}`;
      if (answers.primary_motivation) intakeContext += `\nMOTIVACIÓN: ${answers.primary_motivation}`;
      if (answers.timeline) intakeContext += `\nTIMELINE: ${answers.timeline}`;
      if (answers.biggest_challenge) intakeContext += `\nMAYOR RETO: ${answers.biggest_challenge}`;
    }

    // Generar welcome message con el LLM (rápido, sin tools)
    const { callLLM } = require('../llm');
    const { getSystemPrompt } = require('../../agents/system-prompts');

    const systemPrompt = getSystemPrompt('ceo', company?.name || 'tu empresa', intakeContext);

    const welcomePrompt = `INSTRUCCIÓN INTERNA (no repitas esto):
Genera tu PRIMER mensaje de bienvenida para este fundador. Acaba de registrarse.

Datos disponibles:
- Nombre: ${userName || 'No proporcionado'}
- Empresa: ${company?.name || 'Sin nombre aún'}
- Descripción: ${company?.description || 'Sin descripción'}
${intakeContext}

REGLAS para el mensaje:
- 2-4 frases máximo. Nada de párrafos.
- Demuestra que has LEÍDO lo que escribió (referencia algo concreto de aboutMe o lookingFor)
- Propón UNA acción concreta como siguiente paso (validar idea, definir audiencia, montar landing...)
- Tono: colega emprendedor, no asistente. Sin "¡Bienvenido!" ni "¡Qué emoción!"
- Si no hay datos de intake, saluda brevemente y pregunta qué tiene en mente.
- Termina con una pregunta directa que invite a responder.`;

    const response = await callLLM(welcomePrompt, {
      systemPrompt,
      taskType: 'ceo_chat',
      temperature: 0.8,
      maxTokens: 300
    });

    const welcomeMessage = response.content || '';

    if (welcomeMessage) {
      // Guardar como mensaje del asistente
      await pool.query(
        `INSERT INTO chat_messages (company_id, role, content, created_at)
         VALUES ($1, 'assistant', $2, NOW())`,
        [companyId, welcomeMessage]
      );
    }

    res.json({
      success: true,
      message: welcomeMessage
    });

  } catch (error) {
    console.error('Error generando welcome message:', error);
    // No-op — la bienvenida es un nice-to-have, no bloquear el usuario
    res.json({ success: true, skipped: true });
  }
});

/**
 * Obtener historial de chat
 */
router.get('/companies/:companyId/chat/history', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const { pool } = require('../db');

    const result = await pool.query(
      `SELECT * FROM chat_messages 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [companyId, limit]
    );

    res.json({
      messages: result.rows.reverse()
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Obtener backlog (tareas pendientes)
 */
router.get('/companies/:companyId/backlog', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;

    const { pool } = require('../db');

    // Active tasks (todo + in_progress)
    const active = await pool.query(
      `SELECT * FROM tasks 
       WHERE company_id = $1 AND status IN ('todo', 'in_progress')
       ORDER BY 
         CASE priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at`,
      [companyId]
    );

    // Completed + failed tasks (last 30)
    const done = await pool.query(
      `SELECT * FROM tasks 
       WHERE company_id = $1 AND status IN ('completed', 'failed')
       ORDER BY completed_at DESC
       LIMIT 30`,
      [companyId]
    );

    // Recent chat messages (last 15)
    const chat = await pool.query(
      `SELECT id, role, content, created_at
       FROM chat_messages WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 15`,
      [companyId]
    ).catch(() => ({ rows: [] }));

    res.json({
      backlog: active.rows,
      completed: done.rows,
      recentChat: chat.rows.reverse()
    });

  } catch (error) {
    console.error('Error obteniendo backlog:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Crear tarea manualmente
 */
router.post('/companies/:companyId/tasks', requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { title, description, tag, priority } = req.body;

    const { pool } = require('../db');
    const crypto = require('crypto');
    const taskId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO tasks (
        id, company_id, created_by, title, description, tag, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [taskId, companyId, req.user.id, title, description, tag, priority || 'medium', 'todo']
    );

    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );

    res.json({
      success: true,
      task: result.rows[0]
    });

  } catch (error) {
    console.error('Error creando tarea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
