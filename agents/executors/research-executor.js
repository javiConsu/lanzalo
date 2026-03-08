/**
 * Research Agent Executor - Ejecuta tareas de investigación
 * Genera análisis de mercado, planes de negocio, y valoraciones de ideas
 */

const { callLLM } = require('../../backend/llm');
const { pool } = require('../../backend/db');
const axios = require('axios');

class ResearchExecutor {
  constructor() {
    this.name = 'research-agent';
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

    // Buscar información real sobre el mercado
    const searchResults = await this.search(company.name + ' ' + (company.description || ''));

    // Generar análisis completo con LLM
    const fullReport = await this.generateReport(task, company, searchResults);

    // El output se guarda en la columna output de tasks (aparece en widget de Links)
    return {
      output: fullReport
    };
  }

  /**
   * Buscar información (usando Brave Search si está disponible)
   */
  async search(query) {
    console.log(`🔎 Buscando: "${query}"`);

    const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
    if (!BRAVE_API_KEY) {
      console.warn('[Research] BRAVE_API_KEY no configurada, análisis basado en conocimiento del LLM');
      return [];
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
      return [];
    }
  }

  /**
   * Generar reporte completo con LLM
   */
  async generateReport(task, company, searchResults) {
    let searchContext = '';
    if (searchResults.length > 0) {
      searchContext = `\n\nRESULTADOS DE BÚSQUEDA (usa estos datos para enriquecer tu análisis):\n${searchResults.map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`).join('\n\n')}`;
    }

    const prompt = `${task.description}${searchContext}

GENERA EL DOCUMENTO COMPLETO AHORA. Solo el contenido en markdown, sin wrapping en bloques de código.`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'research',
      temperature: 0.6,
      maxTokens: 4000
    });

    return response.content || '';
  }
}

module.exports = ResearchExecutor;
