/**
 * LLM integration via OpenRouter
 */

const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'anthropic/claude-sonnet-4';

async function callLLM(prompt, options = {}) {
  const {
    model = MODEL,
    temperature = 0.7,
    maxTokens = 4000
  } = options;

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lanzalo.com',
        'X-Title': 'Lanzalo AI Co-Founder'
      }
    });

    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('LLM API error:', error.response?.data || error.message);
    throw new Error(`LLM call failed: ${error.message}`);
  }
}

module.exports = { callLLM };
