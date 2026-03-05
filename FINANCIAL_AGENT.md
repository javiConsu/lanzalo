# 🤖 Financial Agent - Agente Autónomo de Decisiones Financieras

## ¿Qué Hace?

El **Financial Agent** analiza automáticamente la situación financiera de la plataforma y **toma decisiones** basadas en datos.

---

## 🧠 Decisiones que Toma

### 1. **Pricing**
- ✅ Si margen < 30% → **Subir precio** ($39 → $49)
- ✅ Si margen > 70% → **Bajar precio** ($39 → $29) para crecer

### 2. **Empresas No Rentables**
- ✅ Plan FREE gastando > $10/mes → **Forzar upgrade** (pausar hasta que paguen)
- ✅ Plan FREE gastando > $5/mes → **Limitar quotas** ($2/día máximo)
- ✅ Plan PRO gastando > $50/mes → **Usar modelos baratos** (Haiku en vez de Sonnet)

### 3. **Optimización de Costos**
- ✅ Si costos LLM > 50% MRR → **Cambiar a modelos baratos globalmente**

### 4. **Growth**
- ✅ Si profit > $200 y margen > 50% → **Invertir en marketing** (30% del profit)

### 5. **Alertas**
- ✅ Si no estás en break-even → **Alerta de usuarios necesarios**

---

## 🎯 Proceso de Ejecución

```
1. OBTENER DATOS
   ├─ MRR actual
   ├─ Costos LLM
   ├─ Costos por empresa
   └─ Margen de profit

2. ANALIZAR CON LLM
   ├─ Status (healthy/warning/critical)
   ├─ Problemas detectados
   ├─ Riesgos
   └─ Oportunidades

3. TOMAR DECISIONES
   ├─ Pricing
   ├─ Acciones por empresa
   ├─ Optimización de costos
   └─ Growth

4. EJECUTAR ACCIONES
   ├─ Auto-ejecutables (quotas, modelos)
   └─ Requieren aprobación (pricing)

5. REPORTAR
   └─ Log de decisiones y acciones
```

---

## 📡 Endpoints

### Ejecutar Agent Manualmente

```bash
POST /api/admin/agent/financial/run

Response:
{
  "success": true,
  "analysis": {
    "status": "warning",
    "summary": "Margen bajo. 3 empresas no rentables detectadas.",
    "problems": [
      "Margen de profit solo 28%",
      "StartupY (FREE) gastando $45/mes"
    ],
    "risks": [
      "Si costos siguen subiendo, entrarás en pérdidas"
    ],
    "opportunities": [
      "Upgrade forzado puede generar $90/mes adicionales"
    ]
  },
  "decisions": [
    {
      "type": "pricing",
      "action": "increase_price",
      "from": 39,
      "to": 49,
      "reason": "Margen muy bajo (28%). Aumentar precio mejorará rentabilidad.",
      "priority": "high",
      "autoExecute": false
    },
    {
      "type": "company_action",
      "action": "force_upgrade",
      "companyId": "...",
      "companyName": "StartupY",
      "reason": "Plan FREE gastando $45/mes. Forzar upgrade a Pro.",
      "priority": "high",
      "autoExecute": true
    },
    {
      "type": "company_action",
      "action": "limit_quotas",
      "companyId": "...",
      "companyName": "ProjectZ",
      "reason": "Plan FREE gastando $8/mes. Limitar quotas.",
      "priority": "medium",
      "autoExecute": true
    }
  ],
  "actions": [
    {
      "decision": {...},
      "executed": true,
      "result": {
        "success": true,
        "message": "Empresa pausada. Email de upgrade enviado."
      }
    },
    {
      "decision": {...},
      "executed": true,
      "result": {
        "success": true,
        "message": "Quotas limitadas a $2/día"
      }
    }
  ],
  "message": "Análisis financiero completado"
}
```

### Aprobar Decisión Pendiente

```bash
POST /api/admin/agent/financial/approve

Body:
{
  "decisionId": "...",
  "approved": true
}
```

### Configurar Auto-Run

```bash
POST /api/admin/agent/financial/schedule

Body:
{
  "enabled": true,
  "frequency": "daily"  // daily, weekly, manual
}
```

