# 🧠 Shared Memory System

## ¿Qué es?

El **Shared Memory System** es la memoria compartida entre todos los agentes. Permite que los agentes:

1. ✅ Recuerden decisiones pasadas
2. ✅ Aprendan de cada ejecución
3. ✅ Compartan conocimiento entre ellos
4. ✅ Mejoren con el tiempo

**Sin memoria = agentes empiezan de cero cada vez.**

---

## 🏗️ 3 Layers de Memoria

### **Layer 1: Domain Knowledge (15K tokens)** 📊

**Específico de cada empresa.**

Contiene:
- Nombre y descripción del negocio
- Industria y audiencia objetivo
- Stack técnico usado
- Features clave implementadas
- Modelo de monetización
- Etapa del proyecto (early/growth/mature)

**Ejemplo**:

```json
{
  "companyName": "Mi SaaS",
  "description": "Plataforma de analytics para ecommerce",
  "industry": "SaaS B2B",
  "targetAudience": "Tiendas online medianas (10-100 empleados)",
  "subdomain": "mi-saas",
  "productType": "digital",
  "stage": "early",
  "keyFeatures": [
    "Dashboard de métricas",
    "Integración con Shopify",
    "Reportes automáticos"
  ],
  "techStack": ["HTML", "CSS", "JavaScript", "Tailwind", "Node.js"],
  "monetization": "subscription"
}
```

**Actualización**: Automática cuando agentes completan tareas que añaden features, cambian stack, etc.

---

### **Layer 2: User Preferences (3K tokens)** ⚙️

**Preferencias y configuración del usuario.**

Contiene:
- Estilo de comunicación preferido
- Longitud de respuestas
- Tech preferences (frameworks, libraries)
- Preferencias de diseño
- Prioridades (speed vs features, cost vs quality, etc.)

**Ejemplo**:

```json
{
  "communicationStyle": "casual",
  "responseLength": "short",
  "techPreferences": {
    "frameworks": [],
    "avoidFrameworks": true,
    "preferVanillaJS": true
  },
  "designPreferences": {
    "style": "modern",
    "colorScheme": "dark"
  },
  "priorities": ["speed", "simplicity", "cost-effective"]
}
```

**Actualización**: Manual (usuario configura) o automática basada en feedback.

---

### **Layer 3: Cross-Company Patterns (15K tokens)** 🎯

**Aprendizajes globales aplicables a todas las empresas.**

Contiene:
- Best practices por industria
- Bugs comunes a evitar
- Features exitosas probadas
- Patrones de conversión
- Errores comunes

**Ejemplo**:

```json
{
  "patterns": {
    "saas": {
      "bestPractices": [
        "Pricing page aumenta conversión 40%",
        "Free trial de 7 días óptimo",
        "Testimonials en landing page críticos"
      ]
    },
    "ecommerce": {
      "bestPractices": [
        "Checkout en 1 página mejor que multi-step",
        "Trust badges aumentan conversión 15%"
      ]
    }
  },
  "commonBugs": [
    "Mobile responsive issues",
    "Form validation missing",
    "Analytics not tracking conversions"
  ],
  "successfulFeatures": [
    "Email capture with lead magnet",
    "Social proof section",
    "Clear CTA above fold"
  ]
}
```

**Actualización**: Automática cuando se detectan patrones en múltiples empresas.

---

## 🔄 Cómo Funciona

### Inicialización

Cuando se crea una empresa nueva:

```javascript
const memory = new MemorySystem(companyId);

// Layer 1: Se inicializa con datos de la empresa
await memory.getLayer1(); // Auto-crea si no existe

// Layer 2: Valores por defecto
await memory.getLayer2();

// Layer 3: Compartido entre todas las empresas
await memory.getLayer3();
```

### Durante Ejecución de Tareas

```javascript
// Code Agent ejecutando tarea
class CodeExecutor extends TaskExecutor {
  async execute(task) {
    // 1. Cargar contexto de memoria
    const context = await this.memory.getFullContext();
    
    // 2. Usar en prompt
    const prompt = `
      Empresa: ${context.domain.companyName}
      Stack actual: ${context.domain.techStack.join(', ')}
      Preferencia: ${context.preferences.techPreferences.preferVanillaJS ? 'Vanilla JS' : 'Frameworks OK'}
      
      Best practices a seguir:
      ${context.patterns.successfulFeatures.map(f => `- ${f}`).join('\n')}
      
      Bugs comunes a evitar:
      ${context.patterns.commonBugs.map(b => `- ${b}`).join('\n')}
      
      TAREA: ${task.description}
    `;
    
    // 3. Ejecutar con LLM
    const result = await callLLM(prompt);
    
    // 4. Aprender de esta ejecución (auto-curación)
    await this.memory.curate(task, result);
    
    return result;
  }
}
```

### Auto-Curación Post-Ejecución

Después de cada tarea, el sistema analiza qué se aprendió:

```javascript
await memory.curate(task, result);

// Internamente:
// 1. LLM analiza task + result
// 2. Extrae aprendizajes:
//    - Domain: "Ahora tenemos feature de analytics"
//    - Preferences: "Usuario prefiere respuestas técnicas"
//    - Pattern: "Para SaaS, dashboard es crítico"
// 3. Actualiza layers correspondientes
```

---

## 📡 API Endpoints

### 1. Ver Memoria Completa

