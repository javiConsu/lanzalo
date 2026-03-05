/**
 * LLM integration con control de costos y quotas
 */

const axios = require('axios');
const { LLMCostTracker } = require('./middleware/quotas');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Precios por modelo (por millón de tokens)
const MODEL_COSTS = {
  'anthropic/claude-sonnet-4': { input: 3, output: 15 },
  'anthropic/claude-sonnet-3.5': { input: 3, output: 15 },
  'anthropic/claude-haiku-3': { input: 0.25, output: 1.25 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 }
};

// Estrategia de modelos por tipo de tarea
const MODEL_STRATEGY = {
  code: 'anthropic/claude-sonnet-4',        // Crítico
  marketing: 'anthropic/claude-sonnet-3.5', // Creativo
  email: 'anthropic/claude-haiku-3',        // Simple
  twitter: 'anthropic/claude-haiku-3',      // Simple
  analytics: 'openai/gpt-4o-mini'           // Análisis básico
};

/**
 * Llamada al LLM con tracking de costos
 */
async function callLLM(prompt, options = {}) {
  const {
    companyId = null,
    taskType = 'code',
    model = MODEL_STRATEGY[taskType],
    temperature = 0.7,
    maxTokens = 4000
  } = options;

  // Verificar presupuesto si hay companyId
  if (companyId) {
    const costTracker = new LLMCostTracker(companyId);
    const withinBudget = await costTracker.isWithinBudget();
    
    if (!withinBudget) {
      throw new Error(
        'Cuota de tokens LLM excedida para este mes. Actualiza tu plan.'
      );
    }
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://lanzalo.app',
          'X-Title': 'Lanzalo AI Co-Founder'
        }
      }
    );

    const result = response.data;
    const tokensUsed = result.usage.total_tokens;
    const cost = calculateCost(model, result.usage);

    // Registrar uso si hay companyId
    if (companyId) {
      const costTracker = new LLMCostTracker(companyId);
      await costTracker.recordUsage(model, tokensUsed, cost);
    }

    console.log(`LLM call: ${model} | ${tokensUsed} tokens | $${cost.toFixed(4)}`);

    return {
      content: result.choices[0].message.content,
      tokensUsed,
      cost,
      model
    };

  } catch (error) {
    console.error('LLM API error:', error.response?.data || error.message);
    throw new Error(`LLM call failed: ${error.message}`);
  }
}

/**
 * Calcular costo basado en uso de tokens
 */
function calculateCost(model, usage) {
  const costs = MODEL_COSTS[model];
  if (!costs) {
    console.warn(`Modelo ${model} no tiene costos definidos, usando default`);
    return (usage.total_tokens / 1000000) * 5; // $5/M tokens default
  }

  const inputCost = (usage.prompt_tokens / 1000000) * costs.input;
  const outputCost = (usage.completion_tokens / 1000000) * costs.output;
  
  return inputCost + outputCost;
}

/**
 * Obtener modelo óptimo para una tarea
 */
function getModelForTask(taskType) {
  return MODEL_STRATEGY[taskType] || MODEL_STRATEGY.code;
}

module.exports = { 
  callLLM, 
  getModelForTask,
  MODEL_STRATEGY,
  MODEL_COSTS
};
