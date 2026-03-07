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

    // Construir contexto de memoria (simple, sin llamadas al LLM)
    const memoryContext = `EMPRESA: ${this.company.name}
INDUSTRIA: ${this.company.industry || 'No especificada'}
DESCRIPCIÓN: ${this.company.description || 'Sin descripción'}
ESTADO: ${this.company.status}
INGRESOS: $${this.company.revenue_total || 0}`;

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

    // Llamar al LLM con tools (create_task, get_tasks, web_search, get_company_info)
    const tools = getToolsForAgent('ceo');
    const toolHandlers = createToolHandlers(this.companyId, this.userId);

    const response = await callLLMWithTools(null, {
      messages,
      tools,
      toolHandlers,
      companyId: this.companyId,
      taskType: 'ceo',
      maxTurns: 1,
      temperature: 0.7,
      maxTokens: 500
    });

    const responseContent = response.content || response.message || '';

    // Guardar respuesta
    await this.saveMessage('assistant', responseContent);

    // Broadcast actividad al dashboard
    if (global.broadcastActivity) {
      global.broadcastActivity({
        companyId: this.companyId,
        type: 'ceo_message',
        message: responseContent.substring(0, 100)
      });
    }

    return {
      message: responseContent,
      turns: response.turns || 1
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
