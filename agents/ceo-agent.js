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

    // Construir contexto de memoria
    let memoryContext = '';
    try {
      const ctx = await this.memory.getFullContext();
      memoryContext = `
EMPRESA: ${ctx.domain.companyName} (${ctx.domain.industry})
AUDIENCIA: ${ctx.domain.targetAudience}
STACK: ${(ctx.domain.techStack || []).join(', ')}
PREFERENCIAS: Estilo ${ctx.preferences.communicationStyle}, respuestas ${ctx.preferences.responseLength}
ESTADO: ${this.company.status}`;
    } catch (e) {
      memoryContext = `EMPRESA: ${this.company.name}\nESTADO: ${this.company.status}`;
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

    // Tools disponibles para el CEO
    const tools = getToolsForAgent('ceo');
    const toolHandlers = createToolHandlers(this.companyId, this.userId);

    // Llamar al LLM con tool loop
    const response = await callLLMWithTools(null, {
      messages,
      tools,
      toolHandlers,
      companyId: this.companyId,
      taskType: 'ceo',
      maxTurns: 5,
      temperature: 0.7
    });

    // Guardar respuesta
    await this.saveMessage('assistant', response.content);

    // Broadcast actividad al dashboard
    if (global.broadcastActivity) {
      global.broadcastActivity({
        companyId: this.companyId,
        type: 'ceo_message',
        message: response.content.substring(0, 100)
      });
    }

    return {
      message: response.content,
      turns: response.turns
    };
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