```bash
GET /api/user/companies/:companyId/memory

Response:
{
  "success": true,
  "memory": {
    "domain": { ... },
    "preferences": { ... },
    "patterns": { ... }
  }
}
```

### 2. Actualizar Domain Knowledge (Layer 1)

```bash
PATCH /api/user/companies/:companyId/memory/domain

Body:
{
  "keyFeatures": ["Dashboard", "Analytics", "Reports"],
  "stage": "growth"
}

Response:
{
  "success": true,
  "layer1": { ... }
}
```

### 3. Actualizar Preferences (Layer 2)

```bash
PATCH /api/user/companies/:companyId/memory/preferences

Body:
{
  "communicationStyle": "technical",
  "responseLength": "detailed",
  "techPreferences": {
    "frameworks": ["React"],
    "preferVanillaJS": false
  }
}
```

### 4. Buscar en Memoria

```bash
POST /api/user/companies/:companyId/memory/search

Body:
{
  "query": "analytics",
  "layers": [1, 2, 3]
}

Response:
{
  "success": true,
  "query": "analytics",
  "results": [
    {
      "layer": 1,
      "relevance": 0.9,
      "data": { ... }
    }
  ]
}
```

### 5. Ver Patterns Globales (Layer 3) - Solo Admin

```bash
GET /api/user/memory/patterns

Response:
{
  "success": true,
  "patterns": { ... }
}
```

---

## 🧪 Testing

### 1. Ver memoria de una empresa

```bash
TOKEN="tu-token"
COMPANY_ID="tu-company-id"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/user/companies/$COMPANY_ID/memory
```

### 2. Actualizar preferencias

```bash
curl -X PATCH http://localhost:3001/api/user/companies/$COMPANY_ID/memory/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "communicationStyle": "technical",
    "responseLength": "detailed"
  }'
```

### 3. Buscar en memoria

```bash
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/memory/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "analytics",
    "layers": [1, 2, 3]
  }'
```

---

## 🔥 Casos de Uso

### Caso 1: Agente Recuerda Stack Técnico

```
Usuario: "Añade autenticación"
  ↓
Code Agent:
  - Carga memoria Layer 1
  - Ve: techStack = ["Node.js", "Express"]
  - Decide: Usar Passport.js (compatible)
  - NO pregunta "¿Qué backend usas?"
```

### Caso 2: Agente Aprende Preferencias

```
Ejecución 1:
  Usuario: "Haz esto simple, sin frameworks"
  → Layer 2 se actualiza: preferVanillaJS = true

Ejecución 2:
  Code Agent automáticamente usa Vanilla JS
  → No pregunta de nuevo
```

### Caso 3: Patrones Cross-Company

```
Empresa A: Añadió pricing page → conversión +35%
Empresa B: Añadió pricing page → conversión +42%
Empresa C: Añadió pricing page → conversión +38%

Layer 3 se actualiza:
  patterns.saas.bestPractices.push("Pricing page aumenta conversión ~40%")

Empresa D: Crea SaaS nueva
CEO Agent sugiere: "Te recomiendo añadir pricing page (aumenta conversión 40%)"
```

---

## 📊 Estructura de Base de Datos

```sql
CREATE TABLE memory (
  id TEXT PRIMARY KEY,
  company_id TEXT, -- NULL para Layer 3
  layer INTEGER, -- 1, 2, 3
  content TEXT, -- JSON
  created_at TEXT,
  updated_at TEXT,
  
  UNIQUE(company_id, layer)
);
```

**Constraints**:
- Layer 1 y 2: Única por empresa (`company_id`, `layer`)
- Layer 3: Global (`company_id = NULL`, única)

---

## ✅ Integración con Agentes

### CEO Agent

```javascript
// Inicializar
this.memory = new MemorySystem(companyId);

// Usar en prompts
const context = await this.memory.getFullContext();
const prompt = `
  Contexto de ${context.domain.companyName}:
  - Industria: ${context.domain.industry}
  - Preferencias: ${context.preferences.communicationStyle}
  
  Usuario dice: ${userMessage}
`;
```

### Task Executors

```javascript
// Cargar memoria al ejecutar
async executeTask(task) {
  this.memory = new MemorySystem(task.company_id);
  
  const result = await this.execute(task);
  
  // Auto-curar memoria
  await this.memory.curate(task, result);
}
```

---

## 🚀 Ventajas

1. **Contexto Persistente**: Agentes no olvidan
2. **Mejora Continua**: Aprenden de cada ejecución
3. **Eficiencia**: No repiten preguntas obvias
4. **Personalización**: Se adaptan a cada usuario
5. **Best Practices**: Aplican lo que funciona
6. **Prevención**: Evitan errores comunes

---

## ⏭️ Siguiente Mejora

### TODO: Semantic Search con Embeddings

Actualmente búsqueda simple por keywords. Mejorar con:

```javascript
// Usar OpenAI Embeddings
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: query
});

// Buscar por similitud vectorial
const results = await vectorSearch(embedding);
```

---

## ✅ Conclusión

**Shared Memory implementado y funcionando**:

- ✅ 3 Layers (Domain, Preferences, Patterns)
- ✅ Auto-curación post-ejecución
- ✅ Integrado en CEO Agent
- ✅ Integrado en Task Executors
- ✅ API completa (CRUD + search)
- ✅ Inicialización automática

**Los agentes ahora tienen MEMORIA.** 🧠✨
