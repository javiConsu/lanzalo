/**
 * Data Agent Executor - Analytics, SQL queries, business intelligence
 */

const TaskExecutor = require('../task-executor');
const { callLLM } = require('../../backend/llm');
const { pool } = require('../../backend/db');
const crypto = require('crypto');

class DataExecutor extends TaskExecutor {
  constructor() {
    super('data-agent', 'Data Agent');
  }

  /**
   * Ejecutar tarea de data/analytics
   */
  async execute(task) {
    console.log(`📊 Data Agent procesando: ${task.title}`);

    // Obtener info de la empresa
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [task.company_id]
    );
    const company = companyResult.rows[0];

    // Determinar tipo de análisis
    const analysisType = this.determineAnalysisType(task);

    let result;
    switch (analysisType) {
      case 'sql':
        result = await this.executeSQLQuery(task, company);
        break;
      case 'metrics':
        result = await this.calculateMetrics(task, company);
        break;
      case 'report':
        result = await this.generateReport(task, company);
        break;
      case 'dashboard':
        result = await this.buildDashboard(task, company);
        break;
      case 'analysis':
        result = await this.analyzeData(task, company);
        break;
      default:
        result = await this.intelligentAnalysis(task, company);
    }

    // Crear reporte con resultados
    const reportId = await this.createDataReport(task, result);

    return {
      ...result,
      reportId
    };
  }

  /**
   * Determinar tipo de análisis
   */
  determineAnalysisType(task) {
    const desc = task.description.toLowerCase();
    
    if (desc.includes('sql') || desc.includes('query') || desc.includes('consulta')) {
      return 'sql';
    }
    
    if (desc.includes('metric') || desc.includes('métrica') || desc.includes('kpi')) {
      return 'metrics';
    }
    
    if (desc.includes('report') || desc.includes('reporte') || desc.includes('informe')) {
      return 'report';
    }
    
    if (desc.includes('dashboard')) {
      return 'dashboard';
    }
    
    if (desc.includes('analiz') || desc.includes('trend') || desc.includes('pattern')) {
      return 'analysis';
    }
    
    return 'intelligent';
  }

  /**
   * Ejecutar SQL query
   */
  async executeSQLQuery(task, company) {
    console.log('🔍 Generando SQL query...');

    // Cargar schema de la DB
    const schema = await this.getDatabaseSchema();

    // Generar query con LLM
    const query = await this.generateSQL(task, company, schema);

    console.log(`📝 Query generada:\n${query}`);

    try {
      // Ejecutar query
      const result = await pool.query(query);

      console.log(`✅ Query ejecutada: ${result.rows.length} filas`);

      // Analizar resultados con LLM
      const analysis = await this.analyzeQueryResults(task, query, result.rows);

      return {
        summary: `Query ejecutada: ${result.rows.length} resultados`,
        query,
        rowCount: result.rows.length,
        data: result.rows.slice(0, 100), // Primeras 100 filas
        analysis
      };

    } catch (error) {
      console.error('❌ Error ejecutando query:', error.message);
      throw new Error(`SQL Error: ${error.message}`);
    }
  }

  /**
   * Obtener schema de la base de datos
   */
  async getDatabaseSchema() {
    const result = await pool.query(`
      SELECT 
        m.name as table_name,
        p.name as column_name,
        p.type as column_type
      FROM sqlite_master m
      JOIN pragma_table_info(m.name) p
      WHERE m.type = 'table'
      AND m.name NOT LIKE 'sqlite_%'
      ORDER BY m.name, p.cid
    `);

    // Agrupar por tabla
    const schema = {};
    for (const row of result.rows) {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push({
        name: row.column_name,
        type: row.column_type
      });
    }

    return schema;
  }

  /**
   * Generar SQL query con LLM
   */
  async generateSQL(task, company, schema) {
    const schemaDescription = Object.entries(schema)
      .map(([table, columns]) => {
        const cols = columns.map(c => `  ${c.name} (${c.type})`).join('\n');
        return `${table}:\n${cols}`;
      })
      .join('\n\n');

    const prompt = `Eres un experto en SQL para SQLite.

DATABASE SCHEMA:
${schemaDescription}

EMPRESA: ${company.name} (company_id = '${company.id}')

TAREA: ${task.title}
DESCRIPCIÓN: ${task.description}

REGLAS:
- Genera SOLO el SQL query (sin explicaciones)
- SQLite syntax
- Usar company_id = '${company.id}' para filtrar
- Usar LIMIT para queries grandes
- Probar antes de usar en producción

GENERA EL QUERY:`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'data',
      temperature: 0.2
    });

    // Limpiar respuesta (remover markdown, explicaciones, etc.)
    let query = response.content.trim();
    
    // Remover markdown code blocks
    query = query.replace(/```sql\n/g, '').replace(/```\n/g, '').replace(/```/g, '');
    
    // Tomar solo la primera query si hay múltiples
    if (query.includes(';')) {
      query = query.split(';')[0] + ';';
    }

    return query.trim();
  }

  /**
   * Analizar resultados de query con LLM
   */
  async analyzeQueryResults(task, query, rows) {
    if (rows.length === 0) {
      return 'No se encontraron resultados.';
    }

    const sample = rows.slice(0, 10);
    
    const prompt = `Analiza estos resultados de SQL:

QUERY:
${query}

RESULTADOS (${rows.length} filas, mostrando primeras 10):
${JSON.stringify(sample, null, 2)}

TAREA ORIGINAL: ${task.description}

Responde en 2-3 frases:
- Qué muestran los datos
- Insights clave
- Recomendaciones (si aplica)`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'simple',
      temperature: 0.5
    });

    return response.content;
  }

  /**
   * Calcular métricas
   */
  async calculateMetrics(task, company) {
    console.log('📊 Calculando métricas...');

    // Métricas disponibles según lo que tengamos en DB
    const metrics = {};

    // 1. Tareas
    const tasksResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as pending
      FROM tasks
      WHERE company_id = $1
    `, [company.id]);

    metrics.tasks = tasksResult.rows[0];

    // 2. Tweets
    const tweetsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN published THEN 1 ELSE 0 END) as published
      FROM tweets
      WHERE company_id = $1
    `, [company.id]);

    metrics.tweets = tweetsResult.rows[0];

    // 3. Emails
    const emailsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN sent THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN opened THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN clicked THEN 1 ELSE 0 END) as clicked
      FROM emails
      WHERE company_id = $1
    `, [company.id]);

    metrics.emails = emailsResult.rows[0];

    // 4. Reportes
    const reportsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        type,
        COUNT(*) as count
      FROM reports
      WHERE company_id = $1
      GROUP BY type
    `, [company.id]);

    metrics.reports = {
      total: reportsResult.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
      byType: reportsResult.rows
    };

    // 5. Memoria (features implementadas)
    const memoryResult = await pool.query(`
      SELECT content
      FROM memory
      WHERE company_id = $1 AND layer = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `, [company.id]);

    if (memoryResult.rows.length > 0) {
      const layer1 = JSON.parse(memoryResult.rows[0].content);
      metrics.features = {
        total: layer1.keyFeatures?.length || 0,
        list: layer1.keyFeatures || []
      };
    }

    // Análisis de métricas
    const analysis = await this.analyzeMetrics(task, metrics);

    return {
      summary: 'Métricas calculadas',
      metrics,
      analysis,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Analizar métricas con LLM
   */
  async analyzeMetrics(task, metrics) {
    const prompt = `Analiza estas métricas:

