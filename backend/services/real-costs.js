/**
 * Real Costs Service — Obtener costes reales de APIs externas
 * 
 * Soporta periodos: 24h | 7d | 30d | total
 * 
 * Fuentes:
 * - OpenRouter: GET /api/v1/key (uso de créditos real — daily/weekly/monthly/total)
 * - Vercel: Estimación Pro Plan (VERCEL_TOKEN pendiente)
 * - Neon: API de proyecto (compute, storage, transfer)
 * - Railway: GraphQL workspace.customer (currentUsage + billingPeriod)
 * - Instantly: Fijo $49/mo (Growth plan)
 * - Resend: Free tier
 * - Dominio: Fijo $18/año
 * 
 * Cache: 5 minutos para no saturar APIs externas
 */

const axios = require('axios');

// Cache simple en memoria (5 min TTL)
const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

/**
 * Helper: prorratea un coste mensual según el periodo
 * @param {number} monthlyCost - Coste mensual
 * @param {string} period - 24h | 7d | 30d | total
 * @param {number} totalMonths - Meses totales de servicio (para 'total')
 */
function prorateCost(monthlyCost, period, totalMonths = 1) {
  switch (period) {
    case '24h': return monthlyCost / 30;
    case '7d': return monthlyCost / 4.286; // ~7/30
    case '30d': return monthlyCost;
    case 'total': return monthlyCost * totalMonths;
    default: return monthlyCost;
  }
}

// ─── OpenRouter ────────────────────────────────────────────
async function getOpenRouterCosts() {
  const cached = getCached('openrouter');
  if (cached) return cached;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: 'No API key', usage_daily: 0, usage_weekly: 0, usage_monthly: 0, usage_total: 0, account_total: 0, account_credits: 0 };

  try {
    // Fetch both key-level usage AND account-level credits in parallel
    const [keyRes, creditsRes] = await Promise.all([
      axios.get('https://openrouter.ai/api/v1/key', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 10000
      }),
      axios.get('https://openrouter.ai/api/v1/credits', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 10000
      }).catch(() => ({ data: { data: { total_usage: 0, total_credits: 0 } } }))
    ]);

    const keyData = keyRes.data?.data || {};
    const creditsData = creditsRes.data?.data || {};

    const result = {
      source: 'openrouter_api',
      label: keyData.label || 'default',
      // Key-level usage (current key only)
      usage_total: keyData.usage || 0,
      usage_daily: keyData.usage_daily || 0,
      usage_weekly: keyData.usage_weekly || 0,
      usage_monthly: keyData.usage_monthly || 0,
      // Account-level usage (ALL keys, all time)
      account_total: creditsData.total_usage || 0,
      account_credits: creditsData.total_credits || 0,
      account_remaining: (creditsData.total_credits || 0) - (creditsData.total_usage || 0),
      limit: keyData.limit || null,
      limit_remaining: keyData.limit_remaining || null,
      is_free_tier: keyData.is_free_tier || false,
      raw: keyData
    };

    setCache('openrouter', result);
    return result;
  } catch (e) {
    console.error('OpenRouter costs error:', e.message);
    return { error: e.message, usage_daily: 0, usage_weekly: 0, usage_monthly: 0, usage_total: 0, account_total: 0, account_credits: 0 };
  }
}

/** Selecciona el coste de OpenRouter según periodo */
function getOpenRouterForPeriod(openrouter, period) {
  switch (period) {
    case '24h': return openrouter.usage_daily || 0;
    case '7d': return openrouter.usage_weekly || 0;
    case '30d': return openrouter.usage_monthly || 0;
    // For 'total', use account-level total (all keys) instead of current key only
    case 'total': return openrouter.account_total || openrouter.usage_total || 0;
    default: return openrouter.usage_monthly || 0;
  }
}

