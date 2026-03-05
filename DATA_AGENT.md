# 📊 Data Agent - Business Intelligence & Analytics

## ¿Qué es?

El **Data Agent** es el analista de datos del sistema. Ejecuta SQL queries, calcula métricas, genera reportes y proporciona business intelligence.

**Capacidades**:
- ✅ Ejecutar SQL queries (SQLite)
- ✅ Calcular métricas (tasks, emails, tweets, features)
- ✅ Generar reportes estructurados
- ✅ Build dashboards (data structures)
- ✅ Análisis de tendencias y patrones
- ✅ Recomendaciones accionables

---

## 🎯 Tipos de Tareas

### 1. **SQL Queries** - Consultas directas

El agente genera y ejecuta SQL queries:

```bash
# Tarea SQL
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "SQL query",
    "description": "Cuántas tareas se han completado en los últimos 7 días",
    "tag": "data"
  }'

# Data Agent:
# 1. Lee schema de la DB
# 2. Genera SQL query con LLM
# 3. Ejecuta query
# 4. Analiza resultados con LLM
# 5. Crea reporte

# Query generada:
SELECT 
  COUNT(*) as completed_tasks,
  DATE(completed_at) as date
FROM tasks
WHERE company_id = 'xxx'
  AND status = 'completed'
  AND completed_at >= date('now', '-7 days')
GROUP BY DATE(completed_at)
ORDER BY date;

# Análisis:
"Has completado 23 tareas en los últimos 7 días.
El día más productivo fue ayer con 6 tareas.
Recomendación: Mantener este ritmo para alcanzar objetivo mensual."
```

### 2. **Métricas** - KPIs y stats

Calcula métricas automáticas:

```bash
{
  "title": "Calcular métricas",
  "description": "Métricas de la última semana",
  "tag": "data"
}

# Resultado:
📊 Métricas calculadas

Tareas: 23/45 completadas (51%)
Emails: 12 enviados (8 abiertos, 67%)
Tweets: 5 generados
Features: 8 implementadas

Análisis:
- Tasa de completación de tareas mejoró 15% vs semana pasada
- Email open rate sobre el promedio (50% típico)
- Recomienda: Aumentar frecuencia de tweets (solo 2.5/semana)
```

### 3. **Reportes** - Business intelligence

Genera reportes completos en markdown:

```bash
{
  "title": "Reporte semanal",
  "description": "Generar reporte de actividad semanal",
  "tag": "data"
}

# Resultado: Reporte markdown estructurado
# Resumen Ejecutivo
# Métricas Clave
# Análisis
# Tendencias
# Recomendaciones
# Próximos Pasos
```

### 4. **Dashboards** - Data structures

Construye estructuras de datos para dashboards:

```bash
{
  "title": "Build dashboard",
  "description": "Dashboard con métricas principales",
  "tag": "data"
}

# Resultado:
{
  "title": "Dashboard: Mi Empresa",
  "widgets": [
    {
      "type": "stat",
      "title": "Tareas Completadas",
      "value": 23,
      "total": 45,
      "percentage": 51
    },
    {
      "type": "list",
      "title": "Features",
      "items": ["Analytics", "Pagos", "Blog", ...]
    }
  ],
  "metrics": { ... }
}
```

### 5. **Análisis** - Tendencias y patrones

Análisis profundo de datos:

```bash
{
  "title": "Analizar tendencias",
  "description": "Identificar patrones en las últimas 4 semanas",
  "tag": "data"
}

# LLM analiza y detecta:
# - Patrones (picos de actividad los martes)
# - Anomalías (caída de emails abiertos)
# - Correlaciones (más tweets → más tareas completadas)
# - Recomendaciones (optimizar horario de envío)
```

---

## 📊 Métricas Disponibles

El Data Agent calcula automáticamente:

### 1. **Tasks** (Tareas)

```json
{
  "total": 45,
  "completed": 23,
  "failed": 2,
  "in_progress": 5,
  "pending": 15
}
```

### 2. **Emails**

```json
{
  "total": 25,
  "sent": 12,
  "opened": 8,
  "clicked": 3
}
```

### 3. **Tweets**

```json
{
  "total": 8,
  "published": 0
}
```

### 4. **Reports**

