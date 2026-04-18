const express = require('express');
const db = require('../db/client');
const professor = require('../agents/professor-agent');
const evaluator = require('../agents/evaluator-agent');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM lessons WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/:id/generate-content', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT l.*, c.department, c.outline
       FROM lessons l JOIN courses c ON c.id = l.course_id
       WHERE l.id = $1`,
      [req.params.id]
    );
    const lesson = rows[0];
    if (!lesson) return res.status(404).json({ error: 'not_found' });

    const content = await professor.buildLesson({
      department: lesson.department,
      lesson,
      sourceText: req.body?.sourceText || '',
    });

    await db.query('UPDATE lessons SET content = $1 WHERE id = $2', [content, lesson.id]);
    res.json({ id: lesson.id, content });
  } catch (err) { next(err); }
});

router.post('/:id/quiz', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM lessons WHERE id = $1', [req.params.id]);
    const lesson = rows[0];
    if (!lesson) return res.status(404).json({ error: 'not_found' });

    const quiz = await evaluator.buildQuiz({
      lesson: { ...lesson, slides: lesson.content?.slides || [] },
      numQuestions: req.body?.numQuestions || 5,
    });
    res.json(quiz);
  } catch (err) { next(err); }
});

router.post('/:id/grade', async (req, res, next) => {
  try {
    const { question, userAnswer } = req.body || {};
    if (!question || userAnswer == null) {
      return res.status(400).json({ error: 'question y userAnswer requeridos' });
    }
    const result = await evaluator.gradeAnswer({ question, userAnswer });
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
