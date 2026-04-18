const express = require('express');
const db = require('../db/client');
const professor = require('../agents/professor-agent');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.department, c.title, c.summary, c.source_document_id, c.created_at,
              d.filename AS source_filename
       FROM courses c
       LEFT JOIN ingested_documents d ON d.id = c.source_document_id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const course = await db.query(
      `SELECT c.*, d.filename AS source_filename
       FROM courses c
       LEFT JOIN ingested_documents d ON d.id = c.source_document_id
       WHERE c.id = $1`,
      [req.params.id]
    );
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
    const { department, topic, sourceText, lessonsCount, documentId } = req.body || {};
    if (!department || !topic) {
      return res.status(400).json({ error: 'department y topic son obligatorios' });
    }

    let effectiveSourceText = sourceText || '';
    let sourceDocumentId = null;
    if (documentId) {
      const doc = await db.query(
        'SELECT id, text FROM ingested_documents WHERE id = $1',
        [documentId]
      );
      if (!doc.rows[0]) {
        return res.status(404).json({ error: 'documento no encontrado' });
      }
      sourceDocumentId = doc.rows[0].id;
      effectiveSourceText = doc.rows[0].text;
    }

    const outline = await professor.buildCourseOutline({
      department,
      topic,
      sourceText: effectiveSourceText,
      lessonsCount,
    });

    const course = await db.query(
      `INSERT INTO courses (department, title, summary, audience, outline, source_document_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, department, title, summary, source_document_id, created_at`,
      [department, outline.title, outline.summary, outline.audience, outline, sourceDocumentId]
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
