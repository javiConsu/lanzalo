# 🤖 CEO Agent - Co-Fundador IA Conversacional

## ¿Qué es?

El **CEO Agent** es el **cerebro** del sistema. Es un agente conversacional que:

1. ✅ Habla directamente con el usuario (chat)
2. ✅ Decide qué agente usar para cada tarea
3. ✅ Crea y gestiona tareas
4. ✅ Accede a contexto completo de la empresa
5. ✅ Coordina todos los demás agentes

**Sin CEO Agent = agentes trabajan en silos, no se coordinan.**

---

## 🎯 Flujo de Trabajo

```
Usuario: "Necesito mejorar el SEO de mi landing"
   ↓
CEO Agent:
   - Analiza request
   - Decide: task type = "seo", tag = "engineering"
   - Crea tarea asignada a Code Agent
   - Responde: "Dale, creo una tarea de SEO. El Code Agent se encarga. Te aviso cuando esté."
   ↓
Code Agent:
   - Ve nueva tarea en su backlog
   - Ejecuta: analiza HTML, añade meta tags, mejora structure
   - Marca tarea como completada
   ↓
CEO Agent (notifica):
   - "Listo. Añadí meta tags, Open Graph, y structured data. Checa tu web."
```

---

## 📡 API Endpoints

### 1. Enviar Mensaje

```bash
POST /api/user/companies/:companyId/chat

Body:
{
  "message": "Necesito añadir pagos con Stripe"
}

Response:
{
  "success": true,
  "message": "Perfecto. Creo una tarea de integración de Stripe para el Code Agent.",
  "action": "create_task",
  "taskId": "task-uuid-123",
  "data": {
    "id": "task-uuid-123",
    "title": "Integrar Stripe para pagos",
    "tag": "engineering",
    "priority": "high",
    "assigned_to": "code-agent"
  }
}
```

### 2. Ver Historial de Chat

```bash
GET /api/user/companies/:companyId/chat/history?limit=50

Response:
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Necesito añadir pagos",
      "created_at": "2026-03-05T19:30:00Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "Perfecto. Creo una tarea...",
      "action": "create_task",
      "task_id": "task-uuid-123",
      "created_at": "2026-03-05T19:30:05Z"
    }
  ]
}
```

### 3. Ver Backlog (Tareas Pendientes)

```bash
GET /api/user/companies/:companyId/backlog

Response:
{
  "backlog": [
    {
      "id": "task-1",
      "title": "Integrar Stripe",
      "status": "in_progress",
      "tag": "engineering",
      "priority": "high",
      "assigned_to": "code-agent",
      "created_at": "2026-03-05T19:30:00Z"
    },
    {
      "id": "task-2",
      "title": "Research competitors",
      "status": "todo",
      "tag": "research",
      "priority": "medium",
      "assigned_to": "research-agent"
    }
  ]
}
```

### 4. Crear Tarea Manualmente

```bash
POST /api/user/companies/:companyId/tasks

Body:
{
  "title": "Fix bug en checkout",
  "description": "El botón de pago no responde en mobile",
  "tag": "engineering",
  "priority": "critical"
}
```

---

## 🧠 Personalidad del CEO

**System Prompt**:

```
Eres el co-fundador IA del usuario. Hablas como un colega emprendedor, no como un asistente corporativo.

RESPUESTAS:
- CORTAS (1-2 frases) salvo que pidan detalle
- Tono casual de co-founder

ANTES DE CREAR TAREA:
- Verificar que el request es específico
- Si es ambiguo → ofrecer 2-3 opciones concretas

PARA BUGS:
- Describir síntomas
- NUNCA adivinar causa raíz
- Vincular con tareas relacionadas
```

**Ejemplos**:

```
❌ MAL:
"I understand your concern. I'll create a comprehensive task to address this issue through our engineering workflow."

✅ BIEN:
"Dale, creo una tarea para el Code Agent. Te aviso cuando esté."
```

---

## 🎯 Acciones Disponibles

El CEO Agent puede ejecutar estas acciones:

| Acción | Descripción | Ejemplo |
|--------|-------------|---------|
| `create_task` | Crear tarea para agente | "Añadir login con Google" |
| `get_status` | Ver estado de tarea | "¿Cómo va la integración de Stripe?" |
| `get_backlog` | Ver tareas pendientes | "¿Qué estás haciendo ahora?" |
| `suggest` | Sugerir qué hacer | "¿Qué debería priorizar?" |
| `chat` | Conversación normal | "Explícame el revenue share" |

