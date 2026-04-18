const express = require('express');
const { synthesize } = require('../services/tts-service');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { text, voice, speed, model } = req.body || {};
    const audio = await synthesize(text, { voice, speed, model });
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(audio);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
