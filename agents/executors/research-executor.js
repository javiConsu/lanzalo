/**
 * Research Agent Executor - Ejecuta tareas de investigación
 */

const TaskExecutor = require('../task-executor');
const { callLLM } = require('../../backend/llm');
const { pool } = require('../../backend/db');
const axios = require('axios');
const crypto = require('crypto');

class ResearchExecutor extends TaskExecutor {
  constructor() {
    super('research-agent', 'Research Agent');
  }

  /**
   * Ejecutar tarea de research
   */
  async execute(task) {
    console.log(`🔍 Research Agent investigando: ${task.title}`);

    // Obtener info de la empresa
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [task.company_id]
    );
    const company = companyResult.rows[0];

    // Buscar información
    const searchResults = await this.search(task.description);

    // Analizar con LLM
    const analysis = await this.analyzeResults(task, company, searchResults);

    // Crear reporte
    const reportId = await this.createReport(task, analysis);

    return {
      summary: analysis.summary,
      reportId,
      sources: searchResults.length
    };
  }

  /**
   * Buscar información (usando Brave Search si está disponible)
   */
  async search(query) {
    console.log(`🔎 Buscando: "${query}"`);

    // Brave Search API real
    const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
    if (!BRAVE_API_KEY) {
      console.warn('[Research] BRAVE_API_KEY no configurada, usando fallback');
      return this.fallbackSearch(query);
    }

    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: { q: query, count: 10 },
        headers: { 'X-Subscription-Token': BRAVE_API_KEY }
      });

      const results = (response.data.web?.results || []).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.description || ''
      }));

      console.log(`🔎 ${results.length} resultados de Brave Search`);
      return results;
    } catch (error) {
      console.error('[Research] Brave Search error:', error.message);
      return this.fallbackSearch(query);
    }
  }

  fallbackSearch(query) {
    return [
      { title: `Resultado para: ${query}`, url: 'https://example.com', snippet: 'Búsqueda real no disponible. Configura BRAVE_API_KEY.' }
    ];
  }

  /**
   * Analizar resultados con LLM
   */
  async analyzeResults(task, company, searchResults) {
    const prompt = `Eres el Research Agent de ${company.name}.

TAREA: ${task.title}
DESCRIPCIÓN: ${task.description}

RESULTADOS DE BÚSQUEDA:
${searchResults.map((r, i) => `
${i + 1}. ${r.title}
   URL: ${r.url}
   Snippet: ${r.snippet}
`).join('\n')}

TU MISIÓN:
Analizar estos resultados y crear un reporte ejecutivo.

FORMATO DE RESPUESTA (JSON):

{
  "summary": "Resumen ejecutivo (3-5 bullets)",
  "keyFindings": [
    {
      "finding": "Hallazgo clave",
      "source": "URL de fuente",
      "confidence": "high/medium/low"
    }
  ],
  "recommendations": [
    "Acción recomendada 1",
    "Acción recomendada 2"
  ],
  "fullReport": "Reporte completo en markdown con: Resumen Ejecutivo, Hallazgos Clave (con fuentes), Recomendaciones"
}

GENERA EL ANÁLISIS:`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'research',
      temperature: 0.5
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      // Fallback
      return {
        summary: response.content.substring(0, 200),
        keyFindings: [],
        recommendations: [],
        fullReport: response.content
      };
    }
  }

  /**
   * Crear reporte en base de datos
   */
  async createReport(task, analysis) {
    const reportId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO reports (id, company_id, task_id, type, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        reportId,
        task.company_id,
        task.id,
        'research',
        analysis.fullReport,
        new Date().toISOString()
      ]
    );

    // Actualizar task con report_id
    await pool.query(
      'UPDATE tasks SET report_id = $1 WHERE id = $2',
      [reportId, task.id]
    );

    console.log(`📊 Reporte creado: ${reportId}`);

    return reportId;
  }

  /**
   * Override de formatResult
   */
  formatResult(result) {
    return `📊 Investigación completada

${result.summary}

📄 Reporte completo: Ver documento ${result.reportId}
📚 Fuentes consultadas: ${result.sources}`;
  }
}

module.exports = ResearchExecutor;
