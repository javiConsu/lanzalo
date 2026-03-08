/**
 * CEO Agent — Chat conversacional con tool use real
 * 
 * Coordina todos los agentes, crea tareas, consulta memoria,
 * busca en web, y responde al fundador con la voz de Lánzalo.
 */

const { pool } = require('../backend/db');
const { callLLMWithTools } = require('../backend/llm');
const { getSystemPrompt } = require('./system-prompts');
const { getToolsForAgent, createToolHandlers } = require('./tools');
const MemorySystem = require('./memory-system');

class CEOAgent {
  constructor(companyId, userId) {
    this.companyId = companyId;
    this.userId = userId;
    this.memory = new MemorySystem(companyId);
  }

  async initialize() {
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1', [this.companyId]
    );
    this.company = companyResult.rows[0];

    // Cargar historial reciente (últimos 10 mensajes)
    const historyResult = await pool.query(
      `SELECT role, content FROM chat_messages 
       WHERE company_id = $1 
       ORDER BY created_at DESC LIMIT 10`,
      [this.companyId]
    );
    this.conversationHistory = historyResult.rows.reverse();
  }

  /**
   * Procesar mensaje del usuario — con tool use real
   */
  async processMessage(userMessage) {
    if (!this.company) await this.initialize();

    // Guardar mensaje del usuario
    await this.saveMessage('user', userMessage);

    // Gamificación: primer mensaje
    try {
      const { awardXp, unlockAchievement } = require('../backend/services/gamification');
      const isFirst = this.conversationHistory.length === 0;
      if (isFirst) {
        await unlockAchievement(this.companyId, 'first_message');
        await awardXp(this.companyId, 'first_message', 10, 'Primera conversación con el Co-Founder');
      }
    } catch(e) {}

    // Construir contexto de memoria — base de DB, sin LLM
    let memoryContext = `EMPRESA: ${this.company.name}
INDUSTRIA: ${this.company.industry || 'No especificada'}
DESCRIPCIÓN: ${this.company.description || 'Sin descripción'}
ESTADO: ${this.company.status}
INGRESOS: $${this.company.revenue_total || 0}`;

    // Enriquecer con memoria persistente (Layer 1 y 2) si existe
    try {
      const memRows = await pool.query(
        'SELECT layer, content FROM memory WHERE company_id = $1 AND layer IN (1, 2)',
        [this.companyId]
      );
      for (const row of memRows.rows) {
        const data = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        if (row.layer === 1) {
          if (data.targetAudience) memoryContext += `\nAUDIENCIA: ${data.targetAudience}`;
          if (data.keyFeatures?.length) memoryContext += `\nFEATURES: ${data.keyFeatures.join(', ')}`;
          if (data.techStack?.length) memoryContext += `\nSTACK: ${data.techStack.join(', ')}`;
          if (data.lastLearning) memoryContext += `\nÚLTIMO APRENDIZAJE: ${data.lastLearning}`;
        }
        if (row.layer === 2) {
          if (data.communicationStyle) memoryContext += `\nESTILO: ${data.communicationStyle}`;
          if (data.priorities?.length) memoryContext += `\nPRIORIDADES: ${data.priorities.join(', ')}`;
        }
      }
    } catch (e) {
      // Silencioso — la memoria es un plus, no un requisito
    }

    // System prompt con contexto
    const systemPrompt = getSystemPrompt('ceo', this.company.name, memoryContext);

    // Construir historial de conversación
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory.map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    // Activar tools solo cuando el usuario pide algo concreto que las requiere
    const needsTools = /\b(crea|crear|haz|hacer|añade|añadir|busca|buscar|tarea|task|investiga|analiza|lanza|despliega|tweet|email|campaña)\b/i.test(userMessage);

    let response;
    if (needsTools) {
      // Modelo potente para tool use (claude-3.5-sonnet)
      const tools = getToolsForAgent('ceo');
      const toolHandlers = createToolHandlers(this.companyId, this.userId);
      response = await callLLMWithTools(null, {
        messages,
        tools,
        toolHandlers,
        companyId: this.companyId,
        taskType: 'ceo',
        maxTurns: 1,
        temperature: 0.7,
        maxTokens: 500
      });
    } else {
      // Chat rápido y barato (gpt-4o-mini) — 20x más económico
      const { callLLM } = require('../backend/llm');
      response = await callLLM(null, {
        messages,
        companyId: this.companyId,
        taskType: 'ceo_chat',
        temperature: 0.7,
        maxTokens: 500
      });
    }

    const responseContent = response.content || response.message || '';

    // Guardar respuesta
    await this.saveMessage('assistant', responseContent);

    // Broadcast actividad al dashboard en vivo
    if (global.broadcastActivity) {
      global.broadcastActivity({
        companyId: this.companyId,
        type: 'ceo_message',
        agentType: 'cofounder',
        message: responseContent.substring(0, 120),
        timestamp: new Date().toISOString()
      });
    }

    // Actualizar memoria Layer 1 con lo aprendido (async, no bloquea respuesta)
    this.updateMemoryFromConversation(userMessage, responseContent).catch(() => {});

    return {
      message: responseContent,
      turns: response.turns || 1
    };
  }

  /**
   * Actualizar memoria Layer 1 con lo aprendido en la conversación
   * Se ejecuta async, no bloquea la respuesta al usuario
   */
  async updateMemoryFromConversation(userMessage, agentResponse) {
    try {
      // Detectar si hay info relevante para guardar en memoria
      const keywords = {
        audience: ['cliente', 'usuario', 'audiencia', 'público', 'target', 'para quien'],
        features: ['feature', 'funcionalidad', 'quiero que', 'necesito que', 'debe tener'],
        stack: ['react', 'vue', 'node', 'python', 'postgres', 'mysql', 'tailwind', 'next'],
        monetization: ['cobrar', 'precio', 'suscripción', 'freemium', 'pago']
      };

      const text = (userMessage + ' ' + agentResponse).toLowerCase();
      const updates = {};

      if (keywords.audience.some(k => text.includes(k))) {
        // Extraer una frase corta sobre audiencia del mensaje del usuario
        updates.targetAudience = userMessage.substring(0, 200);
      }

      if (Object.keys(updates).length === 0) return;

      // Guardar en memoria Layer 1
      await pool.query(
        `INSERT INTO memory (id, company_id, layer, content, updated_at)
         VALUES (gen_random_uuid(), $1, 1, $2, NOW())
         ON CONFLICT(company_id, layer)
         DO UPDATE SET content = memory.content || $2, updated_at = NOW()`,
        [this.companyId, JSON.stringify(updates)]
      );
    } catch (e) {
      // Silencioso
    }
  }

  async saveMessage(role, content) {
    try {
      await pool.query(
        `INSERT INTO chat_messages (company_id, role, content, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [this.companyId, role, content]
      );
    } catch (error) {
      console.error('[CEO] Error saving message:', error.message);
    }
  }
}

module.exports = CEOAgent;
