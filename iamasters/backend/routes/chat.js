const express = require('express');
const tutor = require('../agents/tutor-agent');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { lessonContext, history = [], message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message requerido' });
    const reply = await tutor.answer({ lessonContext, history, userMessage: message });
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
