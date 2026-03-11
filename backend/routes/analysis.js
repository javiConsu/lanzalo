/**
 * Analysis Routes
 *
 * POST /api/analysis/viability   — Generar análisis de viabilidad con LLM
 * GET  /api/analysis/viability/:companyId — Consultar estado/resultado
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { callLLM } = require('../llm');

/**
 * POST /api/analysis/viability
 * Lanza análisis de viabilidad en background y devuelve inmediatamente.
 * El frontend hace polling a GET /api/analysis/viability/:companyId
 */
router.post('/viability', authenticate, async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId requerido' });
    }

    // Verificar acceso
    const company = await pool.query(
      'SELECT * FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );

    if (!company.rows[0]) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const companyRow = company.rows[0];
    const metadata = companyRow.metadata || {};

    // Si ya está completado, devolver resultado cacheado
    if (metadata.viabilityStatus === 'completed' && metadata.viabilityAnalysis) {
      return res.json({
        success: true,
        status: 'completed',
        analysis: metadata.viabilityAnalysis
      });
    }

    // Si ya está en progreso, no relanzar
    if (metadata.viabilityStatus === 'running') {
      return res.json({ success: true, status: 'running' });
    }

    // Obtener founder profile del usuario
    const userData = await pool.query(
      'SELECT survey_data, name FROM users WHERE id = $1',
      [req.user.id]
    );
    const surveyData = userData.rows[0]?.survey_data || {};
    const founderProfile = surveyData.founderProfile || {};

    const ideaData = metadata.ideaData || {
      description: companyRow.description,
      targetCustomer: companyRow.industry,
      problem: null,
      unfairAdvantage: null
    };

    // Marcar como running
    await pool.query(
      `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
      [JSON.stringify({ viabilityStatus: 'running' }), companyId]
    );

    // Responder inmediatamente — análisis corre en background
    res.json({ success: true, status: 'running' });

    // Ejecutar análisis async
    runViabilityAnalysis(companyId, ideaData, founderProfile, userData.rows[0]?.name).catch(err => {
      console.error('[Analysis] Viability analysis failed:', err.message);
      pool.query(
        `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
        [JSON.stringify({ viabilityStatus: 'failed', viabilityError: err.message }), companyId]
      ).catch(() => {});
    });

  } catch (error) {
    console.error('[Analysis] viability POST error:', error);
    res.status(500).json({ error: 'Error iniciando análisis' });
  }
});

/**
 * GET /api/analysis/viability/:companyId
 * Consultar estado y resultado del análisis
 */
router.get('/viability/:companyId', authenticate, async (req, res) => {
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
      status: metadata.viabilityStatus || 'pending',
      analysis: metadata.viabilityAnalysis || null,
      error: metadata.viabilityError || null
    });

  } catch (error) {
    console.error('[Analysis] viability GET error:', error);
    res.status(500).json({ error: 'Error consultando análisis' });
  }
});

/**
 * Ejecuta el análisis de viabilidad y guarda el resultado en la DB
 */
