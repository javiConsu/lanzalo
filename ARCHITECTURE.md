# Arquitectura de Lanzalo - Decisiones Críticas

## Multi-Tenancy: ¿Cómo aislar proyectos?

### Opción 1: Database-per-Tenant (RECOMENDADA para MVP)
```
lanzalo_user_001  (PostgreSQL DB)
lanzalo_user_002  (PostgreSQL DB)
lanzalo_user_003  (PostgreSQL DB)
```

**Pros:**
- Aislamiento total de datos
- Fácil backup/restore por cliente
- Fácil de escalar (sharding)

**Contras:**
- Más complejo de gestionar
- Más costoso en recursos

### Opción 2: Schema-per-Tenant
```
public.companies WHERE user_id = X
```

**Pros:**
- Más simple
- Un solo servidor DB

**Contras:**
- Riesgo de data leaks
- Queries más complejas
- Difícil de escalar

### ✅ Decisión: Empezar con Opción 2, migrar a Opción 1 cuando > 100 usuarios

---

## Ejecución de Código Generado

### ¿Dónde corre el código que los agentes generan?

**Opción A: Serverless (Vercel, Netlify)**
- Cada deploy es un sitio estático
- Límites naturales de recursos
- Fácil de provisionar subdominios

**Opción B: Contenedores Docker**
- Control total
- Puede correr backends complejos
- Más costoso de mantener

**Opción C: VM por cliente (Firecracker)**
- Aislamiento máximo
- Micro-VMs ligeras
- Overkill para MVP

### ✅ Decisión: 
- **Frontend/Landing pages:** Vercel/Netlify (serverless)
- **Backends/APIs:** Docker containers en Railway/Fly.io
- **Scaling futuro:** Firecracker VMs

---

## LLM Cost Management

### Problema: Claude Sonnet 4 es caro (~$15/M tokens)

**Estrategia de Costos:**

1. **Tier de modelos según tarea:**
```javascript
const modelStrategy = {
  // Tareas críticas (generación de código)
  code: 'claude-sonnet-4',           // $15/M tokens
  
  // Tareas creativas (marketing, emails)
  marketing: 'claude-sonnet-3.5',    // $3/M tokens
  email: 'claude-haiku-3',           // $0.25/M tokens
  
  // Análisis simple
  analytics: 'gpt-4o-mini',          // $0.15/M tokens
};
```

2. **Caching agresivo:**
```javascript
// Cachear prompts comunes
const cache = new Map();
const cacheKey = `${agentType}:${hash(context)}`;

if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

3. **Límites por plan:**
```javascript
const quotas = {
  free: { llmTokens: 100_000 },      // ~$1.50
  pro: { llmTokens: 2_000_000 }      // ~$30
};
```

### ✅ Decisión: Implementar tier strategy + quotas desde día 1

---

## Revenue Share Implementation

### ¿Cómo cobrar 20% automáticamente?

**Stripe Connect (Recomendado):**

```javascript
// 1. Cliente conecta su Stripe
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: client.email
});

// 2. En cada pago, Lanzalo toma 20%
const payment = await stripe.paymentIntents.create({
  amount: 10000,                    // $100
  application_fee_amount: 2000,     // $20 para Lanzalo
  transfer_data: {
    destination: client.stripe_account_id
  }
});
```

**Alternativa: Manual invoicing**
- Cliente reporta ingresos mensualmente
- Lanzalo factura 20%
- Menos automático, más confianza requerida

### ✅ Decisión: Stripe Connect para automatización completa

---

## Seguridad del Código Generado

### Problema: ¿Qué pasa si el LLM genera código malicioso?

**Sandboxing obligatorio:**

```javascript
const vm2 = require('vm2');

// Sandbox con permisos limitados
const sandbox = new vm2.VM({
  timeout: 5000,
  sandbox: {
    // Solo estas funciones permitidas
    console: console,
    fetch: limitedFetch,  // Solo a APIs whitelisted
    // NO: require, process, fs, etc.
  }
});

