# 💰 Dashboard Financiero - Admin

## Visión Clara: Costos vs Ingresos

### 🎯 Objetivo

Tomar decisiones de pricing basadas en **datos reales** de costos e ingresos.

---

## 📊 Endpoints Nuevos

### 1. Dashboard Financiero Global

```bash
GET /api/admin/financials/dashboard?period=month

Response:
{
  "period": "month",
  "summary": {
    "totalRevenue": 390.00,     // $39 × 10 usuarios
    "totalCosts": 210.00,        // LLM + infra
    "grossProfit": 180.00,
    "profitMargin": "46.15"      // %
  },
  "revenue": {
    "mrr": 390,                  // Monthly Recurring Revenue
    "proUsers": 10,
    "revenueShare": 0,           // 20% de ingresos empresas
    "total": 390
  },
  "costs": {
    "llm": 150.00,               // Costos OpenRouter
    "infrastructure": 60.00,     // Railway + Vercel + Supabase
    "total": 210.00
  },
  "breakeven": {
    "costPerUser": "21.00",      // Costo por usuario
    "usersNeeded": 6,            // Usuarios necesarios para break-even
    "currentUsers": 10,
    "gap": -4                    // Ya estás en profit
  },
  "unitEconomics": {
    "ltv": 234,                  // Lifetime Value ($39 × 6 meses)
    "cac": 0,                    // Customer Acquisition Cost
    "ltvCacRatio": "∞",          // LTV/CAC ratio
    "paybackMonths": 0
  },
  "status": "profitable"
}
```

**Periods**: `today`, `week`, `month`, `all`

---

### 2. Análisis de Precios

```bash
GET /api/admin/financials/pricing-analysis

Response:
{
  "currentPricing": {
    "proPrice": 39,
    "avgCostPerCompany": 15.20,
    "marginPerUser": "23.80"
  },
  "distribution": [
    { "bracket": "< $1", "companies": 5 },
    { "bracket": "$1-5", "companies": 8 },
    { "bracket": "$5-10", "companies": 3 },
    { "bracket": "$10-20", "companies": 2 },
    { "bracket": "> $20", "companies": 1 }
  ],
  "scenarios": [
    {
      "price": 29,
      "name": "Budget",
      "estimatedUsers": 15,
      "monthlyRevenue": 435,
      "estimatedCosts": 288,
      "profit": 147,
      "margin": "33.79%",
      "recommended": false
    },
    {
      "price": 39,
      "name": "Current",
      "estimatedUsers": 10,
      "monthlyRevenue": 390,
      "estimatedCosts": 210,
      "profit": 180,
      "margin": "46.15%",
      "recommended": true
    },
    {
      "price": 49,
      "name": "Premium",
      "estimatedUsers": 6,
      "monthlyRevenue": 294,
      "estimatedCosts": 151,
      "profit": 143,
      "margin": "48.64%",
      "recommended": false
    }
  ],
  "recommendation": {
    "suggestedPrice": 39,
    "reason": "Maximiza profit ($180/mes) con margen 46.15%",
    "action": "Unit economics saludables. Enfócate en adquirir usuarios."
  }
}
```

---

### 3. Costos por Empresa (Top 20)

```bash
GET /api/admin/financials/company-costs?period=month

Response:
{
  "period": "month",
  "companies": [
    {
      "id": "...",
      "name": "EmpresaX",
      "subdomain": "empresax",
      "owner": {
        "email": "user@example.com",
        "plan": "pro"
      },
      "costs": {
        "llm": "25.40",
        "tokens": 850000,
        "calls": 120
      },
      "revenue": {
        "subscription": 39,
        "revenueShare": "0.00",
        "total": "39.00"
      },
      "profit": "13.60",
      "profitable": true,
      "margin": "34.87%"
    },
    {
      "id": "...",
      "name": "StartupY",
      "subdomain": "startupy",
      "owner": {
        "email": "user2@example.com",
        "plan": "free"
      },
      "costs": {
        "llm": "45.20",
        "tokens": 1200000,
        "calls": 200
      },
      "revenue": {
        "subscription": 0,        // Plan FREE!
        "revenueShare": "0.00",
        "total": "0.00"
      },
      "profit": "-45.20",
      "profitable": false,
      "margin": "N/A"
    }
  ],
  "summary": {
    "totalCompanies": 20,
    "profitable": 12,
    "unprofitable": 8,
    "avgProfit": "8.40"
  }
}
```

**⚠️ Identifica empresas que te están costando dinero!**

