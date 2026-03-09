/**
 * Real Costs Service — Obtener costes reales de APIs externas
 * 
 * Fuentes:
 * - OpenRouter: GET /api/v1/key (uso de créditos real)
 * - Vercel: GET /v1/billing/charges (costes de hosting)
 * - Neon: API de consumo por proyecto
 * - Railway: GraphQL API (estimaciones o fallback)
 * - Resend: Free tier tracking
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

// ─── OpenRouter ────────────────────────────────────────────
async function getOpenRouterCosts() {
  const cached = getCached('openrouter');
  if (cached) return cached;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: 'No API key', usage_daily: 0, usage_weekly: 0, usage_monthly: 0 };

  try {
    // GET /api/v1/key — returns real credit usage
    const res = await axios.get('https://openrouter.ai/api/v1/key', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 10000
    });

    const data = res.data?.data || {};
    const result = {
      source: 'openrouter_api',
      label: data.label || 'default',
      usage_total: data.usage || 0,           // All-time credits used
      usage_daily: data.usage_daily || 0,     // Today (UTC)
      usage_weekly: data.usage_weekly || 0,   // This week (Mon-Sun UTC)
      usage_monthly: data.usage_monthly || 0, // This month (UTC)
      limit: data.limit || null,
      limit_remaining: data.limit_remaining || null,
      is_free_tier: data.is_free_tier || false,
      raw: data
    };

    setCache('openrouter', result);
    return result;
  } catch (e) {
    console.error('OpenRouter costs error:', e.message);
    return { error: e.message, usage_daily: 0, usage_weekly: 0, usage_monthly: 0 };
  }
}

// ─── Vercel ────────────────────────────────────────────────
async function getVercelCosts() {
  const cached = getCached('vercel');
  if (cached) return cached;

  const token = process.env.VERCEL_TOKEN;
  if (!token) return { source: 'fallback', total: 20, breakdown: [{ service: 'Pro Plan (estimado)', cost: 20 }], note: 'No VERCEL_TOKEN configurado' };

  try {
    // Get billing period dates (current month)
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = now.toISOString();

    const res = await axios.get('https://api.vercel.com/v1/billing/charges', {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { from, to },
      timeout: 15000,
      // Response is JSONL - handle as text
      responseType: 'text'
    });

    // Parse JSONL response
    const lines = (res.data || '').split('\n').filter(l => l.trim());
    const charges = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    
    // Aggregate by service
    const byService = {};
    let total = 0;
    for (const c of charges) {
      const service = c.ServiceName || c.ServiceCategory || 'Other';
      const cost = parseFloat(c.BilledCost || c.EffectiveCost || 0);
      byService[service] = (byService[service] || 0) + cost;
      total += cost;
    }

    const result = {
      source: 'vercel_api',
      total: Math.round(total * 100) / 100,
      period: { from, to },
      breakdown: Object.entries(byService).map(([service, cost]) => ({
        service,
        cost: Math.round(cost * 100) / 100
      })),
      raw_count: charges.length
    };

    // If API returned empty/0, use Pro plan fallback
    if (result.total === 0 && result.raw_count === 0) {
      const fallback = {
        source: 'fallback',
        total: 20,
        breakdown: [{ service: 'Pro Plan (estimado)', cost: 20 }],
        note: 'API vacía - configurar VERCEL_TOKEN con permisos de billing'
      };
      setCache('vercel', fallback);
      return fallback;
    }

    setCache('vercel', result);
    return result;
  } catch (e) {
    console.error('Vercel costs error:', e.message);
    // Fallback: $20/mo Pro plan
    return { error: e.message, total: 20, breakdown: [{ service: 'Pro Plan (estimado)', cost: 20 }], source: 'fallback' };
  }
}

// ─── Neon ──────────────────────────────────────────────────
async function getNeonCosts() {
  const cached = getCached('neon');
  if (cached) return cached;

  const apiKey = process.env.NEON_API_KEY;
  if (!apiKey) {
    // Fallback: estimate from plan
    return { 
      source: 'fallback',
      total: 19,
      note: 'Estimado - configurar NEON_API_KEY para datos reales',
      breakdown: [{ item: 'Launch Plan (estimado)', cost: 19 }]
    };
  }

  try {
    // Neon consumption API
    const res = await axios.get('https://console.neon.tech/api/v2/consumption/projects', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      params: { from: new Date(Date.now() - 30 * 86400000).toISOString(), to: new Date().toISOString() },
      timeout: 10000
    });

    const projects = res.data?.projects || [];
    let totalCompute = 0;
    let totalStorage = 0;

    for (const p of projects) {
      totalCompute += p.compute_time_seconds || 0;
      totalStorage += p.data_storage_bytes_hour || 0;
    }

    // Launch plan pricing
    const computeHours = totalCompute / 3600;
    const computeCost = computeHours * 0.106; // $0.106/CU-hour
    const storageGB = totalStorage / (1024 * 1024 * 1024 * 730); // GB-months approx
    const storageCost = storageGB * 0.35;

    const result = {
      source: 'neon_api',
      total: Math.round((computeCost + storageCost) * 100) / 100,
      breakdown: [
        { item: 'Compute', hours: Math.round(computeHours * 10) / 10, cost: Math.round(computeCost * 100) / 100 },
        { item: 'Storage', gb: Math.round(storageGB * 10) / 10, cost: Math.round(storageCost * 100) / 100 }
      ]
    };

    setCache('neon', result);
    return result;
  } catch (e) {
    console.error('Neon costs error:', e.message);
    return { source: 'fallback', total: 19, error: e.message, breakdown: [{ item: 'Launch Plan (estimado)', cost: 19 }] };
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
      total: 5, // Hobby plan
      note: 'Estimado - configurar RAILWAY_TOKEN para datos reales',
      breakdown: [{ item: 'Hobby Plan (estimado)', cost: 5 }]
    };
  }

  try {
    // Railway GraphQL API - get current usage
    const query = `
      query {
        me {
          teams {
            edges {
              node {
                name
                usage(startDate: "${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()}")
              }
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

    const teams = res.data?.data?.me?.teams?.edges || [];
    let total = 0;

    for (const t of teams) {
      const usage = t.node?.usage;
      if (usage) {
        total += parseFloat(usage.currentUsage || usage.estimatedCost || 0);
      }
    }

    const result = {
      source: 'railway_api',
      total: Math.round(total * 100) / 100,
      raw: res.data
    };

    setCache('railway', result);
    return result;
  } catch (e) {
    console.error('Railway costs error:', e.message);
    return { source: 'fallback', total: 5, error: e.message, breakdown: [{ item: 'Hobby Plan (estimado)', cost: 5 }] };
  }
}

// ─── Resend ────────────────────────────────────────────────
async function getResendCosts() {
  // Resend free tier: 3,000 emails/month, 100/day
  // If they have RESEND_API_KEY we can check usage
  const cached = getCached('resend');
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { source: 'fallback', total: 0, plan: 'free', note: 'Free tier' };

  try {
    // Resend doesn't have a billing API, but we can count sent emails
    // from our own DB
    const { pool } = require('../db');
    const emailCount = await pool.query(
      `SELECT COUNT(*) as total FROM tasks 
       WHERE tag = 'email' AND status = 'completed' 
       AND created_at > NOW() - INTERVAL '30 days'`
    );

    const result = {
      source: 'resend_estimate',
      total: 0, // Free tier
      plan: 'free',
      emails_sent_30d: parseInt(emailCount.rows[0]?.total || 0),
      limit: 3000,
      note: 'Free tier (3K emails/month)'
    };

    setCache('resend', result);
    return result;
  } catch (e) {
    return { source: 'fallback', total: 0, plan: 'free', error: e.message };
  }
}

// ─── Instantly.ai ──────────────────────────────────────────
async function getInstantlyCosts() {
  // Growth plan: $47/mo (required for DFY email accounts)
  // This is a platform-level cost, not per-user
  const cached = getCached('instantly');
  if (cached) return cached;

  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) {
    return { source: 'disabled', total: 0, note: 'Instantly no configurado' };
  }

  // Check if we have any active Email Pro subscriptions
  try {
    const { pool } = require('../db');
    const subs = await pool.query(
      `SELECT COUNT(*) as active FROM email_pro_subscriptions WHERE status IN ('active', 'setting_up')`
    );
    const activeSubs = parseInt(subs.rows[0]?.active || 0);

    const result = {
      source: 'fixed',
      total: 47, // Growth plan $47/mo
      plan: 'Growth',
      plan_cost_monthly: 47,
      active_subscriptions: activeSubs,
      revenue_per_sub: 15, // 15€/mes per Email Pro subscriber
      note: `Growth plan $47/mo — ${activeSubs} suscripciones Email Pro activas`
    };

    setCache('instantly', result);
    return result;
  } catch (e) {
    return {
      source: 'fixed',
      total: 47,
      plan: 'Growth',
      note: 'Growth plan $47/mo',
      error: e.message
    };
  }
}

// ─── Domain ────────────────────────────────────────────────
function getDomainCosts() {
  // Fixed cost, roughly $18/year = $1.50/month
  return {
    source: 'fixed',
    total: 1.50,
    domain: 'lanzalo.pro',
    annual_cost: 18,
    note: '$18/año ≈ $1.50/mes'
  };
}

// ─── Aggregate All Costs ───────────────────────────────────
async function getAllRealCosts() {
  const [openrouter, vercel, neon, railway, resend, instantly] = await Promise.all([
    getOpenRouterCosts(),
    getVercelCosts(),
    getNeonCosts(),
    getRailwayCosts(),
    getResendCosts(),
    getInstantlyCosts()
  ]);

  const domain = getDomainCosts();

  const services = {
    openrouter,
    vercel,
    neon,
    railway,
    resend,
    instantly,
    domain
  };

  // Total real costs
  const totalMonthly = 
    (openrouter.usage_monthly || 0) + 
    (vercel.total || 0) + 
    (neon.total || 0) + 
    (railway.total || 0) + 
    (resend.total || 0) + 
    (instantly.total || 0) + 
    (domain.total || 0);

  return {
    total_monthly: Math.round(totalMonthly * 100) / 100,
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
