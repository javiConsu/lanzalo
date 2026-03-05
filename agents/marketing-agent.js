/**
 * Agente de Marketing - Generación de campañas y contenido
 */

const { createTask, updateTask, logActivity } = require('../backend/db');
const { callLLM } = require('../backend/llm');

class MarketingAgent {
  async execute(company) {
    const task = await createTask(company.id, 'marketing',
      'Campaña de marketing diaria',
      'Generar estrategia y contenido de marketing');

    try {
      await updateTask(task.id, { status: 'running' });
      await logActivity(company.id, task.id, 'task_start',
        `Agente de marketing iniciado para ${company.name}`);

      // 1. Analizar mercado y audiencia
      const marketAnalysis = await this.analyzeMarket(company);
      
      // 2. Generar estrategia del día
      const strategy = await this.generateDailyStrategy(company, marketAnalysis);
      
      // 3. Crear contenido
      const content = await this.createContent(company, strategy);

      const output = `Análisis de mercado: ${marketAnalysis.summary}\n\nEstrategia: ${strategy.focus}\n\nContenido generado:\n${content.map(c => `- ${c.type}: ${c.title}`).join('\n')}`;

      await updateTask(task.id, {
        status: 'completed',
        output,
        completed_at: new Date()
      });

      await logActivity(company.id, task.id, 'task_complete',
        `Marketing completado: ${content.length} piezas de contenido generadas`);

      return {
        success: true,
        summary: `${content.length} piezas de contenido creadas`,
        content
      };

    } catch (error) {
      await updateTask(task.id, {
        status: 'failed',
        output: error.message,
        completed_at: new Date()
      });
      throw error;
    }
  }

  async analyzeMarket(company) {
    const prompt = `Eres el agente de marketing para "${company.name}".
Descripción: ${company.description}
Industria: ${company.industry}

Analiza el mercado actual:
- ¿Quién es la audiencia objetivo?
- ¿Cuáles son las tendencias relevantes?
- ¿Qué mensajes resonarán?

Responde en JSON:
{
  "summary": "resumen del análisis",
  "targetAudience": "descripción de la audiencia",
  "trends": ["tendencia1", "tendencia2"],
  "keyMessages": ["mensaje1", "mensaje2"]
}`;

    const response = await callLLM(prompt);
    return JSON.parse(response);
  }

  async generateDailyStrategy(company, marketAnalysis) {
    const prompt = `Basándote en este análisis para "${company.name}":
${JSON.stringify(marketAnalysis, null, 2)}

Define la estrategia de marketing para HOY:
- ¿En qué canales enfocarse?
- ¿Qué tipo de contenido crear?
- ¿Cuál es el objetivo principal?

Responde en JSON:
{
  "focus": "enfoque principal del día",
  "channels": ["canal1", "canal2"],
  "contentTypes": ["tipo1", "tipo2"],
  "goal": "objetivo específico"
}`;

    const response = await callLLM(prompt);
    return JSON.parse(response);
  }

  async createContent(company, strategy) {
    const contentPieces = [];
    
    for (const contentType of strategy.contentTypes.slice(0, 3)) {
      const prompt = `Crea ${contentType} para "${company.name}".

Contexto:
- Descripción: ${company.description}
- Objetivo: ${strategy.goal}
- Enfoque: ${strategy.focus}

Genera contenido específico y accionable.

Responde en JSON:
{
  "type": "${contentType}",
  "title": "título del contenido",
  "body": "contenido completo",
  "cta": "llamado a la acción"
}`;

      const response = await callLLM(prompt);
      const content = JSON.parse(response);
      contentPieces.push(content);
    }

    return contentPieces;
  }

  async executeCustomTask(company, taskDescription) {
    const prompt = `Tarea de marketing personalizada para "${company.name}": ${taskDescription}

Genera el contenido solicitado.`;
    
    const response = await callLLM(prompt);
    return JSON.parse(response);
  }
}

module.exports = MarketingAgent;