---

### 4. Proyecciones de Crecimiento

```bash
GET /api/admin/financials/projections

Response:
{
  "current": {
    "users": 10,
    "monthlyGrowth": "15.00%"
  },
  "projections": [
    {
      "month": 1,
      "users": 12,
      "mrr": 468,
      "costs": 240,
      "profit": 228,
      "margin": "48.72%"
    },
    {
      "month": 2,
      "users": 14,
      "mrr": 546,
      "costs": 270,
      "profit": 276,
      "margin": "50.55%"
    },
    {
      "month": 3,
      "users": 16,
      "mrr": 624,
      "costs": 300,
      "profit": 324,
      "margin": "51.92%"
    }
  ]
}
```

---

## 📈 Casos de Uso

### Caso 1: ¿Estoy ganando o perdiendo dinero?

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/admin/financials/dashboard?period=month"
```

**Miras**:
- `grossProfit` → Si es > 0, estás ganando
- `profitMargin` → % de ganancia
- `breakeven.gap` → Cuántos usuarios necesitas

---

### Caso 2: ¿Debo subir/bajar el precio?

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/admin/financials/pricing-analysis"
```

**Comparas**:
- Diferentes escenarios de precio
- Cuál maximiza `profit`
- Cuál tiene mejor `margin`

**Recomendación automática** te dice qué hacer.

---

### Caso 3: ¿Qué empresas me están costando dinero?

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/admin/financials/company-costs?period=month"
```

**Filtras**:
- `profitable: false` → Empresas que pierden dinero
- Puedes:
  - Subirles a Pro
  - Limitar sus quotas
  - Pausarlas

---

### Caso 4: ¿Cuándo seré rentable?

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/admin/financials/projections"
```

**Ves**:
- Proyección próximos 3 meses
- Cuándo llegas a break-even
- Crecimiento esperado

---

## 🎯 Decisiones que Puedes Tomar

### Si `profitMargin < 30%`

❌ **Problema**: Margen muy bajo

**Opciones**:
1. Subir precio ($39 → $49)
2. Usar modelos más baratos (Haiku en vez de Sonnet)
3. Limitar quotas del plan Free
4. Eliminar plan Free completamente

---

### Si tienes empresas `profitable: false`

❌ **Problema**: Empresas te cuestan más de lo que pagan

**Opciones**:
1. Forzarlas a upgrade a Pro
2. Limitar su uso (quotas más bajas)
3. Cambiarles modelo (solo Haiku)
4. Pausarlas si abusan

---

### Si `breakeven.gap > 0`

❌ **Problema**: Necesitas más usuarios

**Opciones**:
1. Enfocarte en marketing/growth
2. Reducir costos mientras tanto
3. Subir precio para break-even más rápido

---

## 💡 Dashboard Visual Sugerido

```
┌─────────────────────────────────────────────┐
│  💰 FINANCIAL OVERVIEW - LAST 30 DAYS      │
├─────────────────────────────────────────────┤
│                                             │
│  Revenue:    $390.00 ✅                     │
│  Costs:      $210.00                        │
│  Profit:     $180.00 (46% margin)          │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                             │
│  Users: 10 Pro ($39/mo)                    │
│  Break-even: 6 users (-4 gap) ✅           │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  📊 PRICING SCENARIOS                       │
├─────────────────────────────────────────────┤
│                                             │
│  $29/mo → 15 users → $147 profit           │
│  $39/mo → 10 users → $180 profit ⭐        │
│  $49/mo →  6 users → $143 profit           │
│                                             │
│  Recommendation: Keep $39                   │
│  Action: Focus on acquiring users           │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ⚠️  UNPROFITABLE COMPANIES                 │
├─────────────────────────────────────────────┤
│                                             │
│  StartupY (FREE) → -$45.20                 │
│    Action: Upgrade or pause                │
│                                             │
│  ProjectZ (FREE) → -$12.50                 │
│    Action: Limit quotas                     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ✅ Resumen

**Ahora tienes visibilidad TOTAL**:

1. ✅ **Profit/Loss en tiempo real**
2. ✅ **Margen de ganancia**
3. ✅ **Break-even point**
4. ✅ **Análisis de precios** (simulaciones)
5. ✅ **Empresas que pierden dinero**
6. ✅ **Proyecciones de crecimiento**

**Puedes tomar decisiones basadas en datos reales**, no en suposiciones.

---

**Próximo paso**: Implementar el frontend visual de este dashboard.
