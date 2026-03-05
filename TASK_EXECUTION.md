# 🔄 Task Execution System

## ¿Qué es?

El **Task Execution System** es el loop que hace que los agentes ejecuten tareas automáticamente.

**Flujo completo**:

```
1. CEO Agent crea tarea → guarda en tabla `tasks` con status='todo'
2. Agente asignado polling el backlog cada 10 segundos
3. Ve tarea nueva → marca como 'in_progress'
4. Ejecuta la tarea usando su lógica específica
5. Marca como 'completed' (o 'failed' si algo sale mal)
6. Notifica al usuario en el chat
```

---

## 🏗️ Componentes

### 1. **TaskExecutor** (Base Class)

Clase base que todos los agentes heredan.

**Responsabilidades**:
- Polling del backlog cada 10 segundos
- Tomar tareas asignadas al agente
- Actualizar estados (todo → in_progress → completed/failed)
- Notificar al usuario

**Código**: `agents/task-executor.js`

### 2. **CodeExecutor** (Engineering Tasks)

Ejecuta tareas de código: features, bugs, CSS, auth, etc.

**Proceso**:
1. Recibe tarea (ej: "Añadir analytics")
2. Construye prompt para LLM
3. LLM genera código (HTML/CSS/JS)
4. Guarda archivos en `projects/{subdomain}/`
5. Deploy (si necesario)
6. Marca como completada

**Código**: `agents/executors/code-executor.js`

### 3. **ResearchExecutor** (Research Tasks)

Ejecuta tareas de investigación: competidores, mercado, etc.

**Proceso**:
1. Recibe tarea (ej: "Analizar competidores")
2. Busca información (Brave Search API)
3. LLM analiza resultados
4. Crea reporte estructurado en tabla `reports`
5. Notifica con resumen

**Código**: `agents/executors/research-executor.js`

### 4. **AgentOrchestrator**

Coordina todos los agentes.

**Responsabilidades**:
- Inicializar todos los executors
- Start/stop todos a la vez
- Status global

**Código**: `agents/agent-orchestrator.js`

---

## 🚀 Cómo Funciona

### Startup (Automático)

Cuando el servidor arranca:

```javascript
// En server-local.js
const { getOrchestrator } = require('../agents/agent-orchestrator');
global.orchestrator = getOrchestrator();
global.orchestrator.start();
```

Salida en consola:

```
🎭 Inicializando Agent Orchestrator...

✅ 2 agentes registrados

🚀 Iniciando todos los agentes...

🚀 Code Agent iniciado - polling cada 10s
🚀 Research Agent iniciado - polling cada 10s

✅ Todos los agentes iniciados y polling backlog
```

### Polling Loop

Cada agente ejecuta este loop cada 10 segundos:

```javascript
async poll() {
  // 1. Buscar tareas asignadas con status='todo'
  const tasks = await pool.query(`
    SELECT * FROM tasks 
    WHERE assigned_to = ? AND status = 'todo'
    ORDER BY priority, created_at
    LIMIT 1
  `, [this.agentId]);

  // 2. Si hay tarea, ejecutar
  if (tasks.length > 0) {
    await this.executeTask(tasks[0]);
  }

  // 3. Siguiente poll en 10 segundos
  setTimeout(() => this.poll(), 10000);
}
```

### Ejecución de Tarea

```javascript
async executeTask(task) {
  // 1. Marcar como in_progress
  await this.updateTaskStatus(task.id, 'in_progress', {
    started_at: new Date().toISOString()
  });

  try {
    // 2. Ejecutar (implementado por cada agente)
    const result = await this.execute(task);

    // 3. Marcar como completed
    await this.updateTaskStatus(task.id, 'completed', {
      completed_at: new Date().toISOString(),
      output: JSON.stringify(result)
    });

    // 4. Notificar al usuario
    await this.notifyCompletion(task, result);

  } catch (error) {
    // Si falla, marcar como failed
    await this.updateTaskStatus(task.id, 'failed', {
      failed_at: new Date().toISOString(),
      error_message: error.message
    });

    await this.notifyFailure(task, error);
  }
}
```

---

## 📊 Sistema de Reportes

Nuevo: tabla `reports` para almacenar análisis, investigaciones, etc.

```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  task_id TEXT,
  type TEXT, -- research, financial, analytics, marketing
  content TEXT, -- Markdown/JSON
  created_at TEXT
);
```

**Uso**:

```javascript
// Research Agent crea reporte
const reportId = await this.createReport(task, analysis);

// Usuario puede ver reportes
GET /api/user/companies/:id/reports
GET /api/user/reports/:reportId
```

---

## ✅ Agentes Implementados

