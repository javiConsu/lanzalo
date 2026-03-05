# Daily Syncs - Team Standup System

Sistema de reuniones diarias automáticas del equipo de agentes.

---

## 🎯 Qué es

Cada día, tu equipo de 7 agentes tiene un "daily standup" automático:

1. **Recopilan reportes** de cada agente (qué hicieron ayer)
2. **CEO Agent analiza** con LLM (wins, issues, trends)
3. **Toma decisiones** autónomas (crea tareas si es necesario)
4. **Te envía resumen** por email (2 minutos de lectura)

---

## 📊 Contenido del Daily Sync

### Summary
Resumen ejecutivo de 2-3 frases sobre lo que pasó ayer.

### Wins 🎉
- Achievements específicos de cada agente
- Resultados concretos ("Code Agent desplegó X")
- 2-4 highlights

### Issues ⚠️
- Tareas que fallaron
- Errores recurrentes
- Bottlenecks detectados
- 0-3 problemas

### Trends 📊
- Revenue: ↗️↘️→
- Traffic: ↗️↘️→
- Engagement: ↗️↘️→
- Notas: Análisis breve de tendencias

### Decisions 🎯
Acciones que el CEO Agent decidió tomar HOY:
- **Action**: Título específico de la tarea
- **Reasoning**: Por qué es necesario ahora
- **Agent**: Quién debe hacerlo (code/research/twitter/etc)
- **Priority**: high/medium/low

**IMPORTANTE**: CEO Agent crea las tareas automáticamente.

### Recommendations 💡
Sugerencias estratégicas para el usuario:
- Cosas en las que enfocarse
- Oportunidades detectadas
- 1-3 recomendaciones

---

## 🔄 Flujo de Ejecución

```
1. Cron job (cada hora)
   ↓
2. Verifica qué companies necesitan sync
   (basado en daily_sync_time)
   ↓
3. Para cada company:
   a. Gather agent reports (tareas completadas/falladas ayer)
   b. CEO Agent analyzes con LLM
   c. Guarda en DB (daily_syncs table)
   d. Crea tareas de decisions autónomas
   e. Envía email al usuario
   ↓
4. Actualiza last_sync_at
```

---

## 🗄️ Database Schema

### daily_syncs table

```sql
CREATE TABLE daily_syncs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  sync_date DATE NOT NULL,          -- Fecha del reporte (ayer)
  summary TEXT NOT NULL,             -- Resumen ejecutivo
  wins TEXT,                         -- JSON array
  issues TEXT,                       -- JSON array
  trends TEXT,                       -- JSON object
  decisions TEXT,                    -- JSON array
  recommendations TEXT,              -- JSON array
  agent_reports TEXT,                -- JSON array (detailed)
  metrics_snapshot TEXT,             -- JSON object
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE(company_id, sync_date)
);
```

### companies updates

```sql
ALTER TABLE companies ADD COLUMN daily_sync_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN daily_sync_time TEXT DEFAULT '09:00';
ALTER TABLE companies ADD COLUMN last_sync_at TIMESTAMP;
```

---

## 🚀 API Endpoints

### GET /api/user/companies/:companyId/syncs

Lista de daily syncs históricos.

**Query params**:
- `limit`: Número de syncs a retornar (default: 30)

**Response**:
```json
{
  "syncs": [
    {
      "id": "uuid",
      "companyId": "uuid",
      "syncDate": "2026-03-04",
      "summary": "...",
      "wins": ["...", "..."],
      "issues": ["..."],
      "trends": {...},
      "decisions": [{...}],
      "recommendations": ["..."],
      "createdAt": "2026-03-05T09:00:00Z"
    }
  ]
}
```

### GET /api/user/companies/:companyId/syncs/:syncId

Detalle completo de un sync (incluye agent_reports y metrics_snapshot).

**Response**:
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "syncDate": "2026-03-04",
  "summary": "...",
  "wins": ["..."],
  "issues": ["..."],
  "trends": {...},
  "decisions": [{...}],
  "recommendations": ["..."],
  "agentReports": [
    {
      "agent": "code",
      "tasksCompleted": 3,
      "tasksFailed": 0,
      "highlights": [...]
    }
  ],
  "metricsSnapshot": [...],
  "createdAt": "2026-03-05T09:00:00Z"
}
```

### POST /api/user/companies/:companyId/syncs/run

Ejecutar sync manualmente (para testing).

**Response**:
```json
{
  "success": true,
  "message": "Daily sync started. Check back in a few seconds."
}
```

### PATCH /api/user/companies/:companyId/sync-settings

Actualizar configuración del daily sync.

**Body**:
```json
{
  "enabled": true,
  "time": "09:00"  // HH:MM format
}
```

---

## 📧 Email Template

```
Subject: ☀️ Tu equipo se reunió — 3 wins, 1 issue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Daily Sync — MentorMatch
Martes, 5 Marzo 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tu equipo completó 12 tareas ayer. Landing page 
tuvo 47 visitantes (+12% vs semana pasada). 
Email Agent envió 8 cold emails, 2 respuestas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 WINS

