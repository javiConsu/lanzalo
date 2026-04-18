const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

async function chat(messages, { model = DEFAULT_MODEL, temperature = 0.4, responseFormat } = {}) {
  const res = await client.chat.completions.create({
    model,
    temperature,
    messages,
    ...(responseFormat ? { response_format: responseFormat } : {}),
  });
  return res.choices[0].message.content;
}

async function chatJSON(messages, options = {}) {
  const raw = await chat(messages, { ...options, responseFormat: { type: 'json_object' } });
  return JSON.parse(raw);
}

module.exports = { client, chat, chatJSON };
