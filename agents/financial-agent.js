/**
 * Agente Financiero - Toma decisiones autónomas sobre costos y pricing
 */

const { pool } = require('../backend/db');
const { callLLM } = require('../backend/llm');

class FinancialAgent {
  constructor() {
    this.decisions = [];
    this.actions = [];
  }

  /**
   * Ejecutar análisis financiero y tomar decisiones
   */
  async execute() {
    console.log('\n💰 Financial Agent - Iniciando análisis...\n');

    try {
      // 1. Obtener datos financieros
      const financialData = await this.getFinancialData();
      
      // 2. Analizar situación
      const analysis = await this.analyzeFinancials(financialData);
      
      // 3. Tomar decisiones
      const decisions = await this.makeDecisions(analysis, financialData);
      
      // 4. Ejecutar acciones
      const actions = await this.executeActions(decisions);
      
      // 5. Reportar
      await this.reportResults(analysis, decisions, actions);

      return {
        success: true,
        analysis,
        decisions,
        actions
      };

    } catch (error) {
      console.error('❌ Error en Financial Agent:', error);
      throw error;
    }
  }

  /**
   * Obtener datos financieros actuales
   */
  async getFinancialData() {
    // MRR
    const mrrResult = await pool.query(
      `SELECT COUNT(*) as pro_users FROM users WHERE plan = 'pro' AND role != 'admin'`
    );
    const proUsers = parseInt(mrrResult.rows[0].pro_users || 0);
    const mrr = proUsers * 39;

    // Costos LLM (último mes)
    const costsResult = await pool.query(
      `SELECT SUM(estimated_cost) as total 
       FROM llm_usage 
       WHERE recorded_at > datetime('now', '-30 days')`
    );
    const llmCosts = parseFloat(costsResult.rows[0].total || 0);

    // Costos por empresa
    const perCompanyResult = await pool.query(
      `SELECT 
         c.id, c.name, u.plan,
         COALESCE(SUM(l.estimated_cost), 0) as cost
       FROM companies c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN llm_usage l ON c.id = l.company_id 
         AND l.recorded_at > datetime('now', '-30 days')
       GROUP BY c.id, c.name, u.plan
       HAVING cost > 0
       ORDER BY cost DESC`
    );

    const infraCosts = 60; // Fixed
    const totalCosts = llmCosts + infraCosts;
    const profit = mrr - totalCosts;
    const margin = mrr > 0 ? ((profit / mrr) * 100) : 0;

    return {
      mrr,
      proUsers,
      costs: {
        llm: llmCosts,
        infra: infraCosts,
        total: totalCosts
      },
      profit,
      margin,
      companies: perCompanyResult.rows.map(r => ({
        id: r.id,
        name: r.name,
        plan: r.plan,
        cost: parseFloat(r.cost),
        revenue: r.plan === 'pro' ? 39 : 0,
        profitable: r.plan === 'pro' ? (39 - parseFloat(r.cost)) > 0 : false
      }))
    };
  }

  /**
   * Analizar situación financiera con LLM
   */
  async analyzeFinancials(data) {
    const prompt = `Eres el agente financiero de Lanzalo, una plataforma SaaS.

DATOS ACTUALES:
- MRR: ${data.mrr}/mes (${data.proUsers} usuarios Pro @ $39/mes)
- Costos totales: ${data.costs.total}/mes (LLM: ${data.costs.llm}, Infra: ${data.costs.infra})
- Profit: ${data.profit}/mes
- Margen: ${data.margin.toFixed(2)}%

EMPRESAS PROBLEMÁTICAS:
${data.companies.filter(c => !c.profitable).slice(0, 5).map(c => 
  `- ${c.name} (${c.plan}): Costo ${c.cost}, Revenue ${c.revenue}, Loss: ${c.revenue - c.cost}`
).join('\n')}

ANALIZA:
1. ¿La situación es sostenible?
2. ¿Cuáles son los mayores problemas?
3. ¿Qué riesgos existen?
4. ¿Qué oportunidades hay?

Responde en JSON:
{
  "status": "healthy|warning|critical",
  "summary": "resumen de 1-2 líneas",
  "problems": ["problema1", "problema2"],
  "risks": ["riesgo1", "riesgo2"],
  "opportunities": ["oportunidad1", "oportunidad2"]
}`;

    const result = await callLLM(prompt, {
      companyId: null,
      taskType: 'analytics'
    });

    return JSON.parse(result.content);
  }

