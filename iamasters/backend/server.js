require('dotenv').config();
const express = require('express');
const cors = require('cors');

const coursesRouter = require('./routes/courses');
const lessonsRouter = require('./routes/lessons');
const ttsRouter = require('./routes/tts');
const chatRouter = require('./routes/chat');
const ingestRouter = require('./routes/ingest');

const app = express();
const PORT = process.env.PORT || 4100;

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'iamasters' }));

app.use('/api/courses', coursesRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/ingest', ingestRouter);

app.use((err, _req, res, _next) => {
  console.error('[iamasters] error:', err);
  res.status(err.status || 500).json({ error: err.message || 'internal_error' });
});

app.listen(PORT, () => {
  console.log(`IAmasters API escuchando en http://localhost:${PORT}`);
});

module.exports = app;