// ─── Vercel ────────────────────────────────────────────────
async function getVercelCosts() {
  const cached = getCached('vercel');
  if (cached) return cached;

  const token = process.env.VERCEL_TOKEN;
  if (!token) return { 
    source: 'fallback', 
    monthly: 20, 
    breakdown: [{ service: 'Pro Plan (estimado)', cost: 20 }], 
    note: 'No VERCEL_TOKEN configurado',
    started_at: '2026-03-01T00:00:00Z' // Fecha aprox inicio
  };

  try {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = now.toISOString();

    const res = await axios.get('https://api.vercel.com/v1/billing/charges', {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { from, to },
      timeout: 15000,
      responseType: 'text'
    });

    const lines = (res.data || '').split('\n').filter(l => l.trim());
    const charges = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    
    const byService = {};
    let total = 0;
    for (const c of charges) {
      const service = c.ServiceName || c.ServiceCategory || 'Other';
      const cost = parseFloat(c.BilledCost || c.EffectiveCost || 0);
      byService[service] = (byService[service] || 0) + cost;
      total += cost;
    }

    if (total === 0 && charges.length === 0) {
      const fallback = {
        source: 'fallback',
        monthly: 20,
        breakdown: [{ service: 'Pro Plan (estimado)', cost: 20 }],
        note: 'API vacía - configurar VERCEL_TOKEN con permisos de billing',
        started_at: '2026-03-01T00:00:00Z'
      };
      setCache('vercel', fallback);
      return fallback;
    }

    const result = {
      source: 'vercel_api',
      monthly: Math.round(total * 100) / 100,
      period: { from, to },
      breakdown: Object.entries(byService).map(([service, cost]) => ({
        service,
        cost: Math.round(cost * 100) / 100
      })),
      started_at: '2026-03-01T00:00:00Z'
    };

    setCache('vercel', result);
    return result;
  } catch (e) {
    console.error('Vercel costs error:', e.message);
    return { 
      error: e.message, monthly: 20, source: 'fallback',
      breakdown: [{ service: 'Pro Plan (estimado)', cost: 20 }],
      started_at: '2026-03-01T00:00:00Z'
    };
  }
}