• Code Agent desplegó nueva feature: "Pricing table"
• Email Agent: 2 respuestas positivas (25% tasa)
• Twitter Agent: Tweet alcanzó 340 views

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ISSUES

• Meta Ads pausadas (presupuesto alcanzado)
• Browser Agent: Error scraping LinkedIn (3x)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 TRENDS

Revenue: → (sin cambios, $0)
Traffic: ↗️ (+12% vs semana pasada)
Engagement: ↗️ (2 emails respondidos)

Nota: Tráfico creciendo consistentemente. 
Considera activar monetización pronto.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 DECISIONS MADE

1. Reactivar Meta Ads con budget ajustado
   → Reasoning: Traffic converting bien
   → Marketing Agent • ALTA PRIORIDAD

2. Crear landing alternativa para cold emails
   → Reasoning: 25% response rate es buena
   → Code Agent • MEDIA PRIORIDAD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 RECOMMENDATIONS

• Considera añadir testimonios a landing
• Email responses son buenas — escala 2x
• LinkedIn scraping fallando — prueba manual

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Ver dashboard completo →]

Lanzalo
Tu equipo de IA trabajando 24/7
```

---

## 🔧 Setup

### 1. Run Migration

```bash
# Desde /lanzalo
node scripts/migrate.js 009_add_daily_syncs.sql
```

### 2. Sistema Auto-Start

El server ya está configurado para iniciar daily syncs automáticamente.

Cuando ejecutas `npm start`:
- ✅ Task Executor (polls backlog cada 10s)
- ✅ Daily Sync Scheduler (chequea cada hora)
- ✅ Agent Orchestrator (coordinación)

### 3. Test Manual

```bash
curl -X POST http://localhost:3001/api/user/companies/{companyId}/syncs/run \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Luego:
```bash
curl http://localhost:3001/api/user/companies/{companyId}/syncs
```

---

## 💡 Pattern Detection

CEO Agent puede detectar patrones:

### 3 días seguidos con mismo error
→ Escala prioridad
→ Notifica al usuario
→ Sugiere solución alternativa

### Traffic creciendo 3 días seguidos
→ Sugiere activar monetización
→ Recomienda escalar marketing

### 5+ tareas fallando (mismo agente)
→ Issue crítico
→ Email de alerta inmediato

---

## 🎯 Autonomous Decisions

CEO Agent puede crear tareas automáticamente basado en:

1. **Oportunidades detectadas**
   - Traffic creciendo → Activar Meta Ads
   - Email response rate alta → Escalar outreach

2. **Problemas recurrentes**
   - 3 errores iguales → Crear tarea de fix
   - Presupuesto agotado → Ajustar config

3. **Optimizaciones**
   - A/B test ganador → Deploy full
   - Feature funcionando bien → Promover más

**Límite**: Máximo 3 decisiones por día (para no abrumar)

---

## 📊 Analytics Value

### Para Usuario:
- ✅ Sabe qué pasa cada día
- ✅ Ve progreso tangible
- ✅ Detecta problemas temprano
- ✅ Decisiones tomadas por IA (autonomía)

### Para Lanzalo:
- ✅ Engagement diario (email cada mañana)
- ✅ Retention (usuario ve valor constante)
- ✅ Data sobre qué agentes funcionan mejor
- ✅ Debugging (qué falla frecuentemente)

---

## 🚀 Diferenciación vs Competencia

| Feature | Lovable | v0 | Bolt | **Lanzalo** |
|---------|---------|----|----|-------------|
| Daily team syncs | ❌ | ❌ | ❌ | ✅ 🔥 |
| Autonomous decisions | ❌ | ❌ | ❌ | ✅ 🔥 |
| Trend detection | ❌ | ❌ | ❌ | ✅ 🔥 |
| Email updates | ⚠️ | ❌ | ❌ | ✅ |

**Nadie más tiene esto.**

---

## 📝 TODO

- [ ] Implementar React Email template
- [ ] Integración con Resend
- [ ] Dashboard UI para ver syncs históricos
- [ ] Pattern detection avanzada
- [ ] Alerts de issues críticos (Slack/email)
- [ ] Weekly rollup (resumen semanal)

---

## 🎭 Marketing Angle

**Tagline**: "Tu equipo se reúne cada día. Tú solo lees el resumen."

**Benefit**: Transparencia + Control + Autonomía

**Promise**: "Sabrás exactamente qué hace tu equipo de IA, cada día."

**Landing page copy**:
```
Tu equipo se reúne cada día

Cada mañana, tus 7 agentes tienen un daily sync.

Reportan qué hicieron, qué problemas encontraron, 
y qué van a hacer hoy.

El CEO Agent analiza todo, toma decisiones, 
y te manda un resumen en 2 minutos.

Como un equipo real. Pero sin las reuniones eternas.
```
