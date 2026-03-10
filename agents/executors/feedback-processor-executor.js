const { pool } = require('../../backend/db');

/**
 * feedback-processor-executor.js
 *
 * Agente que analiza feedback de usuarios y propone mejoras diarias.
 *
 * Flujo diario:
 * 1. Recolecta datos (50k tokens estimados)
 *    - chat_messages (últimos 24h)
 *    - tasks (creadas ayer)
 *    - task_proposals (pendientes)
 *    - memory layer 3 (patrones cross-company)
 *    - activity_log (eventos recientes)
 *
 * 2. Analiza con LLM (300k tokens, incluyendo reflections)
 *
 * 3. Proponer 2-3 tareas (alta/med/baja prioridad)
 *
 * 4. Guardar en task_proposals
 *
 * 5. Crear reporte en feedback_daily_reports
 */

const feedbackSources = {
  messages: 'chat_messages',
  tasks: 'tasks',
  proposals: 'task_proposals',
  memory: 'memory_layer_3',
  activity: 'activity_log'
};

/**
 * Analiza feedback de un company y genera propuestas de mejora
 */
const analyzeFeedback = async (companyId) => {
  const db = pool;

  // 1. Recolectar datos de todas las fuentes
  const data = {
    messages: [],
    tasks: [],
    proposals: [],
    top_themes: [],
    notes: []
  };

  // 2. Chat messages (últimos 24h)
  try {
    const messagesResult = await db.query(
      `SELECT
        role,
        content,
        created_at
      FROM chat_messages
      WHERE company_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 100`,
      [companyId]
    );

    data.messages = messagesResult.rows.map(msg => ({
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at
    }));

    data.notes.push(`Recolectados ${data.messages.length} mensajes de feedback`);
  } catch (error) {
    console.error('Error recolectando chat_messages:', error);
    data.notes.push('Error al recolectar mensajes de feedback');
  }

  // 3. Tasks creadas ayer
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tasksResult = await db.query(
      `SELECT
        id,
        title,
        status,
        priority,
        tag,
        created_at
      FROM tasks
      WHERE company_id = $1
        AND created_at >= $2
        AND created_at < $3
      ORDER BY created_at DESC`,
      [companyId, yesterday.toISOString().split('T')[0], yesterday.toISOString().split('T')[0]]
    );

    data.tasks = tasksResult.rows.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      tag: task.tag,
      created_at: task.created_at
    }));

    data.notes.push(`Recolectadas ${data.tasks.length} tareas creadas ayer`);
  } catch (error) {
    console.error('Error recolectando tasks:', error);
    data.notes.push('Error al recolectar tareas');
  }

  // 4. Task proposals pendientes
  try {
    const proposalsResult = await db.query(
      `SELECT
        id,
        title,
        status,
        priority,
        created_at
      FROM task_proposals
      WHERE company_id = $1
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 20`,
      [companyId]
    );

    data.proposals = proposalsResult.rows.map(proposal => ({
      id: proposal.id,
      title: proposal.title,
      status: proposal.status,
      priority: proposal.priority,
      created_at: proposal.created_at
    }));

    data.notes.push(`Recolectadas ${data.proposals.length} propuestas pendientes`);
  } catch (error) {
    console.error('Error recolectando task_proposals:', error);
    data.notes.push('Error al recolectar propuestas');
  }

  // 5. Top themes (simulado con basic grouping para MVP)
  const themeCounts = {};
  data.messages.forEach(msg => {
    const content = msg.content.toLowerCase();
    let theme = 'other';

    if (content.includes('bug') || content.includes('error') || content.includes('no funciona') || content.includes('fallo')) {
      theme = 'bugging';
    } else if (content.includes('lento') || content.includes('performance') || content.includes('slow')) {
      theme = 'performance';
    } else if (content.includes('diseño') || content.includes('básico') || content.includes('no me gusta')) {
      theme = 'design';
    } else if (content.includes('mejora') || content.includes('propongo')) {
      theme = 'improvement';
    } else if (content.includes('precio') || content.includes('cobro') || content.includes('suscripción')) {
      theme = 'pricing';
    }

    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
  });

  // Convert to sorted array
  data.top_themes = Object.entries(themeCounts)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 themes

  data.notes.push(`Top themes: ${data.top_themes.map(t => `${t.theme} (${t.count})`).join(', ')}`);

  return data;
};