// ─── Neon ──────────────────────────────────────────────────
async function getNeonCosts() {
  const cached = getCached('neon');
  if (cached) return cached;

  const apiKey = process.env.NEON_API_KEY;
  if (!apiKey) {
    return { 
      source: 'fallback',
      monthly: 0,
      note: 'Estimado - configurar NEON_API_KEY para datos reales',
      breakdown: [{ item: 'Free tier (estimado)', cost: 0 }],
      started_at: '2026-03-06T00:00:00Z'
    };
  }

  try {
    const projectsRes = await axios.get('https://console.neon.tech/api/v2/projects', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      timeout: 10000
    });

    const projects = projectsRes.data?.projects || [];
    let totalComputeSeconds = 0;
    let totalStorageBytesHour = 0;
    let totalDataTransfer = 0;
    let totalWrittenData = 0;
    const projectBreakdown = [];
    let oldestCreated = new Date();
    let subscriptionType = 'unknown';

    for (const p of projects) {
      try {
        const detailRes = await axios.get(`https://console.neon.tech/api/v2/projects/${p.id}`, {
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
          timeout: 10000
        });
        const proj = detailRes.data?.project || p;
        
        const computeSec = proj.compute_time_seconds || 0;
        const storageBH = proj.data_storage_bytes_hour || 0;
        const dataTransfer = proj.data_transfer_bytes || 0;
        const writtenData = proj.written_data_bytes || 0;

        totalComputeSeconds += computeSec;
        totalStorageBytesHour += storageBH;
        totalDataTransfer += dataTransfer;
        totalWrittenData += writtenData;

        if (proj.owner?.subscription_type) subscriptionType = proj.owner.subscription_type;

        const created = new Date(proj.created_at);
        if (created < oldestCreated) oldestCreated = created;

        projectBreakdown.push({
          name: proj.name,
          id: proj.id,
          compute_seconds: computeSec,
          active_time_seconds: proj.active_time_seconds || 0,
          created_at: proj.created_at
        });
      } catch (detailErr) {
        totalComputeSeconds += p.compute_time_seconds || 0;
        totalStorageBytesHour += p.data_storage_bytes_hour || 0;
      }
    }

    // Neon pricing
    const computeHours = totalComputeSeconds / 3600;
    const computeCost = computeHours * 0.16;
    const storageGiB = totalStorageBytesHour / (1024 * 1024 * 1024);
    const storageCost = storageGiB * 0.000164;
    const dataTransferGiB = totalDataTransfer / (1024 * 1024 * 1024);
    const dataTransferCost = dataTransferGiB * 0.09;
    const writtenGiB = totalWrittenData / (1024 * 1024 * 1024);
    const writtenCost = writtenGiB * 0.096;

    const daysSinceCreation = Math.max(1, (Date.now() - oldestCreated.getTime()) / (1000 * 60 * 60 * 24));
    const rawTotal = computeCost + storageCost + dataTransferCost + writtenCost;
    const estimatedMonthly = (rawTotal / daysSinceCreation) * 30;

    const isFree = subscriptionType.includes('free');

    const result = {
      source: 'neon_api',
      plan: subscriptionType,
      monthly: Math.round(estimatedMonthly * 100) / 100,
      cumulative_total: Math.round(rawTotal * 1000) / 1000,
      days_tracked: Math.round(daysSinceCreation * 10) / 10,
      is_free_tier: isFree,
      started_at: oldestCreated.toISOString(),
      breakdown: [
        { item: 'Compute', hours: Math.round(computeHours * 100) / 100, cost: Math.round(computeCost * 1000) / 1000 },
        { item: 'Storage', gib_hours: Math.round(storageGiB * 100) / 100, cost: Math.round(storageCost * 1000) / 1000 },
        { item: 'Data Transfer', gib: Math.round(dataTransferGiB * 1000) / 1000, cost: Math.round(dataTransferCost * 1000) / 1000 },
        { item: 'Written Data', gib: Math.round(writtenGiB * 1000) / 1000, cost: Math.round(writtenCost * 1000) / 1000 }
      ],
      projects: projectBreakdown,
      note: isFree ? 'Free tier - sin coste base' : `Plan: ${subscriptionType}`
    };

    setCache('neon', result);
    return result;
  } catch (e) {
    console.error('Neon costs error:', e.message);
    return { source: 'fallback', monthly: 0, error: e.message, breakdown: [{ item: 'Free tier (estimado)', cost: 0 }], started_at: '2026-03-06T00:00:00Z' };
  }
}

