const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const db = require('../db/client');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024 },
});

const PREVIEW_CHARS = 500;
const VALID_DEPARTMENTS = ['ventas', 'finanzas', 'direccion', 'management', 'productividad'];

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, filename, mime_type, department, pages, chars, created_at
       FROM ingested_documents
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, filename, mime_type, department, text, pages, chars, created_at
       FROM ingested_documents WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/pdf', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file requerido (multipart/form-data)' });
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'solo se aceptan PDF por ahora' });
    }

    const department = (req.body?.department || '').trim() || null;
    if (department && !VALID_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ error: `department debe ser uno de: ${VALID_DEPARTMENTS.join(', ')}` });
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text || '';
    if (text.length < 50) {
      return res.status(400).json({
        error: 'El PDF no contiene texto extraíble. ¿Es un escaneo? Necesita OCR previo.',
      });
    }

    const { rows } = await db.query(
      `INSERT INTO ingested_documents (filename, mime_type, department, text, pages, chars)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, filename, mime_type, department, pages, chars, created_at`,
      [req.file.originalname, req.file.mimetype, department, text, data.numpages, text.length]
    );

    res.status(201).json({
      ...rows[0],
      preview: text.slice(0, PREVIEW_CHARS),
    });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM ingested_documents WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
