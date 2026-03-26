/**
 * Admin Financials - Dashboard de Costos vs Ingresos
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { pool } = require('../db');

// Todas las rutas requieren auth + admin
router.use(requireAuth);
router.use(requireAdmin);

/**
 * Dashboard Financiero Global
 */
router.get('/financials/dashboard', async (req, res) => {
  try {
    const period = req.query.period || 'month'; // today, week, month, all
    
    let dateFilter = "1=1";
    if (period === 'today') {
      dateFilter = "date(created_at) = date('now')";
    } else if (period === 'week') {
      dateFilter = "created_at > datetime('now', '-7 days')";
    } else if (period === 'month') {
      dateFilter = "created_at > datetime('now', '-30 days')";
    }

    // INGRESOS
    // MRR (Monthly Recurring Revenue)
    const mrrResult = await pool.query(
      `SELECT COUNT(*) as pro_users
       FROM users 
       WHERE plan = 'pro' AND role != 'admin'`
    );
    const proUsers = parseInt(mrrResult.rows[0].pro_users || 0);
    const mrr = proUsers * 39; // $39/mes por usuario Pro

    // Revenue Share: ELIMINADO (decisión 2026-03-08, modelo $39/mes fijo)
    const revenueShare = 0;

    // Total ingresos del período
    const totalRevenue = period === 'month' ? mrr : (mrr / 30) * getDaysInPeriod(period);

    // COSTOS
    // LLM costs
    const llmCostsResult = await pool.query(
      `SELECT SUM(estimated_cost) as total_cost
       FROM llm_usage
       WHERE ${dateFilter.replace('created_at', 'recorded_at')}`
    );
    const llmCosts = parseFloat(llmCostsResult.rows[0].total_cost || 0);

    // Infrastructure costs (estimado fijo)
    const infraCosts = {
      today: 2,    // $2/día
      week: 14,    // $2 × 7
      month: 60,   // Railway $20 + Vercel $20 + Supabase $20
      all: 60      // promedio mensual
    }[period];

    // Resend costs (emails)
    // Asumiendo ~1000 emails/usuario/mes (cold, newsletters, transactional)
    // Pricing: $0.0004 per email (Pro plan 50K emails @ $20/mo)
    // Cost per user: ~$0.40/mes
    const emailsPerUser = 1000;
    const costPerEmail = 0.0004; // $0.0004 per email (Resend Pro tier)
    const resendCosts = period === 'month' 
      ? proUsers * emailsPerUser * costPerEmail
      : (proUsers * emailsPerUser * costPerEmail / 30) * getDaysInPeriod(period);

    // Meta Ads management fee (15% commission)
    // Asumiendo $300 promedio ad spend/usuario/mes
    const avgAdSpendPerUser = 300;
    const adsCommissionRate = 0.15; // 15%
    const adsRevenue = period === 'month'
      ? proUsers * avgAdSpendPerUser * adsCommissionRate
      : (proUsers * avgAdSpendPerUser * adsCommissionRate / 30) * getDaysInPeriod(period);

    // Sora video generation costs
    // Asumiendo 10 videos/usuario/mes @ $15 per video (30s 1080p)
    // Using OpenAI API pricing: $0.50/second × 30s = $15/video
    const videosPerUser = 10;
    const costPerVideo = 15; // $15 per 30s 1080p video
    const soraCosts = period === 'month'
      ? proUsers * videosPerUser * costPerVideo
      : (proUsers * videosPerUser * costPerVideo / 30) * getDaysInPeriod(period);

    const totalCosts = llmCosts + infraCosts + resendCosts + soraCosts;

    // PROFIT
    const grossProfit = totalRevenue + revenueShare + adsRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 
      ? ((grossProfit / (totalRevenue + revenueShare)) * 100)
      : 0;

    // Break-even analysis
    const costPerUser = totalCosts / Math.max(proUsers, 1);
    const usersNeeded = Math.ceil(totalCosts / 39);

    // Unit economics
    const ltv = 39 * 6; // Lifetime Value (asumiendo 6 meses promedio)
    const cac = 0; // Customer Acquisition Cost (asumiendo orgánico)
    const ltvCacRatio = cac > 0 ? ltv / cac : Infinity;

    res.json({
      period,
      summary: {
        totalRevenue: totalRevenue + revenueShare + adsRevenue,
        totalCosts,
        grossProfit,
        profitMargin: profitMargin.toFixed(2)
      },
      revenue: {
        mrr,
        proUsers,
        revenueShare,
        adsCommission: adsRevenue,
        total: totalRevenue + revenueShare + adsRevenue
      },
      costs: {
        llm: llmCosts,
        resend: resendCosts,
        sora: soraCosts,
        infrastructure: infraCosts,
        total: totalCosts,
        breakdown: {
          llmPerUser: proUsers > 0 ? (llmCosts / proUsers).toFixed(2) : 0,
          resendPerUser: proUsers > 0 ? (resendCosts / proUsers).toFixed(2) : 0,
          soraPerUser: proUsers > 0 ? (soraCosts / proUsers).toFixed(2) : 0
        }
      },
      breakeven: {
        costPerUser: costPerUser.toFixed(2),
        usersNeeded,
        currentUsers: proUsers,
        gap: usersNeeded - proUsers
      },
      unitEconomics: {
        ltv,
        cac,
        ltvCacRatio: ltvCacRatio === Infinity ? '∞' : ltvCacRatio.toFixed(2),
        paybackMonths: cac > 0 ? (cac / 39).toFixed(1) : 0
      },
      status: grossProfit > 0 ? 'profitable' : 'loss'
    });

  } catch (error) {
    console.error('Error en dashboard financiero:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Análisis de Precios
 */
router.get('/financials/pricing-analysis', async (req, res) => {
  try {
    // Costo promedio por empresa
    const avgCostResult = await pool.query(
      `SELECT 
        AVG(cost_per_company) as avg_cost
       FROM (
         SELECT 
           company_id,
           SUM(estimated_cost) as cost_per_company
         FROM llm_usage
         WHERE recorded_at > datetime('now', '-30 days')
         GROUP BY company_id
       )`
    );
    const avgCostPerCompany = parseFloat(avgCostResult.rows[0].avg_cost || 0);

    // Distribución de costos
    const distributionResult = await pool.query(
      `SELECT 
         CASE
           WHEN cost < 1 THEN '< $1'
           WHEN cost < 5 THEN '$1-5'
           WHEN cost < 10 THEN '$5-10'
           WHEN cost < 20 THEN '$10-20'
           ELSE '> $20'
         END as bracket,
         COUNT(*) as companies
       FROM (
         SELECT 
           company_id,
           SUM(estimated_cost) as cost
         FROM llm_usage
         WHERE recorded_at > datetime('now', '-30 days')
         GROUP BY company_id
       )
       GROUP BY bracket
       ORDER BY bracket`
    );

    // Simulación de precios
    const pricingScenarios = [
      { price: 29, name: 'Descuento' },
      { price: 39, name: 'Current' },
      { price: 49, name: 'Premium' },
      { price: 59, name: 'Enterprise' }
    ];

    const scenarios = pricingScenarios.map(scenario => {
      const estimatedUsers = estimateUsersAtPrice(scenario.price);
      const monthlyRevenue = scenario.price * estimatedUsers;
      const estimatedCosts = avgCostPerCompany * estimatedUsers + 60; // +infra
      const profit = monthlyRevenue - estimatedCosts;
      const margin = ((profit / monthlyRevenue) * 100).toFixed(2);

      return {
        ...scenario,
        estimatedUsers,
        monthlyRevenue,
        estimatedCosts,
        profit,
        margin: margin + '%',
        recommended: profit > 1000 && parseFloat(margin) > 50
      };
    });

    res.json({
      currentPricing: {
        proPrice: 39,
        avgCostPerCompany: avgCostPerCompany.toFixed(2),
        marginPerUser: (39 - avgCostPerCompany).toFixed(2)
      },
      distribution: distributionResult.rows,
      scenarios,
      recommendation: getRecommendation(scenarios, avgCostPerCompany)
    });

  } catch (error) {
    console.error('Error en análisis de precios:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Costos por Empresa (Top 20)
 */
router.get('/financials/company-costs', async (req, res) => {
  try {
    const period = req.query.period || 'month';
    
    let dateFilter = "recorded_at > datetime('now', '-30 days')";
    if (period === 'today') {
      dateFilter = "date(recorded_at) = date('now')";
    } else if (period === 'week') {
      dateFilter = "recorded_at > datetime('now', '-7 days')";
    }

    const result = await pool.query(
      `SELECT 
         c.id,
         c.name,
         c.subdomain,
         u.email as owner_email,
         u.plan as user_plan,
         COALESCE(SUM(l.estimated_cost), 0) as total_cost,
         COALESCE(SUM(l.tokens_used), 0) as total_tokens,
         COUNT(l.id) as api_calls,
         c.revenue_total
       FROM companies c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN llm_usage l ON c.id = l.company_id AND ${dateFilter}
       GROUP BY c.id, c.name, c.subdomain, u.email, u.plan, c.revenue_total
       ORDER BY total_cost DESC
       LIMIT 20`,
      []
    );

    const companies = result.rows.map(row => {
      const cost = parseFloat(row.total_cost);
      const revenue = row.user_plan === 'pro' ? 39 : 0;
      const totalRevenue = revenue; // Sin revenue share (modelo $39/mes fijo)
      const profit = totalRevenue - cost;

      return {
        id: row.id,
        name: row.name,
        subdomain: row.subdomain,
        owner: {
          email: row.owner_email,
          plan: row.user_plan
        },
        costs: {
          llm: cost.toFixed(2),
          tokens: parseInt(row.total_tokens),
          calls: parseInt(row.api_calls)
        },
        revenue: {
          subscription: revenue,
          revenueShare: '0.00',
          total: totalRevenue.toFixed(2)
        },
        profit: profit.toFixed(2),
        profitable: profit > 0,
        margin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) + '%' : 'N/A'
      };
    });

    res.json({ 
      period,
      companies,
      summary: {
        totalCompanies: companies.length,
        profitable: companies.filter(c => c.profitable).length,
        unprofitable: companies.filter(c => !c.profitable).length,
        avgProfit: (companies.reduce((sum, c) => sum + parseFloat(c.profit), 0) / companies.length).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Error en costos por empresa:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Proyección de Ingresos
 */
router.get('/financials/projections', async (req, res) => {
  try {
    // Growth rate (último mes)
    const growthResult = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE created_at > datetime('now', '-30 days')) as new_users,
         COUNT(*) as total_users
       FROM users
       WHERE role != 'admin' AND plan = 'pro'`
    );

    const newUsers = parseInt(growthResult.rows[0]?.new_users || 0);
    const totalUsers = parseInt(growthResult.rows[0]?.total_users || 1);
    const growthRate = totalUsers > 0 ? (newUsers / Math.max(totalUsers - newUsers, 1)) : 0;

    // Proyección 3 meses
    const projections = [];
    let currentUsers = totalUsers;
    
    for (let month = 1; month <= 3; month++) {
      currentUsers = Math.round(currentUsers * (1 + growthRate));
      const mrr = currentUsers * 39;
      const estimatedCosts = currentUsers * 15 + 60; // $15 avg/user + infra
      const profit = mrr - estimatedCosts;

      projections.push({
        month,
        users: currentUsers,
        mrr,
        costs: estimatedCosts,
        profit,
        margin: ((profit / mrr) * 100).toFixed(2) + '%'
      });
    }

    res.json({
      current: {
        users: totalUsers,
        monthlyGrowth: (growthRate * 100).toFixed(2) + '%'
      },
      projections
    });

  } catch (error) {
    console.error('Error en proyecciones:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Helper functions
function getDaysInPeriod(period) {
  switch(period) {
    case 'today': return 1;
    case 'week': return 7;
    case 'month': return 30;
    default: return 30;
  }
}

function estimateUsersAtPrice(price) {
  // Modelo simple de elasticidad de precio
  const basePrice = 39;
  const baseUsers = 10; // usuarios actuales
  const elasticity = -1.5; // elasticidad precio-demanda
  
  const priceChange = (price - basePrice) / basePrice;
  const demandChange = elasticity * priceChange;
  
  return Math.max(1, Math.round(baseUsers * (1 + demandChange)));
}

function getRecommendation(scenarios, avgCost) {
  const best = scenarios.reduce((best, scenario) => 
    parseFloat(scenario.profit) > parseFloat(best.profit) ? scenario : best
  );

  let recommendation = {
    suggestedPrice: best.price,
    reason: `Maximiza profit ($${best.profit.toFixed(2)}/mes) con margen ${best.margin}`,
    action: ''
  };

  if (avgCost > 20) {
    recommendation.action = 'Costos muy altos. Considera usar modelos más baratos o limitar quotas.';
  } else if (parseFloat(best.margin) < 50) {
    recommendation.action = 'Margen bajo. Sube precios o reduce costos.';
  } else {
    recommendation.action = 'Unit economics saludables. Enfócate en adquirir usuarios.';
  }

  return recommendation;
}

module.exports = router;
