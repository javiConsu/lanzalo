const express = require('express');
const { getOrSynthesize, readCached } = require('../services/audio-cache');

const router = express.Router();

/**
 * POST /api/tts
 * body: { text, voice?, speed?, model? }
 * Devuelve audio/mpeg. Cachea por hash: la segunda vez con el mismo
 * texto y parámetros, no llama a OpenAI.
 * Headers devueltos:
 *   X-Audio-Hash     hash sha256 del audio
 *   X-Audio-Cached   "1" si vino de cache, "0" si se sintetizó ahora
 */
router.post('/', async (req, res, next) => {
  try {
    const { text, voice, speed, model } = req.body || {};
    const { buffer, hash, cached } = await getOrSynthesize(text, { voice, speed, model });
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=604800, immutable');
    res.set('X-Audio-Hash', hash);
    res.set('X-Audio-Cached', cached ? '1' : '0');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tts/:hash
 * Sirve un audio ya cacheado por su hash. Devuelve 404 si no está.
 * Útil para el reproductor: una vez tiene el hash (del POST previo o
 * pre-calculado), puede hacer GET barato con cache HTTP.
 */
router.get('/:hash', async (req, res, next) => {
  try {
    const hash = req.params.hash.replace(/\.mp3$/, '');
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      return res.status(400).json({ error: 'hash_invalido' });
    }
    const buffer = await readCached(hash);
    if (!buffer) return res.status(404).json({ error: 'not_cached' });
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=604800, immutable');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