---

## 🎮 Ejemplos de Uso

### Ejecutar Agent Manualmente

```bash
# Login admin
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lanzalo.local","password":"admin123"}')

TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Ejecutar Financial Agent
curl -X POST http://localhost:3001/api/admin/agent/financial/run \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📊 Reporte de Ejemplo

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 FINANCIAL AGENT - REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STATUS: WARNING
📝 Margen bajo. 3 empresas no rentables detectadas.

⚠️  PROBLEMAS DETECTADOS:
   - Margen de profit solo 28%
   - StartupY (FREE) gastando $45/mes
   - ProjectZ (FREE) gastando $8/mes

🎯 DECISIONES TOMADAS: 5
   🚨 1. [pricing] increase_price
      Margen muy bajo (28%). Aumentar precio mejorará rentabilidad.
      Auto: NO (requiere aprobación)
   
   ⚠️ 2. [company_action] force_upgrade
      Plan FREE gastando $45/mes. Forzar upgrade a Pro.
      Auto: SÍ
   
   ℹ️ 3. [company_action] limit_quotas
      Plan FREE gastando $8/mes. Limitar quotas.
      Auto: SÍ

✅ ACCIONES EJECUTADAS: 2/5
   1. force_upgrade (StartupY)
      → Empresa pausada. Email de upgrade enviado.
   
   2. limit_quotas (ProjectZ)
      → Quotas limitadas a $2/día

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ⚙️ Configuración

### Auto-Ejecución vs Manual

**Manual** (por defecto):
- Tú ejecutas cuando quieras
- Revisas decisiones antes de aprobar

**Auto (cron diario)**:
- Corre todos los días a las 9 AM
- Acciones marcadas con `autoExecute: true` se ejecutan automáticamente
- Acciones con `autoExecute: false` te notifican para aprobación

---

## 🔐 Seguridad

### Acciones Auto-Ejecutables (Sin Aprobación)

✅ Limitar quotas de empresas FREE  
✅ Cambiar a modelos más baratos  
✅ Pausar empresas abusivas  

### Acciones que Requieren Aprobación

⚠️ Cambiar precio global  
⚠️ Invertir en marketing  
⚠️ Cambiar estrategia de modelos globalmente  

---

## 🎯 Casos de Uso

### Caso 1: Empresa FREE Abusando

**Detecta**:
- StartupY (FREE) gastando $45/mes
- Revenue: $0
- Loss: -$45/mes

**Decisión Automática**:
```
→ Pausar empresa
→ Enviar email: "Tu uso excede el plan FREE. Upgrade a Pro por $39/mes"
→ Resultado: Empresa pausada hasta que paguen
```

---

### Caso 2: Margen Bajo

**Detecta**:
- Profit margin: 28% (bajo)
- Costos creciendo

**Decisión (Requiere Aprobación)**:
```
→ Sugerir subir precio de $39 a $49
→ Tú decides: Aprobar o Rechazar
→ Si apruebas: Nuevo precio se aplica a próximos usuarios
```

---

### Caso 3: Profit Alto

**Detecta**:
- Profit: $300/mes
- Margin: 65%

**Decisión**:
```
→ Invertir $90 (30%) en marketing
→ Objetivo: Adquirir más usuarios
→ Mantener crecimiento
```

---

## ✅ Ventajas

1. **Automatización Total**
   - No tienes que revisar costos manualmente
   - Agent lo hace por ti

2. **Decisiones Basadas en Datos**
   - Usa LLM para analizar
   - Toma decisiones óptimas

3. **Protección de Márgenes**
   - Detecta empresas problemáticas
   - Actúa antes de que te cuesten mucho

4. **Escalabilidad**
   - Con 1000 empresas, el agent sigue funcionando
   - Tú solo apruebas decisiones críticas

---

## 🚀 Próximos Pasos

1. **Correr agent manualmente** (ahora)
2. **Revisar decisiones** que tomó
3. **Aprobar/rechazar** las que requieren OK
4. **Configurar auto-run** (opcional)

---

**El agent está listo para tomar el control de tus finanzas.** 🤖💰
