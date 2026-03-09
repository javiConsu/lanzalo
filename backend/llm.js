/**
 * LLM integration con tool use, control de costos y quotas
 * 
 * Soporta:
 * - System prompts por agente
 * - Tool use (function calling) de Claude/OpenAI
 * - Tracking de costos por empresa
 * - Fallback entre modelos
 */

const axios = require('axios');
const { LLMCostTracker } = require('./middleware/quotas');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MODEL_COSTS = {
  'anthropic/claude-sonnet-4': { input: 3, output: 15 },
  'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 }
};

const MODEL_STRATEGY = {
  code: 'anthropic/claude-3.5-sonnet',
  marketing: 'anthropic/claude-3.5-sonnet',
  email: 'anthropic/claude-3-haiku',
  twitter: 'anthropic/claude-3-haiku',
  content: 'anthropic/claude-3-haiku',
  research: 'anthropic/claude-3.5-sonnet',
  data: 'openai/gpt-4o-mini',
  analytics: 'openai/gpt-4o-mini',
  trends: 'anthropic/claude-3.5-sonnet',
  // CEO tiered: chat rápido con gpt-4o-mini, herramientas con claude-3.5-sonnet
  ceo_chat: 'openai/gpt-4o-mini',
  ceo: 'anthropic/claude-3.5-sonnet'
};

/**
 * Llamada al LLM con tool use y tracking de costos
 */
async function callLLM(prompt, options = {}) {
  const {
    companyId = null,
    taskType = 'code',
    model = MODEL_STRATEGY[taskType],
    temperature = 0.7,
    maxTokens = 4000,
    systemPrompt = null,
    tools = null,
    toolChoice = null,
    messages = null
  } = options;

  // Verificar presupuesto
  if (companyId) {
    const costTracker = new LLMCostTracker(companyId);
    const withinBudget = await costTracker.isWithinBudget();
    if (!withinBudget) {
      throw new Error('Cuota de tokens LLM excedida para este mes.');
    }
  }

  // Construir mensajes
  const msgArray = messages || [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt }
  ];

  // Construir request body
  const body = {
    model,
    messages: msgArray,
    temperature,
    max_tokens: maxTokens
  };

  // Añadir tools si se proporcionan
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = toolChoice || 'auto';
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      body,
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://lanzalo.pro',
          'X-Title': 'Lanzalo AI Co-Founder'
        },
        timeout: 120000 // 2 min timeout
      }
    );

    const result = response.data;
    const tokensUsed = result.usage?.total_tokens || 0;
    const cost = calculateCost(model, result.usage || {});

    // Registrar uso
    if (companyId) {
      const costTracker = new LLMCostTracker(companyId);
      await costTracker.recordUsage(model, tokensUsed, cost);
    }

    const choice = result.choices[0];
    const message = choice.message;

    // Detectar tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      return {
        content: message.content || '',
        toolCalls: message.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}')
        })),
        tokensUsed,
        cost,
        model,
        finishReason: choice.finish_reason
      };
    }

    return {
      content: message.content,
      toolCalls: null,
      tokensUsed,
      cost,
      model,
      finishReason: choice.finish_reason
    };

  } catch (error) {
    console.error('LLM API error:', error.response?.data || error.message);
    throw new Error(`LLM call failed: ${error.message}`);
  }
}

/**
 * Llamada con tool loop — ejecuta tools automáticamente hasta completar
 */
async function callLLMWithTools(prompt, options = {}) {
  const {
    tools = [],
    toolHandlers = {},
    maxTurns = 10,
    systemPrompt = null,
    toolChoice: initialToolChoice = null,
    messages: incomingMessages = null,
    ...llmOptions
  } = options;

  // Si vienen mensajes ya construidos, usarlos. Si no, construir desde prompt.
  let messages = incomingMessages || [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt }
  ];

  let turn = 0;
  let finalContent = '';

  while (turn < maxTurns) {
    turn++;

    // En la primera llamada, usar toolChoice del caller. Después, auto.
    const currentToolChoice = turn === 1 ? initialToolChoice : null;

    const response = await callLLM(null, {
      ...llmOptions,
      messages,
      tools,
      toolChoice: currentToolChoice,
      systemPrompt: null // ya incluido en messages
    });

    // Si no hay tool calls, hemos terminado
    if (!response.toolCalls || response.toolCalls.length === 0) {
      finalContent = response.content;
      break;
    }

    // Añadir respuesta del asistente con tool calls
    messages.push({
      role: 'assistant',
      content: response.content || null,
      tool_calls: response.toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
      }))
    });

    // Ejecutar cada tool call
    for (const toolCall of response.toolCalls) {
      const handler = toolHandlers[toolCall.name];
      let result;

      if (handler) {
        try {
          result = await handler(toolCall.arguments);
          result = typeof result === 'string' ? result : JSON.stringify(result);
        } catch (error) {
          result = JSON.stringify({ error: error.message });
        }
      } else {
        result = JSON.stringify({ error: `Tool '${toolCall.name}' not implemented` });
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result
      });
    }

    console.log(`  🔧 Turn ${turn}: ${response.toolCalls.map(t => t.name).join(', ')}`);
  }

  if (turn >= maxTurns) {
    console.warn(`⚠️ Tool loop reached max turns (${maxTurns})`);
  }

  return {
    content: finalContent,
    turns: turn,
    messages
  };
}

function calculateCost(model, usage) {
  const costs = MODEL_COSTS[model];
  if (!costs) return ((usage.total_tokens || 0) / 1000000) * 5;
  const inputCost = ((usage.prompt_tokens || 0) / 1000000) * costs.input;
  const outputCost = ((usage.completion_tokens || 0) / 1000000) * costs.output;
  return inputCost + outputCost;
}

function getModelForTask(taskType) {
  return MODEL_STRATEGY[taskType] || MODEL_STRATEGY.code;
}

module.exports = {
  callLLM,
  callLLMWithTools,
  getModelForTask,
  MODEL_STRATEGY,
  MODEL_COSTS
};