| Agente | ID | Tags | Status |
|--------|----|----- |--------|
| Code Agent | `code-agent` | `engineering` | ✅ Implementado |
| Research Agent | `research-agent` | `research` | ✅ Implementado |
| Twitter Agent | `twitter-agent` | `twitter` | ⏳ Pendiente |
| Email Agent | `email-agent` | `content` | ⏳ Pendiente |
| Data Agent | `data-agent` | `data` | ⏳ Pendiente |
| Financial Agent | `financial-agent` | `financial` | ⏳ Pendiente |

---

## 🧪 Testing

### 1. Crear tarea manualmente

```bash
TOKEN="tu-token"
COMPANY_ID="tu-company-id"

curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Añadir Google Analytics",
    "description": "Integrar Google Analytics en la landing page",
    "tag": "engineering",
    "priority": "medium"
  }'
```

### 2. Ver lo que pasa

En la consola del servidor verás:

```
🔧 Code Agent ejecutando: [engineering] Añadir Google Analytics
💻 Code Agent procesando: Añadir Google Analytics
📝 Archivo guardado: index.html
🚀 Deploy a company.lanzalo.app
✅ Code Agent completó: Añadir Google Analytics
📬 Notificación enviada para tarea: task-uuid-123
```

### 3. Ver en el chat

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/user/companies/$COMPANY_ID/chat/history
```

Verás:

```json
{
  "messages": [
    {
      "role": "assistant",
      "content": "✅ Tarea completada: Añadir Google Analytics\n\nAñadí el tracking code de GA4...",
      "task_id": "task-uuid-123",
      "action": "task_completed"
    }
  ]
}
```

---

## 🎮 Control Manual

### Status de agentes

```javascript
// En Node.js REPL o código
global.orchestrator.status();
```

Output:

```
📊 Estado de agentes:

  🟢 Running - Code Agent
  🟢 Running - Research Agent
```

### Detener agentes

```javascript
global.orchestrator.stop();
```

### Reiniciar agentes

```javascript
global.orchestrator.start();
```

---

## 🔥 Casos de Uso

### Caso 1: Feature Request

```
1. Usuario: "Necesito un blog"
2. CEO Agent: Crea tarea tag='engineering'
3. Code Agent ve tarea en backlog (10s después)
4. Code Agent ejecuta: genera HTML del blog
5. Code Agent notifica: "✅ Blog añadido. Puedes publicar posts en /blog"
```

### Caso 2: Research

```
1. Usuario: "¿Quiénes son mis competidores?"
2. CEO Agent: Crea tarea tag='research'
3. Research Agent ve tarea
4. Research Agent busca + analiza con LLM
5. Research Agent crea reporte
6. Research Agent notifica: "📊 Investigación completada. Ver reporte XXX"
```

### Caso 3: Bug

```
1. Usuario: "El formulario no funciona"
2. CEO Agent: Crea tarea tag='engineering', priority='high'
3. Code Agent la toma (tiene prioridad alta)
4. Code Agent analiza + arregla
5. Code Agent notifica: "✅ Bug arreglado. El formulario ahora envía emails."
```

---

## ⚙️ Configuración

### Cambiar intervalo de polling

```javascript
// En task-executor.js
constructor(agentId, agentName) {
  this.pollInterval = 5000; // 5 segundos en vez de 10
}
```

### Añadir nuevo agente

1. Crear `agents/executors/mi-executor.js`:

```javascript
const TaskExecutor = require('../task-executor');

class MiExecutor extends TaskExecutor {
  constructor() {
    super('mi-agent', 'Mi Agent');
  }

  async execute(task) {
    // Tu lógica aquí
    return { summary: 'Done' };
  }
}

module.exports = MiExecutor;
```

2. Registrar en orchestrator:

```javascript
// En agent-orchestrator.js
const MiExecutor = require('./executors/mi-executor');

initialize() {
  this.agents = [
    new CodeExecutor(),
    new ResearchExecutor(),
    new MiExecutor() // ← Añadir aquí
  ];
}
```

3. Reiniciar servidor → agente activo

---

## 📈 Métricas

**TODO**: Implementar métricas de agentes

- Tareas completadas por agente
- Tiempo promedio de ejecución
- Tasa de éxito/fallo
- Backlog size

---

## ✅ Conclusión

**Sistema de ejecución de tareas FUNCIONANDO**:

- ✅ Agentes polling backlog automáticamente
- ✅ Ejecución paralela (cada agente en su loop)
- ✅ Notificaciones en chat
- ✅ Manejo de errores (failed state)
- ✅ Reportes estructurados
- ✅ Graceful shutdown

**Siguiente paso**: ¿Frontend UI para ver tareas en tiempo real?