async function runViabilityAnalysis(companyId, ideaData, founderProfile, founderName) {
  console.log(`[Analysis] Iniciando análisis de viabilidad para company ${companyId}`);

  const motivationMap = {
    replace_job: 'Reemplazar trabajo actual',
    extra_income: 'Generar ingresos extra (side project)',
    impact: 'Impacto: resolver un problema importante',
    learning: 'Aprender y experimentar',
    startup: 'Construir algo grande (startup, levantar capital)'
  };

  const timeMap = {
    lt5: 'menos de 5 horas/semana',
    '5_15': '5-15 horas/semana',
    '15_30': '15-30 horas/semana',
    gt30: 'más de 30 horas/semana'
  };

  const expMap = {
    first_time: 'Primera vez (no ha lanzado nada)',
    tried: 'Ha intentado algo (sin facturar)',
    some_revenue: 'Ha facturado algo (cientos/miles €)',
    experienced: 'Founder con experiencia (ventas, ARR, clientes)'
  };

  const prompt = `Eres un analista de startups con experiencia en el mercado hispanohablante (España + LATAM).
Analiza esta idea de negocio y responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin bloques de código.

IDEA: ${ideaData.description || 'No especificado'}
CLIENTE OBJETIVO: ${ideaData.targetCustomer || 'No especificado'}
PROBLEMA: ${ideaData.problem || 'No especificado'}
VENTAJA DEL FOUNDER: ${ideaData.unfairAdvantage || 'No especificado'}

PERFIL FOUNDER:
- Motivación: ${motivationMap[founderProfile.motivation] || founderProfile.motivation || 'No especificado'}
- Tiempo disponible: ${timeMap[founderProfile.timeAvailable] || founderProfile.timeAvailable || 'No especificado'}
- Experiencia: ${expMap[founderProfile.experience] || founderProfile.experience || 'No especificado'}

Responde con este JSON exacto (sin markdown, sin bloques de código):
{
  "verdict": "go",
  "confidenceScore": 72,
  "summary": "Resumen ejecutivo de 2-3 frases sobre la viabilidad de la idea.",
  "timing": {
    "score": "good",
    "reason": "Explicación del timing de mercado con datos reales si los hay."
  },
  "customer": {
    "segment": "Descripción del segmento principal",
    "estimatedSize": "Ej: 180.000 establecimientos en España",
    "willingnessToPay": "Ej: €49-79/mes",
    "painLevel": "high"
  },
  "competition": {
    "directCompetitors": [
      { "name": "Competidor 1", "price": "€X/mes", "weakness": "Punto débil" },
      { "name": "Competidor 2", "price": "€X/mes", "weakness": "Punto débil" }
    ],
    "competitiveWindow": "Descripción de la ventana competitiva",
    "moat": "Ventaja defensible del founder"
  },
  "channels": [
    {
      "name": "Nombre del canal",
      "type": "direct",
      "estimatedCAC": "€X-Y",
      "priority": 1,
      "reason": "Por qué este canal es ideal para este founder específico"
    },
    {
      "name": "Nombre del canal",
      "type": "content",
      "estimatedCAC": "€X-Y",
      "priority": 2,
      "reason": "Razón"
    },
    {
      "name": "Nombre del canal",
      "type": "community",
      "estimatedCAC": "€X-Y",
      "priority": 3,
      "reason": "Razón"
    }
  ],
  "risks": [
    {
      "description": "Descripción del riesgo principal",
      "severity": "medium",
      "mitigation": "Mitigación concreta y accionable"
    },
    {
      "description": "Descripción del segundo riesgo",
      "severity": "low",
      "mitigation": "Mitigación concreta"
    }
  ]
}

Reglas:
- verdict debe ser "go" (confidence >= 65%), "caution" (40-64%), o "no_go" (< 40%)
- Usa datos reales del mercado hispanohablante cuando sea posible
- Los canales deben ser ESPECÍFICOS al perfil del founder (sus ventajas, tiempo, experiencia)
- Los riesgos deben incluir mitigaciones concretas y accionables
- Sé honesto, no optimista por defecto
- Si la idea es débil, dilo — un NO GO honesto es más útil que un GO falso`;

  const result = await callLLM(prompt, {
    companyId,
    taskType: 'research',
    model: 'anthropic/claude-sonnet-4',
    temperature: 0.3,
    maxTokens: 3000
  });

  // Parsear JSON del resultado
  let analysis;
  try {
    // Limpiar posibles bloques de código markdown
    let clean = result.content.trim();
    clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    analysis = JSON.parse(clean);
  } catch (parseErr) {
    console.error('[Analysis] Failed to parse LLM response:', result.content.substring(0, 500));
    throw new Error('El modelo no devolvió JSON válido');
  }

  // Guardar resultado en companies.metadata
  await pool.query(
    `UPDATE companies SET metadata = metadata || $1 WHERE id = $2`,
    [JSON.stringify({ viabilityStatus: 'completed', viabilityAnalysis: analysis }), companyId]
  );

  console.log(`[Analysis] Viabilidad completada para ${companyId}: verdict=${analysis.verdict}, confidence=${analysis.confidenceScore}`);
}

module.exports = router;
