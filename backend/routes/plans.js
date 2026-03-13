/**
 * Plans Routes
 *
 * POST /api/plans/generate          — Endpoint nuevo: inputs directos (idea, targetCustomer, objective14d)
 * POST /api/plans/generate-14-days  — Endpoint legacy: por companyId (frontend actual)
 * GET  /api/plans/:companyId        — Obtener plan guardado + polling
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { callLLM } = require('../llm');

// Demo plan para fallback en presentación
const DEMO_PLAN = (() => {
  try {
    return require(path.join(__dirname, '../seeds/plan-demo.json'));
  } catch {
    return null;
  }
})();

/**
 * POST /api/plans/generate
 * Genera plan de 14 días con inputs directos personalizados.
 * Input: { projectId, idea, targetCustomer, objective14d, founderProfile }
 * Output: { status, plan: { days, milestones, weeklyGoals, sprints } }
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { projectId, idea, targetCustomer, objective14d, founderProfile = {} } = req.body;

    // projectId puede ser un companyId (misma entidad en este MVP)
    const companyId = projectId;

    if (!companyId) {
      return res.status(400).json({ error: 'projectId requerido' });
    }
    if (!idea) {
      return res.status(400).json({ error: 'idea requerida' });
    }

    const company = await pool.query(
      'SELECT * FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );

    if (!company.rows[0]) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const metadata = company.rows[0].metadata || {};

    // Cache hit
    if (metadata.plan14DaysStatus === 'completed' && metadata.plan14Days) {
      return res.json({ success: true, status: 'completed', plan: metadata.plan14Days });
    }

    if (metadata.plan14DaysStatus === 'running') {
      return res.json({ success: true, status: 'running' });
    }

    // Resolver founderProfile: req.body > DB
    const userData = await pool.query('SELECT survey_data, name FROM users WHERE id = $1', [req.user.id]);
    const dbFounderProfile = userData.rows[0]?.survey_data?.founderProfile || {};
    const resolvedFounderProfile = Object.keys(founderProfile).length > 0 ? founderProfile : dbFounderProfile;

    const companyName = company.rows[0].name;
    const viabilityAnalysis = metadata.viabilityAnalysis || null;

    await pool.query(
      `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
      [JSON.stringify({ plan14DaysStatus: 'running' }), companyId]
    );

    res.json({ success: true, status: 'running' });

    runPlanGeneration(companyId, companyName, viabilityAnalysis, resolvedFounderProfile, {
      idea,
      targetCustomer: targetCustomer || '',
      objective14d: objective14d || ''
    }).catch(err => {
      console.error('[Plans] generate failed:', err.message);
      pool.query(
        `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
        [JSON.stringify({ plan14DaysStatus: 'failed', plan14DaysError: err.message }), companyId]
      ).catch(() => {});
    });

  } catch (error) {
    console.error('[Plans] POST /generate error:', error);
    res.status(500).json({ error: 'Error generando el plan' });
  }
});

/**
 * POST /api/plans/generate-14-days
 * Endpoint legacy — mantiene compatibilidad con el frontend actual.
 * Input: { companyId }
 */
