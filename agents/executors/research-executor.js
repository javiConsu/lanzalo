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
      'SELECT * FROM companies WHERE id = ?',
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
    // TODO: Integrar Brave Search API real
    // Por ahora, simular resultados
    
    console.log(`🔎 Buscando: "${query}"`);

    // Simulación de resultados
    return [
      {
        title: `Resultado 1 para: ${query}`,
        url: 'https://example.com/1',
        snippet: 'Información relevante encontrada...'
      },
      {
        title: `Resultado 2 para: ${query}`,
        url: 'https://example.com/2',
        snippet: 'Más datos sobre el tema...'
      }
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
       VALUES (?, ?, ?, ?, ?, ?)`,
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
      'UPDATE tasks SET report_id = ? WHERE id = ?',
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