// ─── Railway ───────────────────────────────────────────────
async function getRailwayCosts() {
  const cached = getCached('railway');
  if (cached) return cached;

  const token = process.env.RAILWAY_TOKEN;
  if (!token) {
    return {
      source: 'fallback',
      monthly: 5,
      note: 'Estimado - configurar RAILWAY_TOKEN para datos reales',
      breakdown: [{ item: 'Hobby Plan (estimado)', cost: 5 }],
      started_at: '2026-03-06T00:00:00Z'
    };
  }

  try {
    const query = `
      query {
        me {
          workspaces {
            id
            name
            plan
            customer {
              currentUsage
              billingPeriod { start end }
              state
              creditBalance
            }
          }
        }
      }
    `;

    const res = await axios.post('https://backboard.railway.app/graphql/v2', 
      { query },
      { 
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 10000 
      }
    );

    const workspaces = res.data?.data?.me?.workspaces || [];
    let totalCurrentUsage = 0;
    let totalEstimatedMonthly = 0;
    const breakdownItems = [];
    let earliestStart = new Date();

    for (const ws of workspaces) {
      const customer = ws.customer;
      if (!customer) continue;

      const currentUsage = customer.currentUsage || 0;
      totalCurrentUsage += currentUsage;

      const periodStart = new Date(customer.billingPeriod?.start);
      const periodEnd = new Date(customer.billingPeriod?.end);
      const now = new Date();
      const periodDays = (periodEnd - periodStart) / (1000 * 60 * 60 * 24);
      const elapsedDays = Math.max(1, (now - periodStart) / (1000 * 60 * 60 * 24));
      const estimatedMonthly = (currentUsage / elapsedDays) * 30;

      totalEstimatedMonthly += estimatedMonthly;

      if (periodStart < earliestStart) earliestStart = periodStart;

      breakdownItems.push({
        workspace: ws.name,
        plan: ws.plan,
        current_period_usage: Math.round(currentUsage * 100) / 100,
        estimated_monthly: Math.round(estimatedMonthly * 100) / 100,
        credit_balance: customer.creditBalance || 0,
        billing_period: {
          start: customer.billingPeriod?.start,
          end: customer.billingPeriod?.end,
          days: Math.round(periodDays),
          elapsed: Math.round(elapsedDays * 10) / 10
        }
      });
    }

    const result = {
      source: 'railway_api',
      monthly: Math.round(totalEstimatedMonthly * 100) / 100,
      current_period_usage: Math.round(totalCurrentUsage * 100) / 100,
      breakdown: breakdownItems,
      started_at: earliestStart.toISOString()
    };

    setCache('railway', result);
    return result;
  } catch (e) {
    console.error('Railway costs error:', e.message);
    return { source: 'fallback', monthly: 5, error: e.message, breakdown: [{ item: 'Hobby Plan (estimado)', cost: 5 }], started_at: '2026-03-06T00:00:00Z' };
  }
}

// ─── Resend ────────────────────────────────────────────────
async function getResendCosts() {
  const cached = getCached('resend');
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { source: 'fallback', monthly: 0, plan: 'free', note: 'Free tier', started_at: '2026-03-06T00:00:00Z' };

  try {
    const { pool } = require('../db');
    const emailCount = await pool.query(
      `SELECT COUNT(*) as total FROM tasks 
       WHERE tag = 'email' AND status = 'completed' 
       AND created_at > NOW() - INTERVAL '30 days'`
    );

    const result = {
      source: 'resend_estimate',
      monthly: 0,
      plan: 'free',
      emails_sent_30d: parseInt(emailCount.rows[0]?.total || 0),
      limit: 3000,
      note: 'Free tier (3K emails/month)',
      started_at: '2026-03-06T00:00:00Z'
    };

    setCache('resend', result);
    return result;
  } catch (e) {
    return { source: 'fallback', monthly: 0, plan: 'free', error: e.message, started_at: '2026-03-06T00:00:00Z' };
  }
}

// ─── Instantly.ai ──────────────────────────────────────────
async function getInstantlyCosts() {
  const cached = getCached('instantly');
  if (cached) return cached;

  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) {
    return { source: 'disabled', monthly: 0, note: 'Instantly no configurado', started_at: null };
  }

  try {
    const { pool } = require('../db');
    const subs = await pool.query(
      `SELECT COUNT(*) as active FROM email_pro_subscriptions WHERE status IN ('active', 'setting_up')`
    );
    const activeSubs = parseInt(subs.rows[0]?.active || 0);

    const result = {
      source: 'fixed',
      monthly: 49,
      plan: 'Growth',
      plan_cost_monthly: 49,
      active_subscriptions: activeSubs,
      revenue_per_sub: 15,
      note: `Growth plan $49/mo — ${activeSubs} suscripciones Email Pro activas`,
      started_at: '2026-03-01T00:00:00Z'
    };

    setCache('instantly', result);
    return result;
  } catch (e) {
    return {
      source: 'fixed',
      monthly: 49,
      plan: 'Growth',
      note: 'Growth plan $49/mo',
      error: e.message,
      started_at: '2026-03-01T00:00:00Z'
    };
  }
}

