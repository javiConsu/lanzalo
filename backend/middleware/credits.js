/**
 * Sistema de Créditos — Lanzalo
 * 
 * Trial (14 días): 5 créditos gratis
 * Pro ($39/mes): 20 créditos/mes (reseteo mensual, no acumulan)
 * Packs extra: 10cr/$9, 25cr/$19 (no expiran)
 * Pedir cambios: GRATIS siempre
 * 
 * Decisiones: 2026-03-08
 */

const { pool } = require('../db');

// Configuración de créditos por plan
const CREDIT_CONFIG = {
  trial: { initial: 50, monthly: 0 },  // Changed from 5 to 50 (Opción 3)
  pro:   { initial: 0, monthly: 20 },
  free:  { initial: 0, monthly: 0 }
};

// Coste en créditos por tipo de generación
const GENERATION_COSTS = {
  create_business:    1,  // Incluye análisis mercado + landing
  market_analysis:    1,
  landing_page:       1,
  email_sequence:     1,
  marketing_plan:     1,
  product_build:      1,
  seo_audit:          1,
  ad_creative:        1,
  change_request:     0,  // GRATIS siempre
  chat_message:       0   // GRATIS siempre
};

// Límites de tokens por tipo de generación (safety net)
const GENERATION_LIMITS = {
  create_business:   { maxOutputTokens: 6000, maxTurns: 5, maxCostCents: 50, model: 'claude-sonnet' },
  market_analysis:   { maxOutputTokens: 4000, maxTurns: 3, maxCostCents: 30, model: 'claude-sonnet' },
  landing_page:      { maxOutputTokens: 8000, maxTurns: 5, maxCostCents: 50, model: 'claude-sonnet' },
  email_sequence:    { maxOutputTokens: 3000, maxTurns: 3, maxCostCents: 20, model: 'gpt-4o-mini' },
  marketing_plan:    { maxOutputTokens: 3000, maxTurns: 3, maxCostCents: 20, model: 'gpt-4o-mini' },
  product_build:     { maxOutputTokens: 10000, maxTurns: 10, maxCostCents: 100, model: 'claude-sonnet' },
  seo_audit:         { maxOutputTokens: 2000, maxTurns: 2, maxCostCents: 15, model: 'gpt-4o-mini' },
  ad_creative:       { maxOutputTokens: 2000, maxTurns: 2, maxCostCents: 15, model: 'gpt-4o-mini' }
};

// Packs de créditos disponibles
const CREDIT_PACKS = [
  { id: 'pack_10', name: '10 créditos', credits: 10, priceCents: 900 },
  { id: 'pack_25', name: '25 créditos', credits: 25, priceCents: 1900 }
];

/**
 * Inicializar créditos para nuevo usuario
 */
