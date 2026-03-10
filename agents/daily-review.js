/**
 * Daily Review System - T-MORNING y T-EVENING
 * Revisión matutina (9:00 AM UTC) y nocturna (6:00 PM UTC)
 */

const cron = require('node-cron');
const { getActiveCompanies, logActivity } = require('../backend/db');
const { callLLM } = require('../backend/llm');

class DailyReviewSystem {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start daily review system
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Daily Review System already running');
      return;
    }

    console.log('🌅 Lanzalo Daily Review System started');
    this.isRunning = true;

    // T-MORNING: 9:00 AM UTC - Revisión matutina
    cron.schedule('0 9 * * *', async () => {
      await this.runMorningReview();
    });

    // T-EVENING: 6:00 PM UTC - Revisión nocturna
    cron.schedule('0 18 * * *', async () => {
      await this.runEveningReview();
    });

    console.log('✅ Daily reviews scheduled:');
    console.log('   - T-MORNING: 9:00 AM UTC');
    console.log('   - T-EVENING: 6:00 PM UTC');
  }

  /**
   * T-MORNING - Revisión matutina
   */
  async runMorningReview() {
    console.log('🌅 T-MORNING - Revisión matutina iniciada');
    
    try {
      const companies = await getActiveCompanies();
      console.log(`📊 Procesando ${companies.length} empresas`);

      for (const company of companies) {
        await this.runCompanyMorningReview(company);
      }

      console.log('✅ T-MORNING completada');
    } catch (error) {
      console.error('❌ T-MORNING failed:', error);
    }
  }

  /**
   * Revisión matutina para una empresa
   */
  async runCompanyMorningReview(company) {
    console.log(`\n🏢 T-MORNING para: ${company.name}`);
    
    try {
      await logActivity(company.id, null, 'morning_review_start',
        `Starting morning review for ${company.name}`);

      // 1. Revisar métricas de ayer
      const metrics = await this.getMetrics(company.id, 'yesterday');
      
      // 2. Revisar campañas de marketing
      const campaigns = await this.getCampaigns(company.id);
      
      // 3. Identificar cuellos de botella
      const bottlenecks = await this.identifyBottlenecks(metrics, campaigns);
      
      // 4. Crear 2-3 tareas de mejora
      const improvementTasks = await this.createImprovementTasks(company.id, bottlenecks);

      // 5. Guardar reporte matutino
      const report = {
        company_id: company.id,
        type: 'morning',
        metrics,
        campaigns,
        bottlenecks,
        improvementTasks,
        created_at: new Date()
      };

      await this.saveReport(report);

      await logActivity(company.id, null, 'morning_review_complete',
        `Morning review complete for ${company.name}. Tasks created: ${improvementTasks.length}`);

      return report;
    } catch (error) {
      console.error(`❌ T-MORNING failed for ${company.name}:`, error);
      throw error;
    }
  }

  /**
   * T-EVENING - Revisión nocturna
   */
  async runEveningReview() {
    console.log('🌙 T-EVENING - Revisión nocturna iniciada');
    
    try {
      const companies = await getActiveCompanies();
      console.log(`📊 Procesando ${companies.length} empresas`);

      for (const company of companies) {
        await this.runCompanyEveningReview(company);
      }

      console.log('✅ T-EVENING completada');
    } catch (error) {
      console.error('❌ T-EVENING failed:', error);
    }
  }

  /**
   * Revisión nocturna para una empresa
   */
  async runCompanyEveningReview(company) {
    console.log(`\n🏢 T-EVENING para: ${company.name}`);
    
    try {
      await logActivity(company.id, null, 'evening_review_start',
        `Starting evening review for ${company.name}`);

      // 1. Revisar progreso del día
      const progress = await this.getDailyProgress(company.id);
      
      // 2. Revisar campañas del día
      const campaigns = await this.getDailyCampaigns(company.id);
      
      // 3. Verificar funnel
      const funnel = await this.verifyFunnel(company.id);
      
      // 4. Detectar bugs críticos
      const bugs = await this.detectCriticalBugs(company.id, funnel);

      // 5. Guardar reporte nocturno
      const report = {
        company_id: company.id,
        type: 'evening',
        progress,
        campaigns,
        funnel,
        bugs,
        created_at: new Date()
      };

      await this.saveReport(report);

      // 6. Crear hotfix tickets si es necesario
      if (bugs.length > 0) {
        await this.createHotfixTickets(company.id, bugs);
      }

      await logActivity(company.id, null, 'evening_review_complete',
        `Evening review complete for ${company.name}. Bugs detected: ${bugs.length}`);

      return report;
    } catch (error) {
      console.error(`❌ T-EVENING failed for ${company.name}:`, error);
      throw error;
    }
  }

  /**
   * Obtener métricas
   */
  async getMetrics(companyId, period) {
    const { pool } = require('../backend/db');
    
    try {
      const result = await pool.query(`
        SELECT
          COUNT(DISTINCT user_id) as visits,
          COUNT(DISTINCT id) as leads,
          COUNT(DISTINCT id) FILTER (WHERE onboarding_completed = true) as onboarding,
          COUNT(DISTINCT id) as businesses_created,
          COUNT(DISTINCT id) FILTER (WHERE is_trial_active = true) as trial_active,
          COUNT(DISTINCT id) FILTER (WHERE is_trial_expired = true) as trial_expired,
          COUNT(DISTINCT id) FILTER (WHERE is_pro = true) as payments
        FROM users
        WHERE company_id = $1
          AND created_at >= NOW() - INTERVAL '1 day'
      `, [companyId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting metrics:', error);
      return {};
    }
  }

  /**
   * Obtener campañas de marketing
   */
  async getCampaigns(companyId) {
    const { pool } = require('../backend/db');
    
    try {
      const result = await pool.query(`
        SELECT
          'twitter' as platform,
          COUNT(*) as posts,
          AVG(engagement_rate) as avg_engagement,
          SUM(clicks) as total_clicks
        FROM tweets
        WHERE company_id = $1
          AND created_at >= NOW() - INTERVAL '1 day'
        
        UNION ALL
        
        SELECT
          'meta_ads' as platform,
          COUNT(*) as ads,
          AVG(ctr) as avg_ctr,
          AVG(cpc) as avg_cpc
        FROM meta_ads
        WHERE company_id = $1
          AND created_at >= NOW() - INTERVAL '1 day'
        
        UNION ALL
        
        SELECT
          'cold_outreach' as platform,
          COUNT(*) as emails,
          AVG(open_rate) as avg_open_rate,
          AVG(reply_rate) as avg_reply_rate
        FROM cold_emails
        WHERE company_id = $1
          AND sent_at >= NOW() - INTERVAL '1 day'
      `, [companyId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting campaigns:', error);
      return [];
    }
  }

  /**
   * Identificar cuellos de botella
   */
  async identifyBottlenecks(metrics, campaigns) {
    const bottlenecks = [];

    // Twitter engagement rate bajo
    const twitter = campaigns.find(c => c.platform === 'twitter');
    if (twitter && twitter.avg_engagement < 1) {
      bottlenecks.push({
        type: 'twitter_engagement',
        severity: 'medium',
        description: 'Twitter engagement rate < 1%',
        metric: twitter.avg_engagement,
        target: '> 1%'
      });
    }

    // Meta Ads CTR bajo
    const metaAds = campaigns.find(c => c.platform === 'meta_ads');
    if (metaAds && metaAds.avg_ctr < 0.5) {
      bottlenecks.push({
        type: 'meta_ads_ctr',
        severity: 'high',
        description: 'Meta Ads CTR < 0.5%',
        metric: metaAds.avg_ctr,
        target: '> 0.5%'
      });
    }

    // Cold Outreach open rate bajo
    const coldOutreach = campaigns.find(c => c.platform === 'cold_outreach');
    if (coldOutreach && coldOutreach.avg_open_rate < 20) {
      bottlenecks.push({
        type: 'cold_outreach_open_rate',
        severity: 'medium',
        description: 'Cold Outreach open rate < 20%',
        metric: coldOutreach.avg_open_rate,
        target: '> 20%'
      });
    }

    return bottlenecks;
  }

  /**
   * Crear tareas de mejora
   */
  async createImprovementTasks(companyId, bottlenecks) {
    const { pool } = require('../backend/db');
    const tasks = [];

    for (const bottleneck of bottlenecks) {
      const task = {
        company_id: companyId,
        title: this.generateTaskTitle(bottleneck),
        description: bottleneck.description,
        priority: this.mapSeverityToPriority(bottleneck.severity),
        type: 'improvement',
        status: 'pending',
        tag: this.getAgentTag(bottleneck.type),
        created_at: new Date()
      };

      const result = await pool.query(`
        INSERT INTO tasks (company_id, title, description, priority, type, status, tag, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        task.company_id,
        task.title,
        task.description,
        task.priority,
        task.type,
        task.status,
        task.tag,
        task.created_at
      ]);

      tasks.push(result.rows[0]);
    }

    return tasks;
  }

  /**
   * Generar título de tarea
   */
  generateTaskTitle(bottleneck) {
    const titles = {
      'twitter_engagement': 'Optimizar copy de tweets para aumentar engagement rate',
      'meta_ads_ctr': 'Optimizar creativos de Meta Ads para aumentar CTR',
      'cold_outreach_open_rate': 'Optimizar asuntos y preview de cold emails'
    };
    return titles[bottleneck.type] || 'Optimizar canal de marketing';
  }

  /**
   * Mapear severidad a prioridad
   */
  mapSeverityToPriority(severity) {
    const mapping = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return mapping[severity] || 'medium';
  }

  /**
   * Obtener tag de agente
   */
  getAgentTag(bottleneckType) {
    const tags = {
      'twitter_engagement': 'content',
      'meta_ads_ctr': 'content',
      'cold_outreach_open_rate': 'content'
    };
    return tags[bottleneckType] || 'engineering';
  }

  /**
   * Obtener progreso del día
   */
  async getDailyProgress(companyId) {
    const { pool } = require('../backend/db');
    
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed') as tasks_completed,
          COUNT(*) as total_tasks,
          COUNT(DISTINCT agent_tag) as agents_executed
        FROM tasks
        WHERE company_id = $1
          AND updated_at >= NOW() - INTERVAL '1 day'
      `, [companyId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting daily progress:', error);
      return {};
    }
  }

  /**
   * Obtener campañas del día
   */
  async getDailyCampaigns(companyId) {
    // Similar a getCampaigns pero con datos del día actual
    return this.getCampaigns(companyId);
  }

  /**
   * Verificar funnel
   */
  async verifyFunnel(companyId) {
    const { pool } = require('../backend/db');
    
    try {
      const result = await pool.query(`
        SELECT
          COUNT(DISTINCT webhook_events.id) as webhooks_firing,
          COUNT(DISTINCT users.id) FILTER (WHERE is_trial_active = true) as paywall_blocking,
          COUNT(DISTINCT sent_emails.id) as emails_delivered
        FROM webhook_events
        CROSS JOIN users
        CROSS JOIN sent_emails
        WHERE users.company_id = $1
          AND sent_emails.company_id = $1
          AND webhook_events.created_at >= NOW() - INTERVAL '1 day'
      `, [companyId]);

      return {
        webhooks_firing: result.rows[0].webhooks_firing > 0,
        paywall_blocking: result.rows[0].paywall_blocking > 0,
        emails_delivered: result.rows[0].emails_delivered > 0
      };
    } catch (error) {
      console.error('Error verifying funnel:', error);
      return {
        webhooks_firing: true,
        paywall_blocking: true,
        emails_delivered: true
      };
    }
  }

  /**
   * Detectar bugs críticos
   */
  async detectCriticalBugs(companyId, funnel) {
    const bugs = [];

    if (!funnel.webhooks_firing) {
      bugs.push({
        type: 'webhooks',
        severity: 'critical',
        description: 'Webhooks de Stripe no disparando correctamente'
      });
    }

    if (!funnel.paywall_blocking) {
      bugs.push({
        type: 'paywall',
        severity: 'critical',
        description: 'Paywall no bloqueando features correctamente'
      });
    }

    if (!funnel.emails_delivered) {
      bugs.push({
        type: 'emails',
        severity: 'high',
        description: 'Emails transaccionales no entregados'
      });
    }

    return bugs;
  }

  /**
   * Crear hotfix tickets
   */
  async createHotfixTickets(companyId, bugs) {
    const { pool } = require('../backend/db');
    
    for (const bug of bugs) {
      await pool.query(`
        INSERT INTO tasks (company_id, title, description, priority, type, status, tag, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        companyId,
        `Hotfix: ${bug.type}`,
        bug.description,
        this.mapSeverityToPriority(bug.severity),
        'hotfix',
        'pending',
        'engineering',
        new Date()
      ]);
    }
  }

  /**
   * Guardar reporte
   */
  async saveReport(report) {
    const { pool } = require('../backend/db');
    
    try {
      await pool.query(`
        INSERT INTO daily_reports (company_id, type, data, created_at)
        VALUES ($1, $2, $3, $4)
      `, [
        report.company_id,
        report.type,
        JSON.stringify(report),
        report.created_at
      ]);

      console.log(`✅ Reporte guardado: ${report.type} para empresa ${report.company_id}`);
    } catch (error) {
      console.error('Error saving report:', error);
    }
  }

  /**
   * Stop daily review system
   */
  stop() {
    console.log('🌅 Lanzalo Daily Review System stopped');
    this.isRunning = false;
  }
}

module.exports = new DailyReviewSystem();