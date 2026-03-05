# 🔍 Trend Scout Agent - Descubridor de Oportunidades

## ¿Qué es?

El **Trend Scout Agent** escanea internet 24/7 buscando **oportunidades de negocio validadas** con demanda real.

**Problema que resuelve**:
- ❌ Emprendedores sin idea de qué construir
- ❌ Horas buscando ideas manualmente
- ❌ Ideas sin validación de mercado

**Solución**:
- ✅ Ideas curadas automáticamente
- ✅ Demanda probada (pain points reales)
- ✅ Score de viabilidad (0-100)
- ✅ Listo para lanzar con 1 click

---

## 🌐 Fuentes que Escanea

### **Implementado** ✅

1. **Reddit** 📱
   - r/Entrepreneur
   - r/SaaS
   - r/startups
   - r/SideProject
   - r/smallbusiness
   - r/EntrepreneurRideAlong
   - r/IMadeThis

2. **Hacker News** 🔶
   - Ask HN threads
   - Show HN products
   - Comments con pain points

### **Pendiente** ⏳

3. **Twitter** 🐦 (requiere API keys)
   - "I wish there was..."
   - "Why doesn't X exist?"
   - "Looking for a solution..."

4. **Product Hunt** 🚀 (requiere API token)
   - Productos lanzados
   - Comentarios pidiendo features
   - Productos fallidos

5. **TikTok** 📹 (scraping avanzado - fase 2)
   - Trends virales
   - Comments con pain points

6. **Indie Hackers** 💼 (API disponible)
   - Milestones de revenue
   - Problemas sin resolver

---

## 🎯 Cómo Funciona

### **Flujo Completo**:

```
1. SCAN (cada 24h o manual)
   ↓
   Escanea Reddit + HN + (Twitter/PH si configurado)
   Recopila posts/threads relevantes
   
2. ANALYZE (LLM)
   ↓
   Extrae pain points
   Identifica patrones
   Detecta demanda recurrente
   
3. SCORE (algoritmo)
   ↓
   Dificultad: easy = +30, medium = +20, hard = +10
   Revenue: +20 max según potencial
   Categoría: SaaS = +10, tool = +8
   
4. SAVE (DB)
   ↓
   Guarda en tabla discovered_ideas
   Deduplicación por título
   
5. REPORT
   ↓
   Top 10 ideas con análisis
   Guardado en tabla reports
```

---

## 📊 Sistema de Scoring

```javascript
Score base: 40 puntos

+ Dificultad:
  - easy: +30
  - medium: +20
  - hard: +10

+ Revenue potencial:
  - $1K-2K: +10 puntos
  - $2K-5K: +20 puntos
  - $5K+: +20 puntos (cap)

+ Categoría:
  - SaaS: +10
  - Tool: +8
  - Marketplace: +5
  - Service: +3

Total: Max 100 puntos
```

**Ejemplo**:

```
Idea: "Plataforma de mentorías para devs junior"
- Base: 40
- Dificultad (easy): +30
- Revenue ($2K-5K): +20
- Categoría (marketplace): +5
→ Score: 95/100
```

---

## 🗄️ Base de Datos

```sql
CREATE TABLE discovered_ideas (
  id TEXT PRIMARY KEY,
  
  -- Idea
  title TEXT, -- "Plataforma de mentorías para devs"
  problem TEXT, -- Pain point específico
  target_audience TEXT, -- "Devs junior, bootcamp grads"
  
  -- Validación
  evidence TEXT, -- "150+ tweets pidiendo mentor"
  source TEXT, -- reddit, hackernews, twitter
  source_url TEXT,
  
  -- Clasificación
  category TEXT, -- saas, marketplace, tool, service
  difficulty TEXT, -- easy, medium, hard
  potential_revenue TEXT, -- "$2K-5K/mes"
  score INTEGER, -- 0-100
  
  -- Stats
  discovered_at TEXT,
  times_shown INTEGER, -- Veces mostrada a usuarios
  times_launched INTEGER -- Veces lanzada como negocio
);
```

---

## 📡 API Endpoints

### 1. **Listar Ideas**

```bash
GET /api/ideas?category=saas&minScore=80&limit=20

Response:
{
  "ideas": [
    {
      "id": "...",
      "title": "Plataforma de mentorías",
      "problem": "Devs junior no encuentran mentores",
      "target_audience": "Developers junior",
      "evidence": "150+ tweets, 20+ Reddit posts",
      "source": "reddit",
      "category": "marketplace",
      "difficulty": "easy",
      "potential_revenue": "$2K-5K/mes",
      "score": 95
    }
  ]
}
```

**Filtros**:
- `category`: saas, marketplace, tool, service
- `difficulty`: easy, medium, hard
- `minScore`: 0-100
- `limit`: número de resultados
- `offset`: paginación

### 2. **Ver Idea Específica**

```bash
GET /api/ideas/:ideaId

Response:
{
  "idea": { ... }
}
```

### 3. **Lanzar Idea** (crear empresa)

```bash
POST /api/ideas/:ideaId/launch
Authorization: Bearer {token}

Body:
{
  "customizations": {
    "name": "Mentor Match" // Opcional
  }
}

Response:
{
  "success": true,
  "company": {
    "id": "...",
    "name": "Mentor Match",
    "subdomain": "mentor-match-xyz.lanzalo.app"
  },
  "message": "Empresa creada. Code Agent generando landing..."
}
```

**Lo que pasa**:
1. Crea empresa en DB
2. Pre-llena: nombre, descripción, audiencia
3. Crea tarea para Code Agent
4. Code Agent genera landing page
5. Usuario ve su negocio en `subdomain.lanzalo.app`

### 4. **Stats** (Admin only)

```bash
GET /api/ideas/stats
Authorization: Bearer {admin-token}

Response:
{
  "stats": [
    {
      "total": 45,
      "avg_score": 78,
      "total_launches": 12,
      "category": "saas",
      "count_by_category": 20
    }
  ]
}
```

---

## 🎮 User Experience

### **En Landing Page**:

```
┌──────────────────────────────────────────┐
│                                          │
│  💡 Ideas Validadas con Demanda Real     │
│                                          │
│  [ Ver todas ]  [ SaaS ]  [ Easy ]       │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 🔥 95/100                          │  │
│  │                                    │  │
│  │ Plataforma de Mentorías            │  │
│  │ para Developers Junior             │  │
│  │                                    │  │
│  │ 💰 $2K-5K/mes  ⚡ Easy             │  │
│  │                                    │  │
│  │ 📊 150+ personas pidiendo esto     │  │
│  │    en Twitter y Reddit             │  │
│  │                                    │  │
│  │ [ Ver detalles ]  [ Lanzar idea ]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 🔥 87/100                          │  │
│  │ Herramienta de Pricing para SaaS  │  │
│  │ ...                                │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

### **Click en "Lanzar idea"**:

```
1. Login (si no está autenticado)
2. Modal de confirmación:
   "¿Crear negocio basado en esta idea?"
   [ Personalizar nombre ]
   [ Confirmar ]
3. Empresa creada → redirect a dashboard
4. Code Agent generando landing (visible en backlog)
5. 2-5 minutos → landing lista en subdomain.lanzalo.app
```

---

## 🧪 Testing

### 1. **Ejecutar manualmente**

```bash
TOKEN="admin-token"

# Crear tarea para Trend Scout Agent
curl -X POST http://localhost:3001/api/user/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Escanear oportunidades",
    "description": "Buscar ideas en Reddit y HN",
    "tag": "trends",
    "priority": "high"
  }'

# Esperar 30-60 segundos (escanea + analiza con LLM)

# Ver ideas descubiertas
curl http://localhost:3001/api/ideas?minScore=70
```

### 2. **Auto-ejecutar diariamente** (cron)

```javascript
// Crear cron job
POST /api/admin/cron/jobs

{
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * *", // Cada día a las 9am
    "tz": "UTC"
  },
  "payload": {
    "kind": "systemEvent",
    "text": "Ejecutar Trend Scout Agent"
  },
  "delivery": {
    "mode": "announce"
  }
}
```

---

## 🔥 Casos de Uso

### **Caso 1: Usuario sin idea**

```
Usuario visita lanzalo.pro
  ↓
Ve sección "Ideas Validadas"
  ↓
Explora 20+ ideas con demanda probada
  ↓
Click "Lanzar idea" (score 95)
  ↓
Empresa creada en 5 minutos
  ↓
Landing page generada automáticamente
```

### **Caso 2: Validación rápida**

```
Usuario tiene idea vaga: "Algo con IA"
  ↓
Filtra: category=saas, keywords=IA
  ↓
Ve 5 ideas de IA con demanda validada
  ↓
Compara con su idea original
  ↓
Ajusta o lanza una de las validadas
```

### **Caso 3: Emprendedor serial**

```
Revisa nuevas ideas cada semana
  ↓
Selecciona top 3 (score >85)
  ↓
Lanza las 3 como negocios
  ↓
Valida con landing pages
  ↓
Escala la que tenga más tracción
```

---

## 📈 Métricas de Éxito

**KPIs del Trend Scout**:
- Ideas descubiertas: 50+/semana
- Ideas con score >80: 15/semana
- Ideas lanzadas: 10% conversion
- Negocios con revenue: 5% de lanzados

**Ejemplo**:
- 200 ideas/mes descubiertas
- 60 ideas score >80
- 20 usuarios lanzan idea
- 1 negocio genera revenue
- 1 negocio × $500/mes × 20% fee = $100/mes nuevo MRR

---

## 🚀 Roadmap

### ✅ MVP (Implementado)

- [x] Reddit API integration
- [x] Hacker News API
- [x] LLM analysis
- [x] Scoring algorithm
- [x] Database storage
- [x] API endpoints
- [x] Launch idea → create company

### ⏳ Fase 2

- [ ] Twitter API integration
- [ ] Product Hunt API
- [ ] Indie Hackers API
- [ ] Auto-run diario (cron)
- [ ] Email notifications (nuevas ideas >90 score)

### ⏳ Fase 3

- [ ] TikTok scraping
- [ ] Scoring ML mejorado
- [ ] Análisis de competencia automático
- [ ] Predicción de éxito
- [ ] Trending topics dashboard

---

## ⚙️ Configuración

### **APIs Necesarias** (opcionales):

```bash
# .env

# Twitter (opcional pero recomendado)
TWITTER_BEARER_TOKEN=xxx

# Product Hunt (opcional)
PRODUCT_HUNT_TOKEN=xxx

# Indie Hackers (opcional)
INDIE_HACKERS_API_KEY=xxx
```

**Sin APIs**:
- Reddit funciona ✅ (API pública)
- Hacker News funciona ✅ (API pública)
- ~30-50 ideas/semana

**Con APIs**:
- Twitter añade ~50 ideas/semana más
- Product Hunt añade ~20 ideas/semana
- Total: ~100+ ideas/semana

---

## ✅ Conclusión

**Trend Scout Agent IMPLEMENTADO**:

- ✅ Escanea Reddit + Hacker News
- ✅ Analiza con LLM (Claude)
- ✅ Score automático (0-100)
- ✅ API completa (listar, ver, lanzar)
- ✅ Database con tracking
- ✅ Integrado con CEO Agent
- ✅ Launch idea → create company

**Diferenciación clave**:
- Otros: "Describe tu idea"
- Lanzalo: "Aquí hay 50 ideas validadas. Pick una."

**Ventaja competitiva**:
- ✅ Resuelve "No sé qué construir"
- ✅ Demanda probada (no especulación)
- ✅ 1-click para lanzar
- ✅ Sticky (usuarios vuelven por ideas nuevas)

**7 agentes activos**: Code, Research, Browser, Twitter, Email, Data, **Trend Scout**

**LISTO PARA USAR** 🔍🔥✨
