/**
 * Marketing Executor — Genera copy, campañas y contenido de marketing
 * 
 * Usa LLM para generar contenido de marketing basado en la empresa y tarea.
 * No despliega nada, solo genera texto/estrategia.
 */

const { callLLM } = require('../../backend/llm');
const { getSystemPrompt } = require('../system-prompts');
const { pool } = require('../../backend/db');

class MarketingExecutor {
  constructor() {
    this.name = 'Marketing Agent';
  }

  async execute(task) {
    console.log(`📢 Marketing Agent procesando: ${task.title}`);

    const company = await this.getCompany(task.company_id);
    if (!company) throw new Error('Company not found');

    // Get market analysis if available
    const analysis = await this.getMarketAnalysis(task.company_id);

    const systemPrompt = getSystemPrompt('marketing', company.name);

    const analysisContext = analysis
      ? `\nANÁLISIS DE MERCADO DISPONIBLE:\n${analysis.substring(0, 2000)}\nUsa estos datos para hacer el contenido más relevante.\n`
      : '';

    const prompt = `TAREA: ${task.title}
DESCRIPCIÓN: ${task.description || 'Generar contenido de marketing'}

EMPRESA:
- Nombre: ${company.name}
- Descripción: ${company.description || 'Sin descripción'}
- Industria: ${company.industry || 'General'}
${company.target_market ? `- Target: ${company.target_market}` : ''}
${company.business_model ? `- Modelo: ${company.business_model}` : ''}
${analysisContext}
INSTRUCCIONES:
1. Genera contenido de marketing profesional y persuasivo
2. El tono debe ser español nativo, directo pero cercano
3. Incluye headlines, body copy, CTAs
4. Si es para landing page, incluye secciones completas
5. Si es campaña, incluye subject lines, body, secuencia

FORMATO DE RESPUESTA:
Entrega el contenido completo, listo para usar. Sin explicaciones meta.`;

    const result = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'marketing',
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4000
    });

    return {
      output: result.content || 'Contenido de marketing generado',
      summary: `Marketing: ${task.title}`
    };
  }

  async getMarketAnalysis(companyId) {
    try {
      const result = await pool.query(
        `SELECT output FROM tasks 
         WHERE company_id = $1 
         AND tag = 'research' 
         AND status = 'completed'
         AND output IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT 1`,
        [companyId]
      );
      return result.rows[0]?.output || null;
    } catch (e) {
      return null;
    }
  }

  async getCompany(companyId) {
    const result = await pool.query(
      'SELECT * FROM companies WHERE id = $1', [companyId]
    );
    return result.rows[0];
  }
}

module.exports = MarketingExecutor;
