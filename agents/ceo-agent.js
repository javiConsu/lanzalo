/**
 * CEO Agent - Chat conversacional que coordina todos los agentes
 */

const { pool } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const MemorySystem = require('./memory-system');
const crypto = require('crypto');

class CEOAgent {
  constructor(companyId, userId) {
    this.companyId = companyId;
    this.userId = userId;
    this.conversationHistory = [];
    this.memory = new MemorySystem(companyId);
  }

  /**
   * Inicializar - cargar contexto e historial
   */
  async initialize() {
    // Cargar contexto de la empresa
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = ?',
      [this.companyId]
    );
    this.company = companyResult.rows[0];

    // Cargar historial de chat reciente (últimos 20 mensajes)
    const historyResult = await pool.query(
      `SELECT * FROM chat_messages 
       WHERE company_id = ? 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [this.companyId]
    );
    
    this.conversationHistory = historyResult.rows.reverse();

    // Cargar backlog actual
    const backlogResult = await pool.query(
      `SELECT * FROM tasks 
       WHERE company_id = ? AND status IN ('todo', 'in_progress')
       ORDER BY priority, created_at
       LIMIT 10`,
      [this.companyId]
    );
    this.backlog = backlogResult.rows;
  }

  /**
   * Procesar mensaje del usuario
   */
  async processMessage(userMessage) {
    // Guardar mensaje del usuario
    await this.saveMessage('user', userMessage);

    // Construir contexto para el LLM (ahora async)
    const context = await this.buildContext();

    // Preparar tools disponibles
    const tools = this.getAvailableTools();

    // Llamar al LLM con tool use
    const prompt = this.buildPrompt(context, userMessage);
    
    const response = await callLLM(prompt, {
      companyId: this.companyId,
      taskType: 'code', // CEO usa el modelo más potente
      temperature: 0.7
    });

    // Parsear respuesta y ejecutar acciones
    const result = await this.parseAndExecute(response.content);

    // Guardar respuesta del asistente
    await this.saveMessage('assistant', result.message, result.action, result.taskId);

    return {
      message: result.message,
      action: result.action,
      taskId: result.taskId,
      data: result.data
    };
  }

  /**
   * Construir contexto para el LLM
   */
  async buildContext() {
    // Cargar memoria
    const memoryContext = await this.memory.getFullContext();

    return {
      memory: memoryContext,
      company: {
        name: this.company.name,
        description: this.company.description,
        industry: this.company.industry,
        status: this.company.status,
        subdomain: this.company.subdomain
      },
      backlog: this.backlog.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        tag: t.tag,
        priority: t.priority
      })),
      recentActivity: this.conversationHistory.slice(-5).map(m => ({
        role: m.role,
        content: m.content.substring(0, 200)
      }))
    };
  }

  /**
   * Construir prompt para el CEO Agent
   */
  buildPrompt(context, userMessage) {
    const memorySection = context.memory ? `
MEMORIA COMPARTIDA:

📊 Lo que sé de ${context.company.name}:
- Industria: ${context.memory.domain.industry}
- Audiencia: ${context.memory.domain.targetAudience}
- Stack: ${context.memory.domain.techStack.join(', ')}
- Monetización: ${context.memory.domain.monetization}

⚙️ Preferencias del usuario:
- Comunicación: ${context.memory.preferences.communicationStyle}
- Respuestas: ${context.memory.preferences.responseLength}
- Tech: ${context.memory.preferences.techPreferences.preferVanillaJS ? 'Vanilla JS preferido' : 'Flexible'}
` : '';

    return `Eres el CEO Agent de ${context.company.name}.

${memorySection}

Tu rol es ser el co-fundador IA del usuario. Hablas como un colega emprendedor, no como un asistente corporativo.

EMPRESA:
Nombre: ${context.company.name}
Descripción: ${context.company.description}
Industria: ${context.company.industry}
Web: ${context.company.subdomain}.lanzalo.app

BACKLOG ACTUAL (${context.backlog.length} tareas):
${context.backlog.map(t => `- [${t.tag}] ${t.title} (${t.status}, ${t.priority})`).join('\n')}

CONVERSACIÓN RECIENTE:
${context.recentActivity.map(m => `${m.role}: ${m.content}`).join('\n')}

MENSAJE DEL USUARIO:
${userMessage}

HERRAMIENTAS DISPONIBLES:
1. create_task - Crear nueva tarea para un agente
2. get_task_status - Ver estado de una tarea
3. get_backlog - Ver todas las tareas pendientes
4. suggest_action - Sugerir qué hacer a continuación
5. execute_now - Ejecutar una tarea inmediatamente

TU PERSONALIDAD:
- Respuestas CORTAS (1-2 frases) salvo que pidan detalle
- Tono de co-founder casual, no consultor
- Si el request es ambiguo, ofrece 2-3 opciones concretas
- Antes de crear tarea, verifica que sea suficientemente específico
- Para bugs: describe síntomas, NUNCA adivines causa raíz

DECISIÓN:
¿Qué acción tomar? Responde en JSON:

{
  "action": "create_task|get_status|get_backlog|suggest|chat",
  "message": "tu respuesta al usuario (1-2 frases)",
  "task": {
    "title": "...",
    "description": "...",
    "tag": "engineering|browser|research|data|support|content|financial",
    "priority": "low|medium|high|critical"
  }
}

Si es solo conversación (no necesitas herramientas), usa action: "chat".`;
  }

  /**
   * Parsear respuesta y ejecutar acciones
   */
  async parseAndExecute(responseContent) {
    try {
      // Intentar parsear JSON
      const response = JSON.parse(responseContent);

      switch (response.action) {
        case 'create_task':
          const task = await this.createTask(response.task);
          return {
            message: response.message,
            action: 'create_task',
            taskId: task.id,
            data: task
          };

        case 'get_status':
          const status = await this.getTaskStatus(response.taskId);
          return {
            message: response.message,
            action: 'get_status',
            data: status
          };

        case 'get_backlog':
          const backlog = await this.getBacklog();
          return {
            message: response.message,
            action: 'get_backlog',
            data: backlog
          };

        case 'suggest':
          return {
            message: response.message,
            action: 'suggest',
            data: response.suggestions
          };

        case 'chat':
        default:
          return {
            message: response.message,
            action: 'chat'
          };
      }

    } catch (error) {
      // Si no es JSON válido, tratar como chat normal
      return {
        message: responseContent,
        action: 'chat'
      };
    }
  }

  /**
   * Crear nueva tarea
   */
  async createTask(taskData) {
    const taskId = crypto.randomUUID();

    // Determinar a qué agente asignar
    const assignedTo = this.routeTask(taskData.tag);

    await pool.query(
      `INSERT INTO tasks (
        id, company_id, created_by, assigned_to,
        title, description, tag, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        this.companyId,
        'ceo-agent',
        assignedTo,
        taskData.title,
        taskData.description,
        taskData.tag,
        taskData.priority || 'medium',
        'todo'
      ]
    );

