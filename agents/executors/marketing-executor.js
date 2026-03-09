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
INSTRUCCIONES DE COPYWRITING (marketing directo de respuesta directa):
1. Escribe como una persona real que encontró algo que funciona, no como un equipo de marketing.
2. TITULAR: usa números específicos o resultados concretos. Ej: "Cómo [empresa] consiguió sus primeros 50 clientes en 30 días" NO "Soluciones innovadoras para tu negocio".
3. APERTURA: primera frase corta y directa. Crea curiosidad o hace una afirmación audaz. NUNCA empieces con "En el mundo actual..." ni "Hoy en día...".
4. CUERPO: alterna párrafos cortos (impacto) con párrafos medios (contexto). Nunca bloques de texto.
5. DOLOR CUANTIFICADO: no "pierdes tiempo" sino "pierdes 4 horas al día que podrías dedicar a vender".
6. CTA: describe el beneficio, no la acción. "Empieza a captar clientes hoy" NO "Regístrate".
7. VOZ: usa "tú" y "yo". Números reales. Limitaciones honestas. Sin corporativo.
8. PROHIBIDO: "soluciones innovadoras", "líder del sector", "de primer nivel", "de calidad", "excelente", "revolucionario", "en el mundo actual".
9. Si es landing page: headline + subheadline + problema cuantificado + solución + prueba social + CTA. Completo.
10. Si es secuencia de emails: asunto que no parece publicidad + apertura personal + historia breve + CTA claro.

FORMATO DE RESPUESTA:
Entrega el contenido completo, listo para copiar y pegar. Sin explicaciones meta. Sin "aquí tienes el copy:".`;

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