${JSON.stringify(metrics, null, 2)}

CONTEXTO: ${task.description}

Proporciona:
1. Resumen ejecutivo (2-3 bullets)
2. Insights clave
3. Áreas de mejora
4. Recomendaciones accionables`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'data',
      temperature: 0.5
    });

    return response.content;
  }

  /**
   * Generar reporte completo
   */
  async generateReport(task, company) {
    console.log('📊 Generando reporte...');

    // Obtener todas las métricas
    const metricsResult = await this.calculateMetrics(task, company);

    // Generar reporte estructurado con LLM
    const report = await this.formatReport(task, company, metricsResult);

    return {
      summary: 'Reporte generado',
      type: 'business_intelligence',
      ...report
    };
  }

  /**
   * Formatear reporte con LLM
   */
  async formatReport(task, company, data) {
    const prompt = `Genera un reporte de business intelligence:

EMPRESA: ${company.name}
TAREA: ${task.description}

DATOS:
${JSON.stringify(data.metrics, null, 2)}

FORMATO MARKDOWN:

# Reporte: [Título]

## Resumen Ejecutivo
- Bullet 1
- Bullet 2
- Bullet 3

## Métricas Clave
[Tabla o lista de métricas importantes]

## Análisis
[Insights y patrones detectados]

## Tendencias
[Si hay datos históricos]

## Recomendaciones
1. Acción 1
2. Acción 2
3. Acción 3

## Próximos Pasos
[Qué hacer a continuación]

