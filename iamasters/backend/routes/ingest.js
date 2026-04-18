const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024 },
});

router.post('/pdf', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file requerido (multipart/form-data)' });
    const data = await pdfParse(req.file.buffer);
    res.json({
      filename: req.file.originalname,
      pages: data.numpages,
      text: data.text,
      chars: data.text.length,
    });
  } catch (err) { next(err); }
});

module.exports = router;
