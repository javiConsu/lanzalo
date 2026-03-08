/**
 * Growth Agent — Meta-agente de la plataforma
 * 
 * Analiza métricas globales de Lanzalo, detecta churn,
 * identifica patrones de éxito/fracaso, y recomienda
 * mejoras al roadmap del producto.
 * 
 * Se ejecuta diariamente a las 6AM UTC (antes del daily sync de empresas).
 */

const cron = require('node-cron');
const { pool } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const crypto = require('crypto');

class GrowthAgent {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the growth agent — runs daily at 6AM UTC
   */
  start() {
    if (this.isRunning) {
      console.log('[Growth Agent] Already running');
      return;
    }
    this.isRunning = true;
    console.log('[Growth Agent] Started — runs daily at 6AM UTC');

    cron.schedule('0 6 * * *', async () => {
      try {
        await this.runAnalysis();
      } catch (error) {
        console.error('[Growth Agent] Analysis error:', error.message);
      }
    });
  }

  /**
   * Run full platform analysis
   */
  async runAnalysis() {
    console.log('[Growth Agent] Running platform analysis...');

    const metrics = await this.gatherPlatformMetrics();
    const analysis = await this.analyzeWithLLM(metrics);

    // Save growth report
    await this.saveReport(analysis);

    // Create actionable tasks if needed
    if (analysis.urgentActions && analysis.urgentActions.length > 0) {
      for (const action of analysis.urgentActions) {
        await this.createGrowthTask(action);
      }
    }

    // Update Layer 3 memory with cross-company patterns
    await this.updateCrossCompanyPatterns(metrics, analysis);

    console.log('[Growth Agent] Analysis complete');
    return analysis;
  }

