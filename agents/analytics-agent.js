/**
 * Agente de Analytics - Tracking de métricas
 */

const { createTask, updateTask, recordMetric, logActivity } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const governanceHelper = require('../backend/services/governance-helper');

class AnalyticsAgent {
  async execute(company) {
    // GOVERNANCE CHECKS
    const budgetCheck = await governanceHelper.checkBudgetBeforeAction('Data');
    if (!budgetCheck.allowed) {
      return { error: budgetCheck.error, budget_exceeded: true, action: 'skipped' };
    }

    const governanceCheck = await governanceHelper.checkGovernanceStatus('Data', company.id);
    if (!governanceCheck.allowed) {
      return { error: 'Data Agent is paused or terminated', paused: governanceCheck.paused, terminated: governanceCheck.terminated };
    }

    await governanceHelper.recordHeartbeat(company.id, 'Data');

    const task = await createTask(company.id, 'analytics',
      'Análisis diario de métricas',
      'Recopilar y analizar datos de rendimiento');

    try {
      await updateTask(task.id, { status: 'running' });
      await logActivity(company.id, task.id, 'task_start',
        `Agente de analytics iniciado para ${company.name}`);

      // 1. Recopilar métricas disponibles
      const metrics = await this.collectMetrics(company);
      
      // 2. Analizar tendencias
      const analysis = await this.analyzeMetrics(company, metrics);
      
      // 3. Guardar métricas en la base de datos
      for (const metric of metrics) {
        await recordMetric(company.id, metric.name, metric.value);
      }

      const output = `Métricas recopiladas: ${metrics.length}\nAnálisis: ${analysis.summary}`;

      await updateTask(task.id, {
        status: 'completed',
        output,
        completed_at: new Date()
      });

      await logActivity(company.id, task.id, 'task_complete',
        `Analytics completado: ${metrics.length} métricas registradas`);

      // GOVERNANCE: Record budget usage
      governanceHelper.recordBudgetUsage(company.id, 'Data', 0.05, 'dollars').catch(() => {});

      return {
        success: true,
        summary: `${metrics.length} métricas analizadas`,
        metrics
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

  async collectMetrics(company) {
    // Simular recopilación de métricas
    // En producción, esto se conectaría a analytics reales, Google Analytics, etc.
    return [
      { name: 'visitantes', value: Math.floor(Math.random() * 1000) },
      { name: 'conversiones', value: Math.floor(Math.random() * 50) },
      { name: 'ingresos', value: Math.floor(Math.random() * 5000) },
      { name: 'engagement', value: Math.random() * 100 }
    ];
  }

  async analyzeMetrics(company, metrics) {
    const prompt = `Analiza estas métricas para "${company.name}":
${JSON.stringify(metrics, null, 2)}

Proporciona insights y recomendaciones.

Responde en JSON:
{
  "summary": "resumen del análisis",
  "insights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"]
}`;

    const response = await callLLM(prompt);
    const content = typeof response === 'string' ? response : response.content;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: 'Análisis completado' };
    } catch {
      return { summary: 'Análisis completado', raw: content };
    }
  }

  async executeCustomTask(company, taskDescription) {
    const prompt = `Tarea de analytics personalizada para "${company.name}": ${taskDescription}

Genera el análisis solicitado.`;
    
    const response = await callLLM(prompt);
    const content = typeof response === 'string' ? response : response.content;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { response: content };
    } catch {
      return { response: content };
    }
  }
}

module.exports = AnalyticsAgent;
