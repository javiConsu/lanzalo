/**
 * Rutas User - Solo para clientes de la plataforma
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const { checkQuota, incrementUsage } = require('../middleware/quotas');
const { pool } = require('../db');
const orchestrator = require('../../agents/orchestrator');

// Todas las rutas requieren autenticación
router.use(requireAuth);

/**
 * Obtener perfil del usuario
 */
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, plan, subscription_tier, trial_ends_at, onboarding_completed, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Calcular estado del trial
    const now = new Date();
    const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
    const isTrialActive = user.plan === 'trial' && trialEndsAt && trialEndsAt > now;
    const trialDaysLeft = isTrialActive ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)) : 0;
    const isTrialExpired = user.plan === 'trial' && trialEndsAt && trialEndsAt <= now;
    const isPro = user.subscription_tier === 'pro' || user.plan === 'pro';

    // Obtener créditos
    let credits = { total: 0, monthly: 0, bonus: 0, used: 0 };
    try {
      const { getCredits } = require('../middleware/credits');
      credits = await getCredits(user.id);
    } catch (e) { /* tabla puede no existir aún */ }

    res.json({
      user: {
        ...user,
        onboardingCompleted: user.onboarding_completed || false,
        isTrialActive,
        trialDaysLeft,
        isTrialExpired,
        isPro,
        credits
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Listar empresas DEL USUARIO (solo las suyas)
 */
router.get('/companies', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.*,
        COUNT(DISTINCT t.id) as tasks_count,
        MAX(a.created_at) as last_activity
       FROM companies c
       LEFT JOIN tasks t ON c.id = t.company_id
       LEFT JOIN activity_log a ON c.id = a.company_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({ companies: result.rows });

  } catch (error) {
    console.error('Error listando empresas (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Crear nueva empresa
 */
router.post('/companies', checkQuota, async (req, res) => {
  try {
    const { name, description, industry, tagline } = req.body;

    if (!name || !description) {
      return res.status(400).json({ 
        error: 'name y description son requeridos' 
      });
    }

    // Generar subdomain
    const subdomain = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    // Verificar que el subdomain no exista
    const existing = await pool.query(
      'SELECT id FROM companies WHERE subdomain = $1',
      [subdomain]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Ese nombre ya está en uso. Elige otro.' 
      });
    }

    // Crear empresa
    const result = await pool.query(
      `INSERT INTO companies 
       (user_id, name, tagline, description, industry, subdomain, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'planning')
       RETURNING *`,
      [req.user.id, name, tagline, description, industry, subdomain]
    );

    const company = result.rows[0];

    // Incrementar uso (opcional, no bloquear si falla)
    try { await incrementUsage(company.id, 'companiesCreated', 1); } catch(e) {}

    res.json({ company });

  } catch (error) {
    console.error('Error creando empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ver detalles de UNA empresa (del usuario)
 */
router.get('/companies/:id', requireCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Tareas recientes
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE company_id = $1 ORDER BY created_at DESC LIMIT 20',
      [id]
    );

    // Actividad reciente
    const activityResult = await pool.query(
      'SELECT * FROM activity_log WHERE company_id = $1 ORDER BY created_at DESC LIMIT 30',
      [id]
    );

    res.json({
      company: companyResult.rows[0],
      recentTasks: tasksResult.rows,
      recentActivity: activityResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Actualizar empresa
 */
router.patch('/companies/:id', requireCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Solo permitir actualizar ciertos campos
    const allowedFields = ['name', 'tagline', 'description', 'industry'];
    const filteredUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    // Construir query
    const fields = Object.keys(filteredUpdates);
    const values = Object.values(filteredUpdates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await pool.query(
      `UPDATE companies SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    res.json({ company: result.rows[0] });

  } catch (error) {
    console.error('Error actualizando empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Pausar/reactivar empresa
 */
router.post('/companies/:id/toggle', requireCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE companies 
       SET status = CASE 
         WHEN status = 'paused' THEN 'live'
         ELSE 'paused'
       END,
       updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({ company: result.rows[0] });

  } catch (error) {
    console.error('Error toggling empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Eliminar empresa
 */
router.delete('/companies/:id', requireCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM companies WHERE id = $1', [id]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error eliminando empresa (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ejecutar tarea on-demand (respetando quotas)
 */
router.post('/companies/:id/tasks', requireCompanyAccess, checkQuota, async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_type, description } = req.body;

    if (!agent_type) {
      return res.status(400).json({ error: 'agent_type requerido' });
    }

    // Ejecutar tarea
    const result = await orchestrator.runOnDemandTask(
      id,
      agent_type,
      description
    );

    // Incrementar uso
    await incrementUsage(req.user.id, 'tasksPerDay', 1);

    res.json({ result });

  } catch (error) {
    console.error('Error ejecutando tarea (user):', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Ver quotas actuales
 */
router.get('/quotas', async (req, res) => {
  try {
    const { PLANS, getUsage } = require('../middleware/quotas');
    
    const plan = PLANS[req.user.plan] || PLANS.free;
    const quotas = {};

    for (const [key, limit] of Object.entries(plan.quotas)) {
      const usage = await getUsage(req.user.id, key);
      quotas[key] = {
        limit,
        usage,
        remaining: limit - usage
      };
    }

    res.json({
      plan: plan.name,
      quotas
    });

  } catch (error) {
    console.error('Error obteniendo quotas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Dashboard del usuario
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Total de empresas
    const companiesResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'live') as live
       FROM companies
       WHERE user_id = $1`,
      [req.user.id]
    );

    // Tareas del último mes
    const tasksResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM tasks t
       JOIN companies c ON t.company_id = c.id
       WHERE c.user_id = $1
       AND t.created_at > NOW() - INTERVAL '30 days'`,
      [req.user.id]
    );

    // Actividad reciente
    const activityResult = await pool.query(
      `SELECT a.*, c.name as company_name
       FROM activity_log a
       JOIN companies c ON a.company_id = c.id
       WHERE c.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({
      companies: {
        total: parseInt(companiesResult.rows[0].total),
        live: parseInt(companiesResult.rows[0].live)
      },
      tasks: {
        lastMonth: parseInt(tasksResult.rows[0].total)
      },
      recentActivity: activityResult.rows
    });

  } catch (error) {
    console.error('Error en dashboard (user):', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Marketing data — Contenido, Emails, Ads
 * Para la sección CMO del dashboard
 */
router.get('/companies/:companyId/marketing', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;

    // ─── Content (tweets/posts) ───────────────────────────
    const tweets = await pool.query(
      `SELECT id, content, media_url, status, type, published, published_at,
              scheduled_for, posted_at, tweet_id, twitter_id,
              engagement_likes, engagement_retweets, created_at
       FROM tweets WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [companyId]
    ).catch(() => ({ rows: [] }));

    const posts = tweets.rows;
    const contentMetrics = {
      total: posts.length,
      published: posts.filter(p => p.status === 'posted' || p.published).length,
      scheduled: posts.filter(p => p.status === 'scheduled').length,
      drafts: posts.filter(p => p.status === 'draft').length,
    };

    // ─── Emails (legacy + Email Pro) ─────────────────────
    const emailsResult = await pool.query(
      `SELECT id, campaign_name, to_email, subject, body, status, template,
              sent_at, replied_at, opened_at, clicks, created_at
       FROM emails WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [companyId]
    ).catch(() => ({ rows: [] }));

    const campaigns = emailsResult.rows;

    // Email Pro subscription status
    const emailProSub = await pool.query(
      `SELECT id, status, instantly_domain, instantly_account_email, instantly_warmup_status,
              emails_per_month, emails_sent_this_month, activated_at
       FROM email_pro_subscriptions
       WHERE company_id = $1 AND status NOT IN ('cancelled', 'failed')
       ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    ).catch(() => ({ rows: [] }));

    // Email Pro campaigns
    const proCampaigns = await pool.query(
      `SELECT id, name, status, leads_count, emails_sent, emails_opened, emails_replied, emails_bounced,
              target_audience, created_by, created_at
       FROM instantly_campaigns WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [companyId]
    ).catch(() => ({ rows: [] }));

    // Leads stats
    const leadsStats = await pool.query(
      `SELECT status, COUNT(*) as count FROM leads WHERE company_id = $1 GROUP BY status`,
      [companyId]
    ).catch(() => ({ rows: [] }));

    const leadsStatusCounts = {};
    leadsStats.rows.forEach(r => { leadsStatusCounts[r.status] = parseInt(r.count); });
    const totalLeads = Object.values(leadsStatusCounts).reduce((a, b) => a + b, 0);

    const emailMetrics = {
      total: campaigns.length + proCampaigns.rows.reduce((s, c) => s + (c.emails_sent || 0), 0),
      sent: campaigns.filter(e => e.status === 'sent' || e.status === 'replied').length + 
            proCampaigns.rows.reduce((s, c) => s + (c.emails_sent || 0), 0),
      replied: campaigns.filter(e => e.status === 'replied').length +
               proCampaigns.rows.reduce((s, c) => s + (c.emails_replied || 0), 0),
      bounced: campaigns.filter(e => e.status === 'bounced').length +
               proCampaigns.rows.reduce((s, c) => s + (c.emails_bounced || 0), 0),
    };

    // ─── Ads (marketing tasks tagged as ads or data-related) ──
    const adTasks = await pool.query(
      `SELECT id, COALESCE(tag, agent_type) as agent_tag, title, description, status, priority,
              started_at, completed_at, created_at
       FROM tasks WHERE company_id = $1
       AND (title ILIKE '%ads%' OR title ILIKE '%ad campaign%' OR title ILIKE '%publicidad%'
            OR title ILIKE '%anuncio%' OR title ILIKE '%google ads%' OR title ILIKE '%meta ads%'
            OR title ILIKE '%facebook ads%' OR title ILIKE '%campaign%ad%'
            OR description ILIKE '%ads%' OR description ILIKE '%publicidad%')
       ORDER BY created_at DESC LIMIT 30`,
      [companyId]
    ).catch(() => ({ rows: [] }));

    const adsMetrics = {
      total: adTasks.rows.length,
      active: adTasks.rows.filter(t => t.status === 'in_progress' || t.status === 'todo').length,
      completed: adTasks.rows.filter(t => t.status === 'completed').length,
    };

    // ─── Marketing tasks (all tasks from marketing/email/twitter agents) ──
    const mktTasks = await pool.query(
      `SELECT id, COALESCE(tag, agent_type) as agent_tag, title, description, status, priority,
              started_at, completed_at, created_at
       FROM tasks WHERE company_id = $1
       AND COALESCE(tag, agent_type) IN ('marketing', 'email', 'twitter')
       ORDER BY created_at DESC LIMIT 30`,
      [companyId]
    ).catch(() => ({ rows: [] }));

    res.json({
      content: { posts, metrics: contentMetrics },
      emails: { campaigns, metrics: emailMetrics },
      emailPro: {
        subscription: emailProSub.rows[0] || null,
        campaigns: proCampaigns.rows,
        leads: { total: totalLeads, statusCounts: leadsStatusCounts },
      },
      ads: { tasks: adTasks.rows, metrics: adsMetrics },
      marketingTasks: mktTasks.rows
    });

  } catch (error) {
    console.error('Error obteniendo datos de marketing:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Estado de gamificación de una empresa
 */
router.get('/companies/:companyId/gamestate', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { getGameState } = require('../../backend/services/gamification');
    const state = await getGameState(req.params.companyId);
    res.json(state || { xp: 0, level: { level: 1, name: 'Idea', icon: '💡', progress: 0 }, tasksCompleted: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Chat con Co-Founder Agent
 */
router.post('/companies/:companyId/chat', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Mensaje requerido' });

    const CEOAgent = require('../../agents/ceo-agent');
    const ceo = new CEOAgent(companyId, req.user.id);
    await ceo.initialize();
    const response = await ceo.processMessage(message);
    res.json({ success: true, ...response });
  } catch (error) {
    console.error('[Co-Founder] Error:', error);
    const userMsg = error.message?.includes('Cuota')
      ? 'Has alcanzado el límite de uso este mes.'
      : 'Algo salió mal. Inténtalo de nuevo.';
    res.status(500).json({ error: userMsg });
  }
});

/**
 * Welcome message — primer mensaje personalizado del Co-Founder
 */
router.post('/companies/:companyId/chat/welcome', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.params.companyId;

    // Si ya hay mensajes, no generar bienvenida
    const existing = await pool.query(
      'SELECT COUNT(*) as count FROM chat_messages WHERE company_id = $1',
      [companyId]
    );
    if (parseInt(existing.rows[0].count) > 0) {
      return res.json({ success: true, skipped: true });
    }

    // Leer intake data del usuario
    const userData = await pool.query(
      'SELECT survey_data, name FROM users WHERE id = $1',
      [req.user.id]
    );
    const surveyData = userData.rows[0]?.survey_data || {};
    const userName = userData.rows[0]?.name || '';

    // Leer datos de la empresa
    const companyRow = await pool.query(
      'SELECT name, description, industry FROM companies WHERE id = $1',
      [companyId]
    );
    const company = companyRow.rows[0];

    // Construir contexto
    let intakeContext = '';
    if (surveyData.aboutMe) intakeContext += `\nSOBRE EL FUNDADOR: ${surveyData.aboutMe}`;
    if (surveyData.lookingFor) intakeContext += `\nQUÉ BUSCA: ${surveyData.lookingFor}`;
    if (surveyData.surveyAnswers) {
      const a = surveyData.surveyAnswers;
      if (a.experience_level) intakeContext += `\nEXPERIENCIA: ${a.experience_level}`;
      if (a.primary_motivation) intakeContext += `\nMOTIVACIÓN: ${a.primary_motivation}`;
      if (a.timeline) intakeContext += `\nTIMELINE: ${a.timeline}`;
      if (a.biggest_challenge) intakeContext += `\nMAYOR RETO: ${a.biggest_challenge}`;
    }

    const { callLLM } = require('../llm');
    const { getSystemPrompt } = require('../../agents/system-prompts');
    const systemPrompt = getSystemPrompt('ceo', company?.name || 'tu empresa', intakeContext);

    const welcomePrompt = `INSTRUCCIÓN INTERNA (no repitas esto):
Genera tu PRIMER mensaje para este fundador. Acaba de registrar su idea.

Datos disponibles:
- Nombre: ${userName || 'No proporcionado'}
- Empresa: ${company?.name || 'Sin nombre aún'}
- Descripción: ${company?.description || 'Sin descripción'}
- Audiencia: ${company?.industry || 'No especificada'}
${intakeContext}

CONTEXTO IMPORTANTE:
Ya has lanzado automáticamente un análisis de mercado y plan de negocio para esta idea.
El fundador va a recibir el resultado en unos minutos en su dashboard.
TU MENSAJE tiene que anunciar que YA ESTÁS TRABAJANDO en eso.

REGLAS para el mensaje:
- 3-5 frases. Nada de párrafos.
- Menciona la idea por nombre y haz un comentario gracioso/ingenioso sobre el tema
- Di que ya estás analizando mercado, competencia y viabilidad
- Algo tipo: "dame unos minutos y te doy mi veredicto sincero" o "no está la economía como para tirar la pasta sin datos"
- Tono: humor español, un poco borde, como un colega que te habla claro
- NO propongas nada todavía. NO digas "validar idea" ni "definir audiencia". Solo anuncia que ESTÁS TRABAJANDO.
- NO uses "¡Bienvenido!", "¡Qué emoción!", "¡Genial!", "Interesante"
- Puedes bromear con el sector/tema de la idea de forma simpatiquilla
- Si no hay datos de intake, saluda con el nombre y comenta la idea directamente.`;

    const response = await callLLM(welcomePrompt, {
      systemPrompt,
      taskType: 'ceo_chat',
      temperature: 0.8,
      maxTokens: 300
    });

    const welcomeMessage = response.content || '';
    if (welcomeMessage) {
      await pool.query(
        `INSERT INTO chat_messages (company_id, role, content, created_at)
         VALUES ($1, 'assistant', $2, NOW())`,
        [companyId, welcomeMessage]
      );
    }

    res.json({ success: true, message: welcomeMessage });
  } catch (error) {
    console.error('Error en welcome message:', error);
    res.json({ success: true, skipped: true });
  }
});

/**
 * Historial de chat
 */
router.get('/companies/:companyId/chat/history', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const limit = parseInt(req.query.limit) || 50;
    const result = await pool.query(
      `SELECT id, role, content, created_at FROM chat_messages
       WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [companyId, limit]
    );
    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Documentos / reportes completados de una empresa
 * Devuelve tareas completadas tipo research, marketing, code que generaron output
 */
router.get('/companies/:companyId/documents', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const result = await pool.query(
      `SELECT id, title, tag, output, created_at, completed_at
       FROM tasks
       WHERE company_id = $1
         AND status = 'completed'
         AND output IS NOT NULL
         AND output != ''
       ORDER BY completed_at DESC NULLS LAST, created_at DESC
       LIMIT 10`,
      [companyId]
    );
    res.json({ documents: result.rows });
  } catch (error) {
    res.json({ documents: [] });
  }
});

/**
 * Estado de agentes para la oficina pixel-art
 * Mapea tareas activas a estados visuales de cada agente
 */
router.get('/companies/:companyId/agents/status', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Get all active tasks for this company
    const result = await pool.query(
      `SELECT COALESCE(tag, agent_type) as agent_tag, status, title, started_at, created_at
       FROM tasks 
       WHERE company_id = $1 AND status IN ('todo', 'in_progress')
       ORDER BY created_at DESC`,
      [companyId]
    );
    
    // Get recent completed tasks (last hour) for "syncing" state
    const recentDone = await pool.query(
      `SELECT COALESCE(tag, agent_type) as agent_tag, title, completed_at
       FROM tasks 
       WHERE company_id = $1 AND status = 'completed' AND completed_at > NOW() - INTERVAL '1 hour'
       ORDER BY completed_at DESC`,
      [companyId]
    );
    
    // Get recent failed tasks for "error" state
    const recentFailed = await pool.query(
      `SELECT COALESCE(tag, agent_type) as agent_tag, title, completed_at
       FROM tasks 
       WHERE company_id = $1 AND status = 'failed' AND completed_at > NOW() - INTERVAL '30 minutes'
       ORDER BY completed_at DESC`,
      [companyId]
    );
    
    const activeTasks = result.rows;
    const completedRecent = recentDone.rows;
    const failedRecent = recentFailed.rows;
    
    // Define all agent types with display info
    const AGENTS = {
      ceo: { name: 'Co-Founder', emoji: '🧠', color: '#10b981' },
      code: { name: 'Code', emoji: '💻', color: '#3b82f6' },
      marketing: { name: 'Marketing', emoji: '📣', color: '#ec4899' },
      email: { name: 'Email', emoji: '📧', color: '#f59e0b' },
      research: { name: 'Research', emoji: '🔍', color: '#8b5cf6' },
      data: { name: 'Data', emoji: '📊', color: '#06b6d4' },
      twitter: { name: 'Twitter', emoji: '🐦', color: '#6366f1' }
    };
    
    // Map each agent to a state
    const agents = {};
    for (const [type, info] of Object.entries(AGENTS)) {
      const inProgress = activeTasks.find(t => t.agent_tag === type && t.status === 'in_progress');
      const queued = activeTasks.find(t => t.agent_tag === type && t.status === 'todo');
      const failed = failedRecent.find(t => t.agent_tag === type);
      const completed = completedRecent.find(t => t.agent_tag === type);
      
      let state = 'idle';
      let detail = 'Descansando...';
      
      if (failed) {
        state = 'error';
        detail = `Error: ${failed.title}`;
      } else if (inProgress) {
        // Determine if writing, researching, or executing based on agent type
        if (type === 'research' || type === 'data') {
          state = 'researching';
        } else if (type === 'code') {
          state = 'writing';
        } else {
          state = 'executing';
        }
        detail = inProgress.title;
      } else if (completed) {
        state = 'syncing';
        detail = `Completado: ${completed.title}`;
      } else if (queued) {
        state = 'idle';
        detail = `Pendiente: ${queued.title}`;
      }
      
      agents[type] = {
        ...info,
        type,
        state,
        detail,
        tasksInProgress: activeTasks.filter(t => t.agent_tag === type && t.status === 'in_progress').length,
        tasksQueued: activeTasks.filter(t => t.agent_tag === type && t.status === 'todo').length
      };
    }
    
    // CEO is special - always "executing" when there are any active tasks
    if (activeTasks.length > 0 && agents.ceo.state === 'idle') {
      agents.ceo.state = 'executing';
      agents.ceo.detail = `Coordinando ${activeTasks.length} tareas`;
    }
    
    // Get ALL tasks for backlog (last 50 completed + pending + in_progress)
    const allTasks = await pool.query(
      `(SELECT id, COALESCE(tag, agent_type) as agent_tag, title, description, status, priority,
              started_at, completed_at, created_at
       FROM tasks WHERE company_id = $1 AND status IN ('todo', 'in_progress')
       ORDER BY created_at DESC)
       UNION ALL
       (SELECT id, COALESCE(tag, agent_type) as agent_tag, title, description, status, priority,
              started_at, completed_at, created_at
       FROM tasks WHERE company_id = $1 AND status IN ('completed', 'failed')
       ORDER BY completed_at DESC LIMIT 30)`,
      [companyId]
    );

    // Get recent chat messages (last 10)
    const recentChat = await pool.query(
      `SELECT id, role, content, created_at
       FROM chat_messages WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [companyId]
    ).catch(() => ({ rows: [] }));

    res.json({
      agents,
      totalActive: activeTasks.length,
      totalQueued: activeTasks.filter(t => t.status === 'todo').length,
      totalInProgress: activeTasks.filter(t => t.status === 'in_progress').length,
      backlog: allTasks.rows,
      recentChat: recentChat.rows.reverse()
    });
    
  } catch (error) {
    console.error('Error obteniendo estado de agentes:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