router.post('/generate-14-days', authenticate, async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId requerido' });
    }

    const company = await pool.query(
      'SELECT * FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );

    if (!company.rows[0]) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const metadata = company.rows[0].metadata || {};

    // Cache hit
    if (metadata.plan14DaysStatus === 'completed' && metadata.plan14Days) {
      return res.json({ success: true, status: 'completed', plan: metadata.plan14Days });
    }

    if (metadata.plan14DaysStatus === 'running') {
      return res.json({ success: true, status: 'running' });
    }

    const viabilityAnalysis = metadata.viabilityAnalysis;
    if (!viabilityAnalysis) {
      // Fallback a demo si no hay análisis (útil en presentaciones)
      if (DEMO_PLAN) {
        console.log('[Plans] No viabilityAnalysis — usando demo plan como fallback');
        await pool.query(
          `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
          [JSON.stringify({ plan14DaysStatus: 'completed', plan14Days: DEMO_PLAN }), companyId]
        );
        return res.json({ success: true, status: 'completed', plan: DEMO_PLAN });
      }
      return res.status(400).json({ error: 'El análisis de viabilidad debe completarse primero' });
    }

    const userData = await pool.query('SELECT survey_data, name FROM users WHERE id = $1', [req.user.id]);
    const founderProfile = userData.rows[0]?.survey_data?.founderProfile || {};
    const companyName = company.rows[0].name;

    await pool.query(
      `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
      [JSON.stringify({ plan14DaysStatus: 'running' }), companyId]
    );

    res.json({ success: true, status: 'running' });

    runPlanGeneration(companyId, companyName, viabilityAnalysis, founderProfile, null).catch(err => {
      console.error('[Plans] Plan generation failed:', err.message);
      pool.query(
        `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
        [JSON.stringify({ plan14DaysStatus: 'failed', plan14DaysError: err.message }), companyId]
      ).catch(() => {});
    });

  } catch (error) {
    console.error('[Plans] generate-14-days POST error:', error);
    res.status(500).json({ error: 'Error generando el plan' });
  }
});

/**
 * GET /api/plans/:companyId
 * Obtener estado y resultado del plan (polling del frontend)
 */
router.get('/:companyId', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await pool.query(
      'SELECT metadata FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );

    if (!company.rows[0]) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const metadata = company.rows[0].metadata || {};

    res.json({
      status: metadata.plan14DaysStatus || 'pending',
      plan: metadata.plan14Days || null,
      error: metadata.plan14DaysError || null
    });

  } catch (error) {
    console.error('[Plans] GET error:', error);
    res.status(500).json({ error: 'Error consultando el plan' });
  }
});

/**
 * GET /api/plans/demo/plan
 * Devuelve el plan demo sin autenticación (útil para presentaciones)
 */
router.get('/demo/plan', (req, res) => {
  if (!DEMO_PLAN) {
    return res.status(404).json({ error: 'Demo plan not found' });
  }
  res.json({ status: 'completed', plan: DEMO_PLAN });
});

// ---------------------------------------------------------------------------
// Plan generation core
// ---------------------------------------------------------------------------

/**
 * Genera el plan de 14 días con LLM y guarda en companies.metadata.
 * @param {string} companyId
 * @param {string} companyName
 * @param {object|null} viabilityAnalysis - análisis previo (puede ser null)
 * @param {object} founderProfile - perfil del founder
 * @param {object|null} directInputs - { idea, targetCustomer, objective14d } (endpoint nuevo)
 */
async function runPlanGeneration(companyId, companyName, viabilityAnalysis, founderProfile, directInputs) {
  console.log(`[Plans] Generando plan 14 días para ${companyId}`);

  const timeMap = { lt5: '5', '5_15': '10', '15_30': '20', gt30: '35' };
  const dailyHours = Math.round((parseInt(timeMap[founderProfile.timeAvailable] || '10')) / 5);

  // Sección de contexto del negocio — usa inputs directos si están disponibles
  const businessContext = directInputs
    ? `IDEA DE NEGOCIO: ${directInputs.idea}
CLIENTE OBJETIVO: ${directInputs.targetCustomer || 'No especificado'}
OBJETIVO 14 DÍAS: ${directInputs.objective14d || 'Conseguir primeros 3 clientes pagando'}`
    : `EMPRESA: ${companyName}`;

  // Sección de análisis de viabilidad — opcional
  const viabilityContext = viabilityAnalysis
    ? `ANÁLISIS DE VIABILIDAD:
- Veredicto: ${viabilityAnalysis.verdict} (${viabilityAnalysis.confidenceScore}% confianza)
- Resumen: ${viabilityAnalysis.summary}
- Canales top: ${viabilityAnalysis.channels?.map(c => c.name).join(', ') || 'No especificados'}
- Riesgos: ${viabilityAnalysis.risks?.map(r => r.description).join('; ') || 'No especificados'}`
    : '';

  const prompt = `Eres el cofundador de IA de "${companyName}". Crea un plan de 14 días con tareas diarias concretas y personalizadas.

${businessContext}

${viabilityContext}

PERFIL FOUNDER:
- Tiempo disponible: ${founderProfile.timeAvailable || '5_15'} horas/semana → máx ${dailyHours}h/día laborable
- Experiencia: ${founderProfile.experience || 'first_time'}
- Motivación: ${founderProfile.motivation || 'extra_income'}

REGLAS DEL PLAN:
1. Días 1-3: SOLO validación. No construir nada hasta tener 3+ conversaciones con clientes reales.
2. Días 4-7: MVP mínimo. La funcionalidad más básica que resuelva el dolor validado.
3. Días 8-11: Primeras ventas. Mínimo 3 clientes pagando (aunque sea €1).
4. Días 12-14: Feedback loop. Retrospectiva + decisión: pivot, double down, o parar.
5. Adaptar el volumen de tareas al tiempo disponible: máx ${dailyHours}h/día.
6. Cada tarea debe tener output claro y medible.
7. agentCanHelp=true para tareas que la IA puede ejecutar (guiones, copy, templates, análisis).
8. Los títulos de tareas deben ser específicos y accionables, NO genéricos.
9. Genera 3-5 tareas por sprint (total 14-20 tareas).

Responde ÚNICAMENTE con JSON válido, sin bloques de código, sin texto adicional:
{
  "sprints": [
    {
      "id": 1,
      "name": "Validación Rápida",
      "days": "1-3",
      "objective": "Objetivo concreto del sprint",
      "tasks": [
        {
          "id": "t1",
          "day": 1,
          "title": "Título accionable específico",
          "description": "Instrucción concreta de cómo hacerlo",
          "estimatedMinutes": 30,
          "expectedOutput": "Resultado concreto y medible",
          "category": "research",
          "agentCanHelp": true,
          "agentAction": "generate_interview_script"
        }
      ]
    },
    {
      "id": 2,
      "name": "MVP Mínimo",
      "days": "4-7",
      "objective": "Objetivo concreto del sprint",
      "tasks": []
    },
    {
      "id": 3,
      "name": "Primeros Clientes",
      "days": "8-11",
      "objective": "Objetivo concreto del sprint",
      "tasks": []
    },
    {
      "id": 4,
      "name": "Feedback Loop",
      "days": "12-14",
      "objective": "Objetivo concreto del sprint",
      "tasks": []
    }
  ],
  "weeklyGoals": [
    {
      "week": 1,
      "days": "1-7",
      "goal": "Objetivo semana 1",
      "keyMetric": "Métrica de éxito"
    },
    {
      "week": 2,
      "days": "8-14",
      "goal": "Objetivo semana 2",
      "keyMetric": "Métrica de éxito"
    }
  ],
  "milestones": [
    {
      "day": 3,
      "title": "Primer hito",
      "description": "Descripción del hito",
      "success": "Criterio de éxito medible"
    },
    {
      "day": 7,
      "title": "Segundo hito",
      "description": "Descripción",
      "success": "Criterio"
    },
    {
      "day": 11,
      "title": "Tercer hito",
      "description": "Descripción",
      "success": "Criterio"
    },
    {
      "day": 14,
      "title": "Hito final",
      "description": "Descripción",
      "success": "Criterio"
    }
  ]
}`;

  const result = await callLLM(prompt, {
    companyId,
    taskType: 'research',
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.4,
    maxTokens: 5000
  });

  let planData;
  try {
    let clean = result.content.trim();
    // Limpiar posibles bloques de código markdown
    clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    planData = JSON.parse(clean);
  } catch (parseErr) {
    console.error('[Plans] Failed to parse LLM response:', result.content.substring(0, 500));
    // Fallback al demo plan si el LLM falla el parse
    if (DEMO_PLAN) {
      console.warn('[Plans] Usando demo plan como fallback por parse error');
      planData = { ...DEMO_PLAN };
    } else {
      throw new Error('El modelo no devolvió JSON válido');
    }
  }

  // Enriquecer con metadata calculada
  const allTasks = planData.sprints.reduce((acc, s) => acc.concat(s.tasks || []), []);
  planData.totalTasks = allTasks.length;
  planData.totalDays = 14;
  planData.planId = `plan_${companyId}`;

  // Construir índice de días si no lo devolvió el LLM
  if (!planData.days) {
    planData.days = buildDaysIndex(planData.sprints);
  }

  await pool.query(
    `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
    [JSON.stringify({ plan14DaysStatus: 'completed', plan14Days: planData }), companyId]
  );

  console.log(`[Plans] Plan generado para ${companyId}: ${planData.totalTasks} tareas en 4 sprints`);
}

/**
 * Construye un índice de días a partir de los sprints (para el campo days[])
 */
function buildDaysIndex(sprints) {
  const tasksByDay = {};
  for (const sprint of sprints) {
    for (const task of sprint.tasks || []) {
      if (!tasksByDay[task.day]) {
        tasksByDay[task.day] = { day: task.day, sprint: sprint.id, focus: sprint.name, tasks: [] };
      }
      tasksByDay[task.day].tasks.push(task.id);
    }
  }
  return Object.values(tasksByDay).sort((a, b) => a.day - b.day);
}

module.exports = router;