async function initCredits(userId, plan = 'trial') {
  const config = CREDIT_CONFIG[plan] || CREDIT_CONFIG.trial;
  const initialCredits = config.initial;

  await pool.query(
    `INSERT INTO user_credits 
     (user_id, total_credits, monthly_credits, bonus_credits, credits_used, reset_date)
     VALUES ($1, $2, $3, 0, 0, NOW() + INTERVAL '30 days')
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, initialCredits, config.monthly]
  );

  // Registrar transacción
  if (initialCredits > 0) {
    await logTransaction(userId, initialCredits, initialCredits, 'trial_grant', 'account_creation', null);
  }

  return { totalCredits: initialCredits, plan };
}

/**
 * Obtener créditos actuales del usuario
 */
async function getCredits(userId) {
  const result = await pool.query(
    'SELECT * FROM user_credits WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    // Auto-inicializar si no existe
    await initCredits(userId, 'trial');
    return getCredits(userId);
  }

  const credits = result.rows[0];
  return {
    total: parseInt(credits.total_credits),
    monthly: parseInt(credits.monthly_credits),
    bonus: parseInt(credits.bonus_credits),
    used: parseInt(credits.credits_used),
    resetDate: credits.reset_date
  };
}

/**
 * Consumir créditos para una generación
 * Retorna { success, remaining } o { success: false, error }
 */
async function consumeCredit(userId, actionType, projectId = null) {
  const cost = GENERATION_COSTS[actionType];
  
  // Acciones gratuitas
  if (cost === 0 || cost === undefined) {
    return { success: true, cost: 0, remaining: (await getCredits(userId)).total };
  }

  // Verificar saldo
  const credits = await getCredits(userId);
  if (credits.total < cost) {
    return {
      success: false,
      error: 'Sin créditos suficientes',
      message: `Necesitas ${cost} crédito(s) pero tienes ${credits.total}. Compra un pack o suscríbete.`,
      current: credits.total,
      needed: cost
    };
  }

  // Descontar
  await pool.query(
    `UPDATE user_credits 
     SET total_credits = total_credits - $2, credits_used = credits_used + $2
     WHERE user_id = $1`,
    [userId, cost]
  );

  const newBalance = credits.total - cost;

  // Registrar transacción
  await logTransaction(userId, -cost, newBalance, 'consumption', actionType, projectId);

  return { success: true, cost, remaining: newBalance };
}

/**
 * Añadir créditos (compra de pack, renovación mensual, bonus)
 */
async function addCredits(userId, amount, type, metadata = null) {
  const credits = await getCredits(userId);
  const newBalance = credits.total + amount;

  if (type === 'monthly_grant') {
    // Renovación mensual: resetear a monthly, mantener bonus
    await pool.query(
      `UPDATE user_credits 
       SET total_credits = monthly_credits + bonus_credits, 
           reset_date = NOW() + INTERVAL '30 days'
       WHERE user_id = $1`,
      [userId]
    );
  } else if (type === 'pack_purchase') {
    // Pack: sumar a bonus (no expiran)
    await pool.query(
      `UPDATE user_credits 
       SET total_credits = total_credits + $2, bonus_credits = bonus_credits + $2
       WHERE user_id = $1`,
      [userId, amount]
    );
  } else {
    // Genérico (referral, refund, etc)
    await pool.query(
      `UPDATE user_credits SET total_credits = total_credits + $2 WHERE user_id = $1`,
      [userId, amount]
    );
  }

  await logTransaction(userId, amount, newBalance, type, null, null, metadata);
  return { success: true, newBalance };
}

/**
 * Activar plan Pro (desde webhook Stripe)
 */
async function activatePro(userId) {
  const config = CREDIT_CONFIG.pro;
  
  // Verificar si ya tiene registro
  const existing = await pool.query(
    'SELECT * FROM user_credits WHERE user_id = $1',
    [userId]
  );

  if (existing.rows.length === 0) {
    await initCredits(userId, 'pro');
  }

  // Setear créditos mensuales + sumar 20 al total
  await pool.query(
    `UPDATE user_credits 
     SET monthly_credits = $2, 
         total_credits = total_credits + $2,
         reset_date = NOW() + INTERVAL '30 days'
     WHERE user_id = $1`,
    [userId, config.monthly]
  );

  await logTransaction(userId, config.monthly, null, 'monthly_grant', 'pro_activation', null);
}

/**
 * Renovar créditos mensuales (desde webhook Stripe invoice.paid)
 */
async function renewMonthly(userId) {
  const result = await pool.query(
    'SELECT bonus_credits, monthly_credits FROM user_credits WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) return;

  const { bonus_credits, monthly_credits } = result.rows[0];
  const newTotal = parseInt(monthly_credits) + parseInt(bonus_credits);

  await pool.query(
    `UPDATE user_credits 
     SET total_credits = $2, reset_date = NOW() + INTERVAL '30 days'
     WHERE user_id = $1`,
    [userId, newTotal]
  );

  await logTransaction(userId, parseInt(monthly_credits), newTotal, 'monthly_grant', 'monthly_renewal', null);
}

/**
 * Registrar transacción de créditos
 */
async function logTransaction(userId, amount, balanceAfter, type, action, projectId, metadata = null) {
  await pool.query(
    `INSERT INTO credit_transactions 
     (user_id, amount, balance_after, type, action, project_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [userId, amount, balanceAfter, type, action, projectId, metadata ? JSON.stringify(metadata) : null]
  );
}

/**
 * Middleware: verificar créditos antes de generación
 * Uso: router.post('/generate', checkCredits('landing_page'), handler)
 */
function checkCredits(actionType) {
  return async (req, res, next) => {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const cost = GENERATION_COSTS[actionType] || 1;
    
    // Acciones gratuitas
    if (cost === 0) {
      req.creditCost = 0;
      return next();
    }

    const credits = await getCredits(userId);
    
    if (credits.total < cost) {
      return res.status(402).json({
        error: 'credits_insufficient',
        message: `Necesitas ${cost} crédito(s) pero tienes ${credits.total}`,
        current: credits.total,
        needed: cost,
        packs: CREDIT_PACKS
      });
    }

    req.creditCost = cost;
    req.credits = credits;
    next();
  };
}

module.exports = {
  CREDIT_CONFIG,
  GENERATION_COSTS,
  GENERATION_LIMITS,
  CREDIT_PACKS,
  initCredits,
  getCredits,
  consumeCredit,
  addCredits,
  activatePro,
  renewMonthly,
  checkCredits,
  logTransaction
};
