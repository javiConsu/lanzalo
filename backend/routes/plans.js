/**
 * Plans Routes
 *
 * POST /api/plans/generate-14-days  — Generar plan de 14 días personalizado
 * GET  /api/plans/:companyId        — Obtener plan guardado
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { callLLM } = require('../llm');

/**
 * POST /api/plans/generate-14-days
 * Genera un plan de 14 días basado en el análisis de viabilidad y perfil del founder.
 * Corre en background — hace polling con GET /api/plans/:companyId
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

    // Si ya está generado, devolver cacheado
    if (metadata.plan14DaysStatus === 'completed' && metadata.plan14Days) {
      return res.json({ success: true, status: 'completed', plan: metadata.plan14Days });
    }

    if (metadata.plan14DaysStatus === 'running') {
      return res.json({ success: true, status: 'running' });
    }

    const viabilityAnalysis = metadata.viabilityAnalysis;
    if (!viabilityAnalysis) {
      return res.status(400).json({ error: 'El análisis de viabilidad debe completarse primero' });
    }

    const userData = await pool.query('SELECT survey_data, name FROM users WHERE id = $1', [req.user.id]);
    const founderProfile = userData.rows[0]?.survey_data?.founderProfile || {};
    const companyName = company.rows[0].name;

    // Marcar como running
    await pool.query(
      `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
      [JSON.stringify({ plan14DaysStatus: 'running' }), companyId]
    );

    res.json({ success: true, status: 'running' });

    // Ejecutar en background
    runPlanGeneration(companyId, companyName, viabilityAnalysis, founderProfile).catch(err => {
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
 * Obtener estado y resultado del plan
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
 * Genera el plan de 14 días con LLM y lo guarda en companies.metadata
 */
async function runPlanGeneration(companyId, companyName, viabilityAnalysis, founderProfile) {
  console.log(`[Plans] Generando plan 14 días para ${companyId}`);

  const timeMap = {
    lt5: '5', '5_15': '10', '15_30': '20', gt30: '35'
  };
  const dailyHours = Math.round((parseInt(timeMap[founderProfile.timeAvailable] || '10')) / 5);

  const prompt = `Eres el cofundador de IA de "${companyName}". Basándote en el análisis de viabilidad, crea un plan de 14 días con tareas diarias concretas.

ANÁLISIS DE VIABILIDAD:
- Veredicto: ${viabilityAnalysis.verdict} (${viabilityAnalysis.confidenceScore}% confianza)
- Resumen: ${viabilityAnalysis.summary}
- Canales top: ${viabilityAnalysis.channels?.map(c => c.name).join(', ') || 'No especificados'}
- Riesgos: ${viabilityAnalysis.risks?.map(r => r.description).join('; ') || 'No especificados'}

PERFIL FOUNDER:
- Tiempo disponible: ${founderProfile.timeAvailable || '5_15'} horas/semana → máx ${dailyHours}h/día
- Experiencia: ${founderProfile.experience || 'first_time'}
- Motivación: ${founderProfile.motivation || 'extra_income'}

REGLAS DEL PLAN:
1. Días 1-3: SOLO validación. No construir nada hasta tener 3 conversaciones con clientes reales.
2. Días 4-7: MVP mínimo. La funcionalidad más básica que resuelva el dolor validado.
3. Días 8-11: Primeras ventas. Mínimo 3 clientes pagando (aunque sea €1).
4. Días 12-14: Feedback loop. Retrospectiva + decisión: pivot, double down, o parar.
5. Adaptar el volumen de tareas al tiempo disponible: máx ${dailyHours}h/día laborable.
6. Cada tarea debe tener output claro y medible.
7. Marcar agentCanHelp=true para tareas que la IA puede ejecutar (escribir guiones, generar copy, crear templates).

Responde ÚNICAMENTE con JSON válido, sin bloques de código, sin texto adicional:
{
  "sprints": [
    {
      "id": 1,
      "name": "Validación Rápida",
      "days": "1-3",
      "objective": "Hablar con 5 clientes reales antes de construir nada.",
      "tasks": [
        {
          "id": "t1",
          "day": 1,
          "title": "Prepara tu guión de entrevista",
          "description": "5 preguntas para validar el dolor. El agente puede generarlo por ti.",
          "estimatedMinutes": 30,
          "expectedOutput": "Guión de 5 preguntas listo",
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
      "objective": "Construir la versión más simple posible que resuelva el dolor.",
      "tasks": []
    },
    {
      "id": 3,
      "name": "Primeros Clientes",
      "days": "8-11",
      "objective": "Conseguir los primeros 3 usuarios pagando (aunque sea €1).",
      "tasks": []
    },
    {
      "id": 4,
      "name": "Feedback Loop",
      "days": "12-14",
      "objective": "Aprender qué funciona, decidir si pivotar o acelerar.",
      "tasks": []
    }
  ]
}

Genera al menos 3-4 tareas por sprint. Las tareas deben ser específicas para "${companyName}" basadas en el análisis real.`;

  const result = await callLLM(prompt, {
    companyId,
    taskType: 'research',
    model: 'anthropic/claude-sonnet-4',
    temperature: 0.4,
    maxTokens: 4000
  });

  let planData;
  try {
    let clean = result.content.trim();
    clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    planData = JSON.parse(clean);
  } catch (parseErr) {
    console.error('[Plans] Failed to parse LLM response:', result.content.substring(0, 500));
    throw new Error('El modelo no devolvió JSON válido');
  }

  // Contar total de tareas
  const totalTasks = planData.sprints.reduce((sum, s) => sum + (s.tasks?.length || 0), 0);
  planData.totalTasks = totalTasks;
  planData.planId = `plan_${companyId}`;

  await pool.query(
    `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
    [JSON.stringify({ plan14DaysStatus: 'completed', plan14Days: planData }), companyId]
  );

  console.log(`[Plans] Plan generado para ${companyId}: ${totalTasks} tareas en 4 sprints`);
}

module.exports = router;