// ─── Domain ────────────────────────────────────────────────
function getDomainCosts() {
  return {
    source: 'fixed',
    monthly: 1.50,
    domain: 'lanzalo.pro',
    annual_cost: 18,
    note: '$18/año ≈ $1.50/mes',
    started_at: '2026-03-01T00:00:00Z'
  };
}

// ─── Aggregate All Costs (con soporte de periodo) ──────────
/**
 * @param {string} period - '24h' | '7d' | '30d' | 'total'
 */
async function getAllRealCosts(period = '30d') {
  const [openrouter, vercel, neon, railway, resend, instantly] = await Promise.all([
    getOpenRouterCosts(),
    getVercelCosts(),
    getNeonCosts(),
    getRailwayCosts(),
    getResendCosts(),
    getInstantlyCosts()
  ]);

  const domain = getDomainCosts();

  // ─── Calcular costes por periodo ─────────────────────────
  // OpenRouter: tiene datos nativos por periodo
  const openrouterCost = getOpenRouterForPeriod(openrouter, period);

  // Calcular meses de servicio para prorrateo de 'total'
  const now = new Date();
  const getMonths = (startDate) => {
    if (!startDate) return 1;
    const start = new Date(startDate);
    return Math.max(1, (now - start) / (1000 * 60 * 60 * 24 * 30));
  };

  // Servicios fijos: prorratear según periodo
  const vercelCost = prorateCost(vercel.monthly || 20, period, getMonths(vercel.started_at));
  const instantlyCost = prorateCost(instantly.monthly || 0, period, getMonths(instantly.started_at));
  const domainCost = prorateCost(domain.monthly || 1.50, period, getMonths(domain.started_at));
  const resendCost = prorateCost(resend.monthly || 0, period, getMonths(resend.started_at));

  // Railway: current_period_usage es el gasto real del periodo actual
  // Para 'total' usamos el acumulado, para otros prorrateamos desde monthly
  let railwayCost;
  if (period === 'total') {
    // Acumulado total = uso actual del periodo de facturación (Railway no da histórico)
    railwayCost = railway.current_period_usage || prorateCost(railway.monthly || 0, period, getMonths(railway.started_at));
  } else {
    railwayCost = prorateCost(railway.monthly || 0, period, 1);
  }

  // Neon: cumulative_total es el gasto real total, monthly es la extrapolación mensual
  let neonCost;
  if (period === 'total') {
    neonCost = neon.cumulative_total || 0;
  } else {
    neonCost = prorateCost(neon.monthly || 0, period, 1);
  }

  const r = (n) => Math.round(n * 100) / 100;

  // Build per-service response con coste ajustado al periodo
  const services = {
    openrouter: {
      ...openrouter,
      cost: r(openrouterCost),
      period_label: period
    },
    vercel: {
      ...vercel,
      cost: r(vercelCost),
      period_label: period
    },
    neon: {
      ...neon,
      cost: r(neonCost),
      period_label: period
    },
    railway: {
      ...railway,
      cost: r(railwayCost),
      period_label: period
    },
    resend: {
      ...resend,
      cost: r(resendCost),
      period_label: period
    },
    instantly: {
      ...instantly,
      cost: r(instantlyCost),
      period_label: period
    },
    domain: {
      ...domain,
      cost: r(domainCost),
      period_label: period
    }
  };

  const totalForPeriod = openrouterCost + vercelCost + neonCost + railwayCost + resendCost + instantlyCost + domainCost;

  return {
    period,
    total: r(totalForPeriod),
    services,
    cache_ttl_seconds: CACHE_TTL / 1000,
    fetched_at: new Date().toISOString()
  };
}

module.exports = {
  getOpenRouterCosts,
  getVercelCosts,
  getNeonCosts,
  getRailwayCosts,
  getResendCosts,
  getInstantlyCosts,
  getDomainCosts,
  getAllRealCosts
};
