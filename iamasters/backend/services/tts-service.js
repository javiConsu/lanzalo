const { client } = require('./openai-client');

const DEFAULT_MODEL = process.env.TTS_MODEL || 'tts-1';
const DEFAULT_VOICE = process.env.TTS_VOICE || 'nova';
const DEFAULT_SPEED = Number(process.env.TTS_SPEED || 1.0);

const ALLOWED_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

async function synthesize(text, {
  voice = DEFAULT_VOICE,
  model = DEFAULT_MODEL,
  speed = DEFAULT_SPEED,
  format = 'mp3',
} = {}) {
  if (!text || typeof text !== 'string') {
    throw Object.assign(new Error('text is required'), { status: 400 });
  }
  if (!ALLOWED_VOICES.includes(voice)) {
    throw Object.assign(new Error(`voice must be one of ${ALLOWED_VOICES.join(', ')}`), { status: 400 });
  }

  const response = await client.audio.speech.create({
    model,
    voice,
    input: text,
    speed,
    response_format: format,
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { synthesize, ALLOWED_VOICES };