---

## 📊 Sistema de Tareas

### Estados de Tarea

```
todo → in_progress → completed
                  ↓
                failed / blocked
```

### Tags (Routing a Agentes)

| Tag | Agente Asignado |
|-----|-----------------|
| `engineering` | Code Agent |
| `browser` | Browser Agent (futuro) |
| `research` | Research Agent |
| `data` | Data Agent |
| `support` | Support Agent (futuro) |
| `content` | Email Agent |
| `twitter` | Twitter Agent |
| `financial` | Financial Agent |
| `meta_ads` | Meta Ads Agent (futuro) |

### Prioridades

- `critical` → Bugs que bloquean
- `high` → Features importantes
- `medium` → Default
- `low` → Nice-to-have

---

## 🔥 Casos de Uso

### Caso 1: Feature Request

```
Usuario: "Quiero añadir un blog a mi web"

CEO Agent:
  → Analiza: tipo = feature, tag = engineering
  → Crea task: "Implementar blog con CMS"
  → Asigna a: Code Agent
  → Responde: "Perfecto. El Code Agent monta el blog. Con markdown o prefieres un CMS?"
```

### Caso 2: Bug Report

```
Usuario: "El formulario de contacto no envía emails"

CEO Agent:
  → Analiza: tipo = bug, tag = engineering, priority = high
  → Crea task: "Fix email sending en contact form"
  → Asigna a: Code Agent
  → Responde: "Bug detectado. Code Agent lo revisa ya. Debería estar en 1-2h."
```

### Caso 3: Research

```
Usuario: "¿Quiénes son mis competidores principales?"

CEO Agent:
  → Analiza: tipo = research, tag = research
  → Crea task: "Competitive analysis"
  → Asigna a: Research Agent
  → Responde: "Buena pregunta. Research Agent busca tus competidores y te mando un reporte."
```

### Caso 4: Marketing

```
Usuario: "Necesito ideas de tweets para esta semana"

CEO Agent:
  → Analiza: tag = twitter
  → Crea task: "Generar calendario de tweets semanal"
  → Asigna a: Twitter Agent
  → Responde: "Dale. Twitter Agent te prepara 7 tweets. ¿Algún tema específico?"
```

---

## ✅ Lo que YA ESTÁ IMPLEMENTADO

1. ✅ **CEO Agent** (agents/ceo-agent.js)
2. ✅ **Sistema de Tareas** (tabla `tasks` + estados + routing)
3. ✅ **Chat API** (POST /chat, GET /history, GET /backlog)
4. ✅ **Historial de Conversación** (tabla `chat_messages`)
5. ✅ **Task Routing** (automático según tag)
6. ✅ **Context Loading** (empresa + backlog + historial)

---

## ⚠️ FALTA IMPLEMENTAR

### Frontend (UI)

1. **Chat Interface**
   - Componente de chat en tiempo real
   - Input + historial de mensajes
   - Indicador de "typing..."
   - WebSocket para updates live

2. **Backlog View**
   - Lista de tareas con estados
   - Filtros por tag/priority/status
   - Cards de tarea con detalles

3. **Task Details**
   - Modal con info completa de tarea
   - Ver output/error
   - Timeline de cambios

### Backend (Pending)

4. **Task Execution Loop**
   - Agentes deben polling el backlog
   - Tomar tareas asignadas a ellos
   - Marcar como in_progress → completed

5. **WebSocket Server**
   - Push notifications cuando tarea completa
   - Live updates en chat

6. **Task Proposals**
   - Algunas tareas requieren aprobación user
   - Sistema de approve/reject

---

## 🚀 Testing

```bash
# Login
TOKEN="tu-token"
COMPANY_ID="tu-company-id"

# Enviar mensaje
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Necesito añadir analytics a mi web"}'

# Ver historial
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/user/companies/$COMPANY_ID/chat/history

# Ver backlog
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/user/companies/$COMPANY_ID/backlog
```

---

## ✅ Conclusión

**CEO Agent está IMPLEMENTADO y FUNCIONAL.**

Ahora puedes:
- ✅ Chatear con el CEO Agent
- ✅ Crear tareas automáticamente
- ✅ Ver backlog de tareas
- ✅ Routing automático a agentes

**Falta**:
- ⏳ Frontend (chat UI)
- ⏳ Task execution loop (agentes ejecutando tareas)
- ⏳ WebSocket (updates en tiempo real)

**El sistema base de coordinación está listo.** 🎉
