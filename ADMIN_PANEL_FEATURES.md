# Admin Panel - Features Implementados

## ✅ Configuración de IA y Modelos

### Endpoints Nuevos

#### 1. Ver Configuración Actual
```bash
GET /api/admin/settings

Response:
{
  "settings": {
    "openrouter_api_key_masked": "***...xyz",
    "default_model": "anthropic/claude-sonnet-4",
    "model_strategy": {
      "code": "anthropic/claude-sonnet-4",
      "marketing": "anthropic/claude-sonnet-3.5",
      "email": "anthropic/claude-haiku-3",
      "twitter": "anthropic/claude-haiku-3",
      "analytics": "openai/gpt-4o-mini"
    },
    "cost_alert_threshold": 100.0,
    "max_daily_cost": 500.0,
    "auto_pause_expensive_companies": true
  }
}
```

#### 2. Actualizar Configuración
```bash
POST /api/admin/settings

Body:
{
  "openrouter_api_key": "sk-or-v1-...",
  "default_model": "anthropic/claude-sonnet-4",
  "model_strategy": {
    "code": "anthropic/claude-sonnet-4",
    "marketing": "anthropic/claude-haiku-3",
    "email": "anthropic/claude-haiku-3",
    "twitter": "anthropic/claude-haiku-3",
    "analytics": "openai/gpt-4o-mini"
  },
  "cost_alert_threshold": 50.0,
  "max_daily_cost": 200.0
}
```

#### 3. Ver Costos en Tiempo Real
```bash
GET /api/admin/costs/realtime?period=today

Response:
{
  "period": "today",
  "total": {
    "cost": 45.23,
    "tokens": 1250000,
    "companies": 15
  },
  "byModel": [
    {
      "model": "anthropic/claude-sonnet-4",
      "cost": 30.50,
      "tokens": 800000,
      "calls": 45
    },
    {
      "model": "anthropic/claude-haiku-3",
      "cost": 10.20,
      "tokens": 350000,
      "calls": 120
    }
  ],
  "topCompanies": [
    {
      "id": "...",
      "name": "EmpresaCara",
      "cost": 15.40,
      "tokens": 400000,
      "calls": 20
    }
  ],
  "evolution": [
    { "hour": "09:00", "cost": 5.20, "calls": 15 },
    { "hour": "10:00", "cost": 8.30, "calls": 25 }
  ]
}
```

#### 4. Alertas de Costos
```bash
GET /api/admin/costs/alerts

Response:
{
  "alerts": [
    {
      "type": "warning",
      "level": "high",
      "message": "Costos de hoy: $125.50 (límite: $100)",
      "action": "Monitorear"
    },
    {
      "type": "company_limit",
      "level": "medium",
      "message": "EmpresaX ha gastado $12.50 (límite: $10.00)",
      "companyId": "...",
      "action": "Revisar uso de empresa"
    }
  ],
  "todayCost": 125.50,
  "threshold": 100.0,
  "maxCost": 500.0,
  "status": "warning"
}
```

#### 5. Modelos Disponibles
```bash
GET /api/admin/models

Response:
{
  "models": [
    {
      "id": "anthropic/claude-sonnet-4",
      "name": "Claude Sonnet 4",
      "provider": "Anthropic",
      "cost": { "input": 3, "output": 15 },
      "recommended": ["code", "complex"],
      "description": "Más potente, mejor para código crítico"
    },
    {
      "id": "anthropic/claude-haiku-3",
      "name": "Claude Haiku 3",
      "provider": "Anthropic",
      "cost": { "input": 0.25, "output": 1.25 },
      "recommended": ["email", "twitter", "simple"],
      "description": "Rápido y económico para tareas simples"
    }
  ]
}
```

---

## 🎛️ Panel de Control Admin

### Funcionalidades

1. **Configurar API Key de OpenRouter**
   - Meter tu propia API key
   - Se ofusca para seguridad (solo muestra últimos 4 chars)

2. **Seleccionar Modelos**
   - Modelo por defecto global
   - Estrategia por tipo de tarea (code, marketing, email, etc.)
   - Ver precio de cada modelo

3. **Control de Costos**
   - Ver costos en tiempo real (hoy/semana/mes)
   - Dashboard por modelo
   - Top empresas más caras
   - Evolución por hora

4. **Alertas Automáticas**
   - Alerta si costos > threshold
   - Pausar todo si > max_daily_cost
   - Detectar empresas que exceden su límite

5. **Audit Log**
   - Cada cambio de configuración se registra
   - Quién lo hizo y cuándo

---

## 🔧 Configuración por Empresa (Opcional)

Puedes dar override a empresas específicas:

```sql
INSERT INTO company_settings (company_id, cost_limit_daily, model_override)
VALUES ('empresa-id', 5.0, 'anthropic/claude-haiku-3');
```

Esto:
- Limita esa empresa a $5/día
- Fuerza uso de Haiku (modelo barato)

---

## 📊 Ejemplo de Uso

### Escenario: Quieres reducir costos

1. **Ver costos actuales**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/costs/realtime
```

2. **Cambiar estrategia a modelos más baratos**
```bash
curl -X POST http://localhost:3001/api/admin/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_strategy": {
      "code": "anthropic/claude-sonnet-3.5",
      "marketing": "anthropic/claude-haiku-3",
      "email": "anthropic/claude-haiku-3",
      "twitter": "anthropic/claude-haiku-3",
      "analytics": "openai/gpt-4o-mini"
    }
  }'
```

3. **Establecer alertas**
```bash
curl -X POST http://localhost:3001/api/admin/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cost_alert_threshold": 50.0,
    "max_daily_cost": 100.0,
    "auto_pause_expensive_companies": true
  }'
```

---

## 🎯 Dashboard Admin (UI Sugerido)

```
┌─────────────────────────────────────┐
│  💰 Costos Hoy: $45.23 / $100      │
│  ⚠️  75 empresas activas            │
│  🤖 Claude Sonnet 4: $30.50        │
│  🤖 Claude Haiku: $10.20           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ⚙️  Configuración de Modelos      │
│                                     │
│  API Key: ***...xyz4                │
│  [Cambiar]                          │
│                                     │
│  Estrategia:                        │
│  • Código: Claude Sonnet 4 ($15/M)  │
│  • Marketing: Claude Haiku ($1.25/M)│
│  • Email: Claude Haiku ($1.25/M)    │
│                                     │
│  [Guardar Cambios]                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  📊 Top Empresas Más Caras         │
│                                     │
│  1. EmpresaX - $15.40              │
│  2. StartupY - $8.20               │
│  3. ProjectZ - $5.10               │
└─────────────────────────────────────┘
```

---

## ✅ Todo Listo

Ahora como admin puedes:

✅ Configurar tu API key de OpenRouter  
✅ Seleccionar qué modelos usar  
✅ Ver costos en tiempo real  
✅ Recibir alertas si te pasas de presupuesto  
✅ Ver qué empresas gastan más  
✅ Cambiar estrategia para ahorrar costos  

**Migración SQL**: `database/migrations/003_add_settings.sql`  
**Rutas API**: `backend/routes/admin-settings.js`