```json
{
  "total": 15,
  "byType": [
    { "type": "research", "count": 6 },
    { "type": "data_analysis", "count": 5 },
    { "type": "financial", "count": 4 }
  ]
}
```

### 5. **Features** (de memoria Layer 1)

```json
{
  "total": 8,
  "list": [
    "Dashboard",
    "Analytics",
    "Payments",
    "Blog",
    "SEO",
    "Email marketing",
    "Google Analytics",
    "Contact form"
  ]
}
```

---

## 🔍 SQL Query Generation

### Proceso:

1. **Lee schema de la DB** (todas las tablas y columnas)
2. **LLM genera SQL** basado en tarea + schema
3. **Valida y limpia** query (remover markdown, comentarios)
4. **Ejecuta** query (con límites de seguridad)
5. **Analiza resultados** con LLM (insights + recomendaciones)

### Ejemplo:

```
Usuario: "¿Cuántas tareas falló cada agente?"

Data Agent genera:
SELECT 
  assigned_to as agent,
  COUNT(*) as failed_tasks
FROM tasks
WHERE company_id = 'xxx'
  AND status = 'failed'
GROUP BY assigned_to
ORDER BY failed_tasks DESC;

Ejecuta → Resultados:
browser-agent: 2
code-agent: 1

Análisis con LLM:
"Browser Agent tiene el doble de fallos. Revisar logs de navegación 
y errores de timeout. Posible problema: sitios con CAPTCHA."
```

---

## 📈 Reportes Estructurados

### Formato estándar (Markdown):

```markdown
# Reporte: [Título]

## Resumen Ejecutivo
- Métrica 1: Valor (tendencia)
- Métrica 2: Valor (tendencia)
- Métrica 3: Valor (tendencia)

## Métricas Clave
| Métrica | Valor | Objetivo | Estado |
|---------|-------|----------|--------|
| Tareas completadas | 23/45 | 40 | ⚠️ |
| Email open rate | 67% | 50% | ✅ |

## Análisis
[Insights detectados por LLM]

## Tendencias
- Semana pasada: 18 tareas
- Esta semana: 23 tareas (+28%)

## Recomendaciones
1. Acción concreta 1
2. Acción concreta 2
3. Acción concreta 3

## Próximos Pasos
[Qué hacer a continuación]

---
Generated: 2026-03-05T20:30:00Z
```

---

## 🎮 Casos de Uso

### Caso 1: Dashboard de Métricas

```
Usuario: "Muéstrame métricas de esta semana"

CEO Agent: Crea tarea tag='data' type='metrics'
Data Agent:
  1. Calcula todas las métricas
  2. Analiza con LLM
  3. Genera reporte
  
Resultado en chat:
"📊 Métricas de la semana:

Tareas: 23/45 (51%)
Emails: 12 enviados (67% open rate)
Tweets: 5 generados
Features: 8 activas

Análisis: Tasa de completación arriba 15% vs semana pasada.
Email performance excelente. Recomienda aumentar tweets a 2/día."
```

### Caso 2: SQL Ad-hoc

```
Usuario: "¿Qué agente es más productivo?"

CEO Agent: Crea tarea tag='data'
Data Agent:
  1. Genera SQL query
  2. Ejecuta
  3. Analiza resultados

Query:
SELECT 
  assigned_to,
  COUNT(*) as tasks,
  AVG(JULIANDAY(completed_at) - JULIANDAY(started_at)) as avg_time_days
FROM tasks
WHERE status = 'completed'
GROUP BY assigned_to
ORDER BY tasks DESC;

Resultado:
"Code Agent es el más productivo (18 tareas completadas).
Browser Agent tiene mejor tiempo promedio (0.5 días vs 1.2)."
```

### Caso 3: Reporte Mensual

```
Usuario: "Genera reporte del mes"

CEO Agent: Crea tarea tag='data' type='report'
Data Agent:
  1. Calcula métricas mensuales
  2. Detecta tendencias
  3. Genera reporte estructurado en markdown
  4. Guarda en tabla reports

Resultado: Reporte completo con análisis de 30 días
```

### Caso 4: Análisis de Tendencias