// Ejecutar código generado
try {
  const result = sandbox.run(generatedCode);
} catch (error) {
  logSecurityIncident(company.id, error);
}
```

**Static Analysis antes de ejecutar:**
```javascript
// Detectar patrones peligrosos
const dangerousPatterns = [
  /require\(['"]child_process['"]\)/,
  /eval\(/,
  /new Function\(/,
  /process\.env/
];

if (dangerousPatterns.some(p => p.test(code))) {
  rejectCode('Patrón peligroso detectado');
}
```

### ✅ Decisión: VM2 sandbox + static analysis + manual review para primeros 50 proyectos

---

## Autonomía vs. Control

### ¿Qué decisiones puede tomar el agente sin aprobación humana?

**Auto-aprobado (sin confirmación):**
- ✅ Generar contenido de marketing
- ✅ Escribir código para features planificadas
- ✅ Enviar emails de outreach (con límite diario)
- ✅ Postear en Twitter (con preview)
- ✅ Analizar métricas

**Requiere aprobación humana:**
- ❌ Desplegar a producción (primera vez)
- ❌ Hacer cambios que rompan compatibilidad
- ❌ Gastar > $X en APIs externas
- ❌ Cambiar configuración de billing
- ❌ Borrar datos

**Implementación:**
```javascript
async function deployCode(company, code) {
  if (!company.auto_deploy_approved) {
    // Enviar notificación al dueño
    await notifyOwner(company.id, {
      type: 'approval_required',
      action: 'deploy',
      preview: code.summary
    });
    return { status: 'pending_approval' };
  }
  
  // Auto-deploy habilitado
  return await deploy(code);
}
```

### ✅ Decisión: Modo "training wheels" por defecto (requiere aprobación), opción de full-auto después de 1 mes

---

## Escalabilidad

### ¿Cuántas empresas puede manejar un servidor?

**Cálculo conservador:**

```
Por empresa activa:
- 1 ciclo diario = 5 agentes × 3 llamadas LLM = 15 llamadas/día
- ~50K tokens/día por empresa
- ~100MB RAM durante ejecución

Con servidor de 16GB RAM:
- ~150 empresas ejecutándose concurrentemente
- Pero no todas corren al mismo tiempo

Con cron staggering:
- 1000+ empresas en un solo servidor
```

**Plan de scaling:**

1. **0-100 empresas:** Un servidor (Railway/Fly.io)
2. **100-1000:** Cluster de 3-5 servidores + load balancer
3. **1000+:** Kubernetes + auto-scaling + DB sharding

### ✅ Decisión: Monitorear y escalar cuando lleguemos a 80% de capacidad

---

## Failover & Reliability

### ¿Qué pasa si un agente falla?

**Retry Strategy:**
```javascript
async function executeWithRetry(task, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await task();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

**Dead Letter Queue:**
- Si una tarea falla 3 veces → DLQ
- Notificar al dueño
- Manual review

**Health Checks:**
```javascript
cron.schedule('*/5 * * * *', async () => {
  const companies = await getActiveCompanies();
  
  for (const company of companies) {
    const lastActivity = await getLastActivity(company.id);
    
    // Si no hay actividad en 24h
    if (Date.now() - lastActivity > 24 * 60 * 60 * 1000) {
      alertStuckCompany(company.id);
    }
  }
});
```

### ✅ Decisión: Retry 3x + DLQ + alertas desde día 1

---

## Conclusión: Stack Final para MVP

```
┌─────────────────────────────────────────┐
│           CLIENTE (Browser)             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│    Frontend (Vercel - Next.js)          │
│    - Dashboard                          │
│    - Live feed (WebSockets)             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│    Backend API (Railway - Node.js)      │
│    - Express REST API                   │
│    - WebSocket server                   │
│    - Agent Orchestrator                 │
│    - Job Queue (Bull)                   │
└─────────┬───────────────┬───────────────┘
          │               │
    ┌─────▼──────┐   ┌────▼────────┐
    │ PostgreSQL │   │   Redis     │
    │ (Supabase) │   │  (Upstash)  │
    └────────────┘   └─────────────┘
          │
    ┌─────▼──────────────────────────┐
    │  Agent Execution Layer         │
    │  - VM2 Sandboxes               │
    │  - Docker containers (Railway) │
    │  - Deployed sites (Vercel)     │
    └────────────────────────────────┘
```

**Costos estimados (100 empresas activas):**
- Railway backend: $20/mes
- Vercel frontend: $0 (hobby) o $20 (pro)
- Supabase DB: $25/mes
- Upstash Redis: $0 (free tier)
- OpenRouter LLM: ~$100-300/mes (depending on usage)
- **Total: ~$165-365/mes**
- **Revenue (100 × $39): $3,900/mes**
- **Margen: ~$3,500+/mes** (sin contar revenue share)

**ROI:** Rentable desde 10-20 clientes pagando.