  /**
   * Tomar decisiones basadas en análisis
   */
  async makeDecisions(analysis, data) {
    const decisions = [];

    // DECISIÓN 1: Pricing
    if (data.margin < 30) {
      decisions.push({
        type: 'pricing',
        action: 'increase_price',
        from: 39,
        to: 49,
        reason: `Margen muy bajo (${data.margin.toFixed(2)}%). Aumentar precio mejorará rentabilidad.`,
        priority: 'high',
        autoExecute: false // Requiere aprobación
      });
    } else if (data.margin > 70) {
      decisions.push({
        type: 'pricing',
        action: 'decrease_price',
        from: 39,
        to: 29,
        reason: `Margen muy alto (${data.margin.toFixed(2)}%). Reducir precio puede atraer más usuarios.`,
        priority: 'low',
        autoExecute: false
      });
    }

    // DECISIÓN 2: Empresas no rentables
    const unprofitable = data.companies.filter(c => !c.profitable && c.cost > 5);
    
    for (const company of unprofitable) {
      if (company.plan === 'free' && company.cost > 10) {
        decisions.push({
          type: 'company_action',
          action: 'force_upgrade',
          companyId: company.id,
          companyName: company.name,
          reason: `Plan FREE gastando ${company.cost}/mes. Forzar upgrade a Pro.`,
          priority: 'high',
          autoExecute: true
        });
      } else if (company.plan === 'free' && company.cost > 5) {
        decisions.push({
          type: 'company_action',
          action: 'limit_quotas',
          companyId: company.id,
          companyName: company.name,
          reason: `Plan FREE gastando ${company.cost}/mes. Limitar quotas.`,
          priority: 'medium',
          autoExecute: true
        });
      } else if (company.plan === 'pro' && company.cost > 50) {
        decisions.push({
          type: 'company_action',
          action: 'use_cheaper_models',
          companyId: company.id,
          companyName: company.name,
          reason: `Usuario Pro gastando ${company.cost}/mes (pérdida: ${company.cost - 39}). Cambiar a modelos baratos.`,
          priority: 'high',
          autoExecute: true
        });
      }
    }

    // DECISIÓN 3: Optimización de costos
    if (data.costs.llm > data.mrr * 0.5) {
      decisions.push({
        type: 'cost_optimization',
        action: 'switch_to_cheaper_models',
        reason: `Costos LLM (${data.costs.llm}) > 50% del MRR. Usar modelos más baratos globalmente.`,
        priority: 'high',
        autoExecute: false
      });
    }

    // DECISIÓN 4: Growth
    if (data.profit > 200 && data.margin > 50) {
      decisions.push({
        type: 'growth',
        action: 'invest_in_marketing',
        amount: Math.floor(data.profit * 0.3),
        reason: `Profit saludable (${data.profit}). Invertir 30% en adquirir usuarios.`,
        priority: 'medium',
        autoExecute: false
      });
    }

    // DECISIÓN 5: Break-even
    const breakEvenUsers = Math.ceil(data.costs.total / 39);
    if (data.proUsers < breakEvenUsers) {
      decisions.push({
        type: 'alert',
        action: 'acquire_users',
        usersNeeded: breakEvenUsers - data.proUsers,
        reason: `Necesitas ${breakEvenUsers - data.proUsers} usuarios más para break-even.`,
        priority: 'critical',
        autoExecute: false
      });
    }

    return decisions;
  }

  /**
   * Ejecutar acciones automáticas
   */
  async executeActions(decisions) {
    const actions = [];

    for (const decision of decisions) {
      if (!decision.autoExecute) {
        actions.push({
          decision,
          executed: false,
          reason: 'Requiere aprobación manual'
        });
        continue;
      }

      try {
        let result;

        switch (decision.action) {
          case 'force_upgrade':
            result = await this.forceUpgrade(decision.companyId);
            break;

          case 'limit_quotas':
            result = await this.limitQuotas(decision.companyId);
            break;

          case 'use_cheaper_models':
            result = await this.useCheaperModels(decision.companyId);
            break;

          default:
            result = { success: false, reason: 'Acción no implementada' };
        }

        actions.push({
          decision,
          executed: result.success,
          result
        });

      } catch (error) {
        actions.push({
          decision,
          executed: false,
          error: error.message
        });
      }
    }

    return actions;
  }

  /**
   * Acciones específicas
   */
  async forceUpgrade(companyId) {
    // Pausar empresa y notificar al dueño
    await pool.query(
      `UPDATE companies SET status = 'paused' WHERE id = $10`,
      [companyId]
    );

    // TODO: Enviar email al dueño solicitando upgrade

    return {
      success: true,
      message: 'Empresa pausada. Email de upgrade enviado.'
    };
  }

  async limitQuotas(companyId) {
    // Reducir quotas a la mitad
    await pool.query(
      `INSERT INTO company_settings (company_id, cost_limit_daily, enabled)
       VALUES ($1, 2.0, 1)
       ON CONFLICT(company_id) DO UPDATE SET cost_limit_daily = 2.0`,
      [companyId]
    );

    return {
      success: true,
      message: 'Quotas limitadas a $2/día'
    };
  }

  async useCheaperModels(companyId) {
    // Forzar uso de Haiku (modelo más barato)
    await pool.query(
      `INSERT INTO company_settings (company_id, model_override, enabled)
       VALUES ($1, 'anthropic/claude-haiku-3', 1)
       ON CONFLICT(company_id) DO UPDATE SET model_override = 'anthropic/claude-haiku-3'`,
      [companyId]
    );

    return {
      success: true,
      message: 'Modelo cambiado a Claude Haiku (más barato)'
    };
  }

  /**
   * Reportar resultados
   */
  async reportResults(analysis, decisions, actions) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 FINANCIAL AGENT - REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📊 STATUS: ${analysis.status.toUpperCase()}`);
    console.log(`📝 ${analysis.summary}\n`);

    if (analysis.problems.length > 0) {
      console.log('⚠️  PROBLEMAS DETECTADOS:');
      analysis.problems.forEach(p => console.log(`   - ${p}`));
      console.log('');
    }

    console.log(`🎯 DECISIONES TOMADAS: ${decisions.length}`);
    decisions.forEach((d, i) => {
      const icon = d.priority === 'critical' ? '🚨' : d.priority === 'high' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} ${i + 1}. [${d.type}] ${d.action}`);
      console.log(`      ${d.reason}`);
      console.log(`      Auto: ${d.autoExecute ? 'SÍ' : 'NO (requiere aprobación)'}`);
    });
    console.log('');

    const executed = actions.filter(a => a.executed);
    console.log(`✅ ACCIONES EJECUTADAS: ${executed.length}/${actions.length}`);
    executed.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.decision.action} (${a.decision.companyName})`);
      console.log(`      → ${a.result.message}`);
    });
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Guardar en DB para audit
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, details)
       VALUES ('financial-agent', 'financial_analysis', 'platform', $1)`,
      [JSON.stringify({ analysis, decisions: decisions.length, actions: executed.length })]
    );
  }
}

module.exports = FinancialAgent;