```
Usuario: "¿Por qué bajaron los emails abiertos?"

CEO Agent: Crea tarea tag='data'
Data Agent:
  1. Query: emails por semana (opens, clicks)
  2. Detecta caída en semana 3
  3. Analiza variables (subject lines, timing)
  4. LLM genera hipótesis

Resultado:
"Caída de 75% a 45% en open rate coincide con:
- Cambio de horario de envío (9am → 6pm)
- Subject lines más largos (>50 chars)
Recomendación: Volver a enviar 9-11am, subjects <40 chars."
```

---

## 🔒 Seguridad SQL

### Protecciones:

1. **Company scoping**: Queries automáticamente filtran por `company_id`
2. **Read-only**: Solo SELECT queries (no DELETE/UPDATE/DROP)
3. **LIMIT automático**: Queries grandes limitadas
4. **Schema validation**: Solo tablas existentes
5. **Timeout**: 30 segundos max por query

### Queries bloqueadas:

```sql
-- ❌ No permitido
DELETE FROM tasks WHERE id = 'xxx';
DROP TABLE tasks;
UPDATE users SET is_admin = 1;

-- ✅ Permitido
SELECT * FROM tasks WHERE company_id = 'xxx' LIMIT 100;
SELECT COUNT(*) FROM emails WHERE company_id = 'xxx';
```

---

## 📊 Integración con Otros Agentes

### Data → CEO → Usuario

```
Data Agent calcula métricas
  ↓
CEO Agent resume hallazgos
  ↓
Usuario recibe insights accionables
```

### Research → Data

```
Research Agent scrapes competitor data
  ↓
Data Agent analiza y compara con métricas propias
  ↓
Reporte competitivo
```

### Financial → Data

```
Financial Agent ejecuta análisis
  ↓
Data Agent valida números
  ↓
Decisiones basadas en datos reales
```

---

## 🚀 Testing

### 1. Calcular métricas

```bash
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/chat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Calcula métricas de esta semana"}'

# Data Agent ejecuta automáticamente
# Resultado en chat con todas las métricas
```

### 2. SQL query

```bash
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "SQL query",
    "description": "Cuántos emails cold he enviado este mes",
    "tag": "data"
  }'

# Espera 10s (polling)
# Data Agent genera + ejecuta query
# Notifica resultado
```

### 3. Reporte completo

```bash
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/chat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Genera reporte semanal completo"}'

# Data Agent crea reporte markdown
# Guardado en tabla reports
# Link en respuesta
```

---

## ⚙️ Configuración

### Database Schema Discovery

Auto-detecta todas las tablas:
- `companies`
- `tasks`
- `tweets`
- `emails`
- `reports`
- `memory`
- `users`
- etc.

### LLM Settings

```javascript
{
  taskType: 'data',
  temperature: 0.2 // Bajo para SQL (precisión)
             0.5 // Medio para análisis
             0.6 // Alto para reportes (creatividad)
}
```

---

## 📋 Roadmap

### ✅ Implementado

- [x] SQL query generation
- [x] Métricas automáticas
- [x] Reportes estructurados
- [x] Dashboard data structures
- [x] Análisis con LLM
- [x] Schema discovery

### ⏳ Próximas Mejoras

- [ ] Time series analysis (tendencias históricas)
- [ ] Predicciones (ML básico)
- [ ] Visualizaciones (charts en reportes)
- [ ] Alertas automáticas (métricas fuera de rango)
- [ ] Benchmarking (comparar con otras empresas)
- [ ] Export a CSV/Excel

---

## ✅ Conclusión

**Data Agent FUNCIONANDO**:

- ✅ SQL queries automáticas
- ✅ Métricas de tasks, emails, tweets, features
- ✅ Reportes estructurados (markdown)
- ✅ Dashboard data structures
- ✅ Análisis con LLM (insights + recomendaciones)
- ✅ Schema auto-discovery
- ✅ Seguridad (read-only, company scoping)

**Los agentes ahora pueden:**
- 📊 Calcular métricas automáticamente
- 🔍 Ejecutar SQL queries inteligentes
- 📈 Generar reportes de BI
- 💡 Proporcionar insights accionables
- 🎯 Detectar tendencias y patrones

**6 agentes activos**: Code, Research, Browser, Twitter, Email, Data

**Progreso: ~90% de paridad con Polsia** 🎯