/**
 * Integra el feedback processor en el task executor
 */
const feedbackProcessor = {
  tag: 'user-voice',
  name: 'Feedback Processor',

  execute: async (task) => {
    const companyId = task.company_id;
    const today = new Date().toISOString().split('T')[0];

    console.log(`🧠 Iniciando análisis de feedback para company ${companyId} (${today})`);

    // 1. Analizar feedback
    const analysis = await analyzeFeedback(companyId);

    console.log(`📊 Stats recolectados:`, {
      messages: analysis.messages.length,
      tasks: analysis.tasks.length,
      proposals: analysis.proposals.length,
      top_themes: analysis.top_themes.length
    });

    // 2. Generar propuestas (aquí iría el LLM, para MVP simulamos)
    const proposals = [];
    const bugsFound = analysis.tasks.filter(t => t.priority === 'critical' || t.priority === 'high').length;
    const messagesWithBugs = analysis.messages.filter(m => {
      const content = m.content.toLowerCase();
      return content.includes('bug') || content.includes('error') || content.includes('no funciona');
    }).length;

    if (bugsFound > 0 || messagesWithBugs > 0) {
      proposals.push({
        priority: 'high',
        title: 'Fix: Proyectos críticos no funcionan',
        description: `Analizar y corregir ${bugsFound} tareas críticas y ${messagesWithBugs} reportes de bugs de usuarios.`,
        estimated_hours: bugsFound * 2 + messagesWithBugs
      });
    }

    if (analysis.messages.length >= 2 && analysis.top_themes.length > 1) {
      proposals.push({
        priority: 'medium',
        title: 'Mejoras sugeridas por usuarios',
        description: `Dadas ${analysis.messages.length} mensajes de feedback, implementar mejoras en ${analysis.top_themes.map(t => t.theme).join(', ')}.`,
        estimated_hours: 6
      });
    }

    if (analysis.proposals.length > 0) {
      proposals.push({
        priority: 'medium',
        title: 'Revisar propuestas pendientes',
        description: `Revisar ${analysis.proposals.length} propuestas pendientes de implementar.`,
        estimated_hours: 2 + analysis.proposals.length
      });
    }

    if (proposals.length === 0) {
      proposals.push({
        priority: 'low',
        title: 'Optimizar agentes y workflows',
        description: 'Revisar agentes y workflows para mejorar rendimiento general.',
        estimated_hours: 8
      });
    }

    // 3. Guardar propuestas en task_proposals
    const savedProposals = [];
    for (const proposal of proposals.slice(0, 3)) { // Guardar top 3
      try {
        const proposalResult = await db.query(
          `INSERT INTO task_proposals
            (company_id, proposed_by, title, description, tag, priority, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING *`,
          [
            companyId,
            'feedback-processor',
            proposal.title,
            proposal.description,
            'user-voice',
            proposal.priority
          ]
        );

        savedProposals.push(proposalResult.rows[0]);
        console.log(`✅ Propuesta guardada: ${proposal.title}`);
      } catch (error) {
        console.error('Error guardando propuesta:', error);
      }
    }

    // 4. Crear reporte en feedback_daily_reports
    try {
      await db.query(
        `INSERT INTO feedback_daily_reports
          (company_id, date, feedback_count, bug_count, improvement_count, top_themes, suggested_tasks, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          companyId,
          today,
          analysis.messages.length,
          bugsFound,
          savedProposals.length,
          JSON.stringify(analysis.top_themes),
          JSON.stringify(savedProposals),
          analysis.notes.join('; ')
        ]
      );

      console.log(`✅ Reporte guardado para ${today}`);
    } catch (error) {
      console.error('Error guardando reporte:', error);
    }

    // 5. Return output
    return {
      status: 'completed',
      output: {
        date: today,
        feedback_count: analysis.messages.length,
        bug_count: bugsFound,
        improvement_count: savedProposals.length,
        top_themes: analysis.top_themes,
        suggested_tasks: savedProposals
      },
      insights: [
        `Recolectados ${analysis.messages.length} mensajes de feedback`,
        `Detectados ${bugsFound} bugs críticos/alta prioridad`,
        `Generadas ${savedProposals.length} propuestas de mejora`,
        `Top themes: ${analysis.top_themes.map(t => t.theme).join(', ')}`
      ]
    };
  }
};

// Register the executor
// removed: register not needed

module.exports = { feedbackProcessor };
