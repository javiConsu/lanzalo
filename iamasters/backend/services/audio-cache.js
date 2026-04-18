/**
 * Cache de audio TTS en disco.
 *
 * Clave: sha256(model|voice|speed|format|text)
 * Fichero: .cache/audio/<hash>.<format>
 *
 * Así dos llamadas con el mismo texto y mismos parámetros NO vuelven a
 * pagar a OpenAI. El reproductor puede pedir el audio varias veces a
 * coste cero tras la primera síntesis.
 */

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { synthesize } = require('./tts-service');

const CACHE_DIR = path.resolve(process.env.AUDIO_CACHE_DIR || './.cache/audio');

function ensureDirSync() {
  if (!fsSync.existsSync(CACHE_DIR)) fsSync.mkdirSync(CACHE_DIR, { recursive: true });
}

function hashKey({ text, voice, model, speed, format = 'mp3' }) {
  return crypto.createHash('sha256')
    .update(`${model}|${voice}|${speed}|${format}|${text}`)
    .digest('hex');
}

function filePathFor(hash, format = 'mp3') {
  return path.join(CACHE_DIR, `${hash}.${format}`);
}

async function readCached(hash, format = 'mp3') {
  try {
    return await fs.readFile(filePathFor(hash, format));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function getOrSynthesize(text, options = {}) {
  if (!text || typeof text !== 'string') {
    throw Object.assign(new Error('text is required'), { status: 400 });
  }
  ensureDirSync();

  const model = options.model || process.env.TTS_MODEL || 'tts-1';
  const voice = options.voice || process.env.TTS_VOICE || 'nova';
  const speed = options.speed ?? Number(process.env.TTS_SPEED || 1.0);
  const format = options.format || 'mp3';

  const hash = hashKey({ text, voice, model, speed, format });

  const cached = await readCached(hash, format);
  if (cached) return { buffer: cached, hash, cached: true };

  const buffer = await synthesize(text, { voice, model, speed, format });
  await fs.writeFile(filePathFor(hash, format), buffer);
  return { buffer, hash, cached: false };
}

module.exports = { getOrSynthesize, readCached, hashKey, filePathFor, CACHE_DIR };