GENERA EL REPORTE:`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'data',
      temperature: 0.6
    });

    return {
      content: response.content,
      format: 'markdown',
      metrics: data.metrics
    };
  }

  /**
   * Build dashboard data
   */
  async buildDashboard(task, company) {
    console.log('📊 Construyendo dashboard...');

    // Obtener métricas para dashboard
    const metricsResult = await this.calculateMetrics(task, company);

    // Dashboard data structure
    const dashboard = {
      title: `Dashboard: ${company.name}`,
      widgets: [
        {
          type: 'stat',
          title: 'Tareas Completadas',
          value: metricsResult.metrics.tasks.completed,
          total: metricsResult.metrics.tasks.total,
          percentage: Math.round((metricsResult.metrics.tasks.completed / metricsResult.metrics.tasks.total) * 100) || 0
        },
        {
          type: 'stat',
          title: 'Emails Enviados',
          value: metricsResult.metrics.emails.sent,
          total: metricsResult.metrics.emails.total
        },
        {
          type: 'stat',
          title: 'Tweets Generados',
          value: metricsResult.metrics.tweets.total
        },
        {
          type: 'list',
          title: 'Features Implementadas',
          items: metricsResult.metrics.features?.list || []
        }
      ],
      metrics: metricsResult.metrics,
      generatedAt: new Date().toISOString()
    };

    return {
      summary: 'Dashboard construido',
      dashboard
    };
  }

  /**
   * Análisis inteligente (decidir con LLM)
   */
  async analyzeData(task, company) {
    console.log('🤖 Análisis inteligente...');

    // Obtener datos relevantes
    const metricsResult = await this.calculateMetrics(task, company);

    // Análisis profundo con LLM
    const prompt = `Eres un analista de datos para ${company.name}.

TAREA: ${task.description}

DATOS DISPONIBLES:
${JSON.stringify(metricsResult.metrics, null, 2)}

Realiza un análisis profundo:
1. Identifica patrones
2. Detecta anomalías
3. Proporciona insights accionables
4. Sugiere métricas adicionales a trackear

Formato: Markdown estructurado`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'data',
      temperature: 0.6
    });

    return {
      summary: 'Análisis de datos completado',
      analysis: response.content,
      metrics: metricsResult.metrics
    };
  }

  /**
   * Análisis inteligente (cuando no es claro)
   */
  async intelligentAnalysis(task, company) {
    // Decidir qué tipo de análisis hacer
    const metricsResult = await this.calculateMetrics(task, company);

    return {
      summary: 'Análisis completado',
      metrics: metricsResult.metrics,
      analysis: metricsResult.analysis
    };
  }

  /**
   * Crear reporte de data
   */
  async createDataReport(task, result) {
    const reportId = crypto.randomUUID();

    const content = `# Data Analysis Report

## Summary
${result.summary}

## Metrics
${JSON.stringify(result.metrics || {}, null, 2)}

## Analysis
${result.analysis || 'No analysis available'}

---

Generated: ${new Date().toISOString()}
`;

    await pool.query(
      `INSERT INTO reports (id, company_id, task_id, type, title, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [reportId, task.company_id, task.id, 'data_analysis', task.title, content]
    );

    console.log(`📊 Reporte de data guardado: ${reportId}`);

    return reportId;
  }

  /**
   * Override formatResult
   */
  formatResult(result) {
    if (result.query) {
      // SQL query result
      return `📊 Query ejecutada

${result.query}

Resultados: ${result.rowCount} filas

Análisis:
${result.analysis}

Reporte completo: ${result.reportId}`;
    }

    if (result.dashboard) {
      // Dashboard result
      return `📊 Dashboard construido

Widgets: ${result.dashboard.widgets.length}

Métricas:
- Tareas: ${result.dashboard.metrics.tasks.completed}/${result.dashboard.metrics.tasks.total}
- Emails: ${result.dashboard.metrics.emails.sent}/${result.dashboard.metrics.emails.total}
- Tweets: ${result.dashboard.metrics.tweets.total}

Ver reporte: ${result.reportId}`;
    }

    if (result.metrics) {
      // Metrics result
      return `📊 Métricas calculadas

Tareas: ${result.metrics.tasks.completed}/${result.metrics.tasks.total} completadas
Emails: ${result.metrics.emails.sent} enviados (${result.metrics.emails.opened} abiertos)
Tweets: ${result.metrics.tweets.total} generados
Features: ${result.metrics.features?.total || 0}

${result.analysis}

Ver reporte completo: ${result.reportId}`;
    }

    return result.summary || JSON.stringify(result, null, 2);
  }
}

module.exports = DataExecutor;
