const express = require('express');
const db = require('../db/client');
const professor = require('../agents/professor-agent');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, department, title, summary, created_at FROM courses ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const course = await db.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
    if (!course.rows[0]) return res.status(404).json({ error: 'not_found' });
    const lessons = await db.query(
      'SELECT id, "order", title, objectives, estimated_minutes FROM lessons WHERE course_id = $1 ORDER BY "order"',
      [req.params.id]
    );
    res.json({ ...course.rows[0], lessons: lessons.rows });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { department, topic, sourceText, lessonsCount } = req.body || {};
    if (!department || !topic) {
      return res.status(400).json({ error: 'department y topic son obligatorios' });
    }
    const outline = await professor.buildCourseOutline({ department, topic, sourceText, lessonsCount });

    const course = await db.query(
      `INSERT INTO courses (department, title, summary, audience, outline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, department, title, summary, created_at`,
      [department, outline.title, outline.summary, outline.audience, outline]
    );
    const courseId = course.rows[0].id;

    for (const lesson of outline.lessons) {
      await db.query(
        `INSERT INTO lessons (course_id, "order", title, objectives, keywords, estimated_minutes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [courseId, lesson.order, lesson.title, lesson.objectives, lesson.keywords, lesson.estimated_minutes]
      );
    }

    res.status(201).json({ course: course.rows[0], outline });
  } catch (err) { next(err); }
});

module.exports = router;