  /**
   * Gather platform-wide metrics
   */
  async gatherPlatformMetrics() {
    // Active companies
    const activeCompanies = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
              COUNT(CASE WHEN status = 'trial' THEN 1 END) as trial,
              COUNT(CASE WHEN status = 'churned' THEN 1 END) as churned
       FROM companies`
    );

    // User activity (last 7 days)
    const userActivity = await pool.query(
      `SELECT DATE(created_at) as day, COUNT(*) as messages
       FROM chat_messages
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY day`
    );

    // Task completion rates
    const taskMetrics = await pool.query(
      `SELECT 
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
         COUNT(CASE WHEN status = 'todo' THEN 1 END) as pending,
         COUNT(*) as total
       FROM tasks
       WHERE created_at > NOW() - INTERVAL '7 days'`
    );

    // Most active companies (by chat messages)
    const topCompanies = await pool.query(
      `SELECT c.name, c.industry, COUNT(cm.id) as msg_count,
              c.created_at, c.status
       FROM companies c
       LEFT JOIN chat_messages cm ON cm.company_id = c.id 
         AND cm.created_at > NOW() - INTERVAL '7 days'
       GROUP BY c.id, c.name, c.industry, c.created_at, c.status
       ORDER BY msg_count DESC
       LIMIT 10`
    );

    // Inactive companies (no activity in 3+ days)
    const inactiveCompanies = await pool.query(
      `SELECT c.name, c.status, c.created_at,
              MAX(cm.created_at) as last_message
       FROM companies c
       LEFT JOIN chat_messages cm ON cm.company_id = c.id
       WHERE c.status IN ('active', 'trial')
       GROUP BY c.id, c.name, c.status, c.created_at
       HAVING MAX(cm.created_at) < NOW() - INTERVAL '3 days'
          OR MAX(cm.created_at) IS NULL
       ORDER BY last_message ASC NULLS FIRST`
    );

    // Task failure patterns (which tags fail most)
    const failurePatterns = await pool.query(
      `SELECT tag, COUNT(*) as failures, 
              array_agg(DISTINCT error_message) as errors
       FROM tasks
       WHERE status = 'failed' 
         AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY tag
       ORDER BY failures DESC`
    );

    // User feedback summary
    const feedbackSummary = await pool.query(
      `SELECT 
         COUNT(CASE WHEN rating = 'positive' THEN 1 END) as positive,
         COUNT(CASE WHEN rating = 'negative' THEN 1 END) as negative,
         COUNT(*) as total
       FROM user_feedback
       WHERE created_at > NOW() - INTERVAL '7 days'`
    ).catch(() => ({ rows: [{ positive: 0, negative: 0, total: 0 }] }));

    // New signups
    const signups = await pool.query(
      `SELECT DATE(created_at) as day, COUNT(*) as count
       FROM users
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY day`
    ).catch(() => ({ rows: [] }));

    return {
      companies: activeCompanies.rows[0],
      userActivity: userActivity.rows,
      tasks: taskMetrics.rows[0],
      topCompanies: topCompanies.rows,
      inactiveCompanies: inactiveCompanies.rows,
      failurePatterns: failurePatterns.rows,
      feedback: feedbackSummary.rows[0],
      signups: signups.rows
    };
  }

  /**
   * Analyze metrics with LLM
   */
  async analyzeWithLLM(metrics) {
    const prompt = `Eres el Growth Agent de Lanzalo.pro — la IA meta que analiza la salud de la plataforma.

MÉTRICAS DE LA PLATAFORMA (últimos 7 días):

EMPRESAS:
- Total: ${metrics.companies.total}
- Activas: ${metrics.companies.active}
- Trial: ${metrics.companies.trial}
- Churned: ${metrics.companies.churned}

ACTIVIDAD DE USUARIOS:
${metrics.userActivity.map(d => `${d.day}: ${d.messages} mensajes`).join('\n') || 'Sin datos'}

TAREAS:
- Completadas: ${metrics.tasks.completed}
- Fallidas: ${metrics.tasks.failed}
- Pendientes: ${metrics.tasks.pending}
- Total: ${metrics.tasks.total}
- Tasa éxito: ${metrics.tasks.total > 0 ? Math.round((metrics.tasks.completed / metrics.tasks.total) * 100) : 0}%

TOP EMPRESAS POR ACTIVIDAD:
${metrics.topCompanies.map(c => `- ${c.name} (${c.industry || 'N/A'}): ${c.msg_count} msgs, status: ${c.status}`).join('\n') || 'Sin datos'}

EMPRESAS INACTIVAS (3+ días sin actividad):
${metrics.inactiveCompanies.map(c => `- ${c.name}: último mensaje ${c.last_message || 'nunca'}, status: ${c.status}`).join('\n') || 'Ninguna'}

PATRONES DE FALLO:
${metrics.failurePatterns.map(f => `- ${f.tag}: ${f.failures} fallos — ${(f.errors || []).slice(0, 2).join(', ')}`).join('\n') || 'Sin fallos'}

FEEDBACK DE USUARIOS:
- Positivo: ${metrics.feedback.positive}
- Negativo: ${metrics.feedback.negative}
- Total: ${metrics.feedback.total}

SIGNUPS:
${metrics.signups.map(s => `${s.day}: ${s.count}`).join('\n') || 'Sin datos'}

ANALIZA y devuelve JSON:
{
  "healthScore": 0-100,
  "summary": "Resumen ejecutivo de 2-3 frases",
  "wins": ["Lo que va bien"],
  "risks": ["Riesgos detectados"],
  "churnRisk": [{"company": "nombre", "reason": "por qué", "suggestedAction": "qué hacer"}],
  "urgentActions": [
    {
      "title": "Acción concreta",
      "description": "Detalle",
      "priority": "high/medium",
      "type": "platform_improvement/churn_prevention/bug_fix"
    }
  ],
  "roadmapSuggestions": ["Ideas para mejorar la plataforma basadas en datos reales"],
  "crossCompanyPatterns": {
    "successPatterns": ["Patrones que funcionan en las empresas exitosas"],
    "failurePatterns": ["Patrones de las que fallan"],
    "industryInsights": ["Insights por industria"]
  }
}

Sé directo, analítico, y basado en datos. No inventes — si no hay datos suficientes, dilo.`;

    const response = await callLLM(prompt, {
      taskType: 'analysis',
      temperature: 0.3,
      maxTokens: 2000
    });

    try {
      // Try to parse JSON from response
      const content = response.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch (e) {
      console.error('[Growth Agent] Failed to parse LLM response');
      return {
        healthScore: 50,
        summary: 'No se pudo generar análisis automático.',
        wins: [],
        risks: [],
        churnRisk: [],
        urgentActions: [],
        roadmapSuggestions: [],
        crossCompanyPatterns: {
          successPatterns: [],
          failurePatterns: [],
          industryInsights: []
        }
      };
    }
  }

  /**
   * Save growth report to DB
   */
  async saveReport(analysis) {
    try {
      await pool.query(
        `INSERT INTO growth_reports (id, health_score, summary, analysis, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          crypto.randomUUID(),
          analysis.healthScore || 50,
          analysis.summary || '',
          JSON.stringify(analysis)
        ]
      );
      console.log(`[Growth Agent] Report saved — Health Score: ${analysis.healthScore}`);
    } catch (e) {
      // Table might not exist yet — create it
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS growth_reports (
            id UUID PRIMARY KEY,
            health_score INTEGER DEFAULT 50,
            summary TEXT,
            analysis JSONB,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        await pool.query(
          `INSERT INTO growth_reports (id, health_score, summary, analysis, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            crypto.randomUUID(),
            analysis.healthScore || 50,
            analysis.summary || '',
            JSON.stringify(analysis)
          ]
        );
      } catch (e2) {
        console.warn('[Growth Agent] Could not save report:', e2.message);
      }
    }
  }

  /**
   * Create actionable task from growth analysis
   */
  async createGrowthTask(action) {
    try {
      await pool.query(
        `INSERT INTO tasks (id, company_id, title, description, tag, priority, status, auto_created)
         VALUES ($1, NULL, $2, $3, $4, $5, 'todo', TRUE)`,
        [
          crypto.randomUUID(),
          `[Growth] ${action.title}`,
          `[Growth Agent Decision]\n\n${action.description}\n\nTipo: ${action.type}`,
          action.type === 'bug_fix' ? 'code' : 'data',
          action.priority || 'medium'
        ]
      );
      console.log(`[Growth Agent] Created task: ${action.title}`);
    } catch (e) {
      console.warn('[Growth Agent] Could not create task:', e.message);
    }
  }

  /**
   * Update Layer 3 memory with cross-company patterns
   */
  async updateCrossCompanyPatterns(metrics, analysis) {
    try {
      const MemorySystem = require('./memory-system');
      const memory = new MemorySystem(null);
      const patterns = analysis.crossCompanyPatterns || {};

      const layer3 = await memory.getLayer3();

      // Merge new patterns with existing ones
      const updatedPatterns = {
        ...layer3,
        lastGrowthAnalysis: new Date().toISOString(),
        healthScore: analysis.healthScore,
        successPatterns: [
          ...(layer3.successfulFeatures || []),
          ...(patterns.successPatterns || [])
        ].slice(-20), // Keep last 20
        failurePatterns: [
          ...(layer3.commonBugs || []),
          ...(patterns.failurePatterns || [])
        ].slice(-20),
        industryInsights: patterns.industryInsights || [],
        roadmapSuggestions: analysis.roadmapSuggestions || []
      };

      await memory.updateLayer3(updatedPatterns);
      console.log('[Growth Agent] Layer 3 memory updated with cross-company patterns');
    } catch (e) {
      console.warn('[Growth Agent] Could not update Layer 3:', e.message);
    }
  }

  /**
   * Manual trigger
   */
  async runNow() {
    return await this.runAnalysis();
  }

  stop() {
    this.isRunning = false;
    console.log('[Growth Agent] Stopped');
  }
}

module.exports = GrowthAgent;