    console.log(`✅ Tarea creada: [${taskData.tag}] ${taskData.title}`);

    return {
      id: taskId,
      ...taskData,
      assigned_to: assignedTo
    };
  }

  /**
   * Routing de tareas a agentes
   */
  routeTask(tag) {
    const routing = {
      'engineering': 'code-agent',
      'browser': 'browser-agent',
      'research': 'research-agent',
      'data': 'data-agent',
      'support': 'support-agent',
      'content': 'email-agent',
      'twitter': 'twitter-agent',
      'meta_ads': 'meta-ads-agent',
      'financial': 'financial-agent'
    };

    return routing[tag] || 'code-agent';
  }

  /**
   * Obtener estado de tarea
   */
  async getTaskStatus(taskId) {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );
    return result.rows[0];
  }

  /**
   * Obtener backlog completo
   */
  async getBacklog() {
    const result = await pool.query(
      `SELECT * FROM tasks 
       WHERE company_id = ? AND status IN ('todo', 'in_progress')
       ORDER BY priority, created_at`,
      [this.companyId]
    );
    return result.rows;
  }

  /**
   * Guardar mensaje en historial
   */
  async saveMessage(role, content, action = null, taskId = null) {
    const messageId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO chat_messages (id, company_id, user_id, role, content, action, task_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [messageId, this.companyId, this.userId, role, content, action, taskId]
    );

    this.conversationHistory.push({
      id: messageId,
      role,
      content,
      action,
      task_id: taskId,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Tools disponibles (para referencia)
   */
  getAvailableTools() {
    return [
      {
        name: 'create_task',
        description: 'Crear nueva tarea para un agente especializado',
        parameters: {
          title: 'string',
          description: 'string',
          tag: 'engineering|browser|research|data|support|content|financial',
          priority: 'low|medium|high|critical'
        }
      },
      {
        name: 'get_task_status',
        description: 'Obtener estado de una tarea',
        parameters: {
          taskId: 'string'
        }
      },
      {
        name: 'get_backlog',
        description: 'Ver todas las tareas pendientes'
      }
    ];
  }
}

module.exports = CEOAgent;
