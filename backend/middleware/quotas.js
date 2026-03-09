/**
 * Sistema de Quotas y Rate Limiting
 * Previene abuso y controla costos
 */

const { pool } = require('../db');

// Definición de planes
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    quotas: {
      tasksPerDay: 3,
      llmTokensPerMonth: 50000,      // ~$0.75
      emailsPerDay: 5,
      tweetsPerDay: 2,
      deploymentsPerMonth: 3
    }
  },
  trial: {
    name: 'Trial',
    price: 0,
    quotas: {
      tasksPerDay: 10,
      llmTokensPerMonth: 500000,     // ~$7.50 — generous for trial users
      emailsPerDay: 10,
      tweetsPerDay: 5,
      deploymentsPerMonth: 20
    }
  },
  pro: {
    name: 'Pro',
    price: 39,
    quotas: {
      tasksPerDay: 50,
      llmTokensPerMonth: 2000000,    // ~$30
      emailsPerDay: 50,
      tweetsPerDay: 10,
      deploymentsPerMonth: 100
    }
  }
};

/**
 * Middleware para verificar quotas antes de ejecutar acción
 */
async function checkQuota(req, res, next) {
  try {
    const { companyId } = req;
    const actionType = req.body.action_type || 'task';

    // Si no hay companyId (ej: crear empresa), verificar quota a nivel usuario
    if (!companyId) {
      const userPlan = req.user?.plan || req.user?.subscription_tier || 'trial';
      const plan = PLANS[userPlan] || PLANS.free;
      req.quota = { plan: plan.name, usage: 0, limit: 999, remaining: 999 };
      return next();
    }

    const company = await getCompany(companyId);
    const plan = PLANS[company.subscription_tier] || PLANS.free;
    
    // Verificar quota específica según el tipo de acción
    const quotaKey = getQuotaKey(actionType);
    const usage = await getUsage(companyId, quotaKey);
    const limit = plan.quotas[quotaKey];
    
    if (usage >= limit) {
      return res.status(429).json({
        error: 'Cuota excedida',
        message: `Has alcanzado el límite de ${limit} ${quotaKey} para tu plan ${plan.name}`,
        usage,
        limit,
        plan: plan.name,
        upgradeUrl: '/upgrade'
      });
    }
    
    // Adjuntar info de quota al request
    req.quota = {
      plan: plan.name,
      usage,
      limit,
      remaining: limit - usage
    };
    
    next();
  } catch (error) {
    console.error('Error verificando quota:', error);
    res.status(500).json({ error: 'Error verificando límites' });
  }
}

/**
 * Incrementar contador de uso después de acción exitosa
 */
async function incrementUsage(companyId, quotaType, amount = 1) {
  const period = getPeriod(quotaType);
  const key = `${companyId}:${quotaType}:${period}`;
  
  await pool.query(
    `INSERT INTO usage_tracking (company_id, quota_type, period, amount, recorded_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (company_id, quota_type, period) 
     DO UPDATE SET amount = usage_tracking.amount + $4`,
    [companyId, quotaType, period, amount]
  );
}

/**
 * Obtener uso actual de una quota
 */
async function getUsage(companyId, quotaType) {
  const period = getPeriod(quotaType);
  
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM usage_tracking
     WHERE company_id = $1 AND quota_type = $2 AND period = $3`,
    [companyId, quotaType, period]
  );
  
  return parseInt(result.rows[0].total);
}

/**
 * Obtener período actual (día o mes)
 */
function getPeriod(quotaType) {
  const now = new Date();
  
  if (quotaType.includes('PerDay')) {
    // Formato: YYYY-MM-DD
    return now.toISOString().split('T')[0];
  } else {
    // Formato: YYYY-MM
    return now.toISOString().substring(0, 7);
  }
}

/**
 * Mapear tipo de acción a clave de quota
 */
function getQuotaKey(actionType) {
  const mapping = {
    'task': 'tasksPerDay',
    'llm': 'llmTokensPerMonth',
    'email': 'emailsPerDay',
    'tweet': 'tweetsPerDay',
    'deploy': 'deploymentsPerMonth'
  };
  
  return mapping[actionType] || 'tasksPerDay';
}

/**
 * Obtener información de la empresa
 */
async function getCompany(companyId) {
  const result = await pool.query(
    'SELECT * FROM companies WHERE id = $1',
    [companyId]
  );
  return result.rows[0];
}

/**
 * Tracker de costos LLM
 */
class LLMCostTracker {
  constructor(companyId) {
    this.companyId = companyId;
  }

  /**
   * Registrar uso de tokens y costo
   */
  async recordUsage(model, tokensUsed, estimatedCost) {
    await pool.query(
      `INSERT INTO llm_usage (company_id, model, tokens_used, estimated_cost, recorded_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [this.companyId, model, tokensUsed, estimatedCost]
    );

    // Incrementar contador de quota
    await incrementUsage(this.companyId, 'llmTokensPerMonth', tokensUsed);
  }

  /**
   * Verificar si está dentro del presupuesto
   */
  async isWithinBudget() {
    const company = await getCompany(this.companyId);
    const plan = PLANS[company.subscription_tier] || PLANS.free;
    
    const usage = await getUsage(this.companyId, 'llmTokensPerMonth');
    return usage < plan.quotas.llmTokensPerMonth;
  }

  /**
   * Obtener uso total del mes
   */
  async getMonthlyUsage() {
    const period = getPeriod('llmTokensPerMonth');
    
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COALESCE(SUM(estimated_cost), 0) as total_cost
       FROM llm_usage
       WHERE company_id = $1 
       AND DATE_TRUNC('month', recorded_at) = $2::date`,
      [this.companyId, period + '-01']
    );
    
    return result.rows[0];
  }
}

module.exports = {
  PLANS,
  checkQuota,
  incrementUsage,
  getUsage,
  LLMCostTracker
};
