#!/usr/bin/env node
/**
 * Rellena el contenido de las lecciones (slides + narración + ejercicio)
 * llamando al agente Profesor por cada lección sin content.
 *
 * Uso:
 *   npm run generate:content                (todas las lecciones pendientes)
 *   npm run generate:content -- --department ventas
 *   npm run generate:content -- --course "Prospección y cierre con IA"
 *   npm run generate:content -- --force     (regenera incluso si ya hay content)
 *   npm run generate:content -- --dry-run   (solo lista sin llamar a OpenAI)
 *
 * Requiere OPENAI_API_KEY y DATABASE_URL.
 * Coste estimado: ~$0.04 por lección (gpt-4o).
 */

require('dotenv').config();
const db = require('../db/client');
const professor = require('../agents/professor-agent');

function parseArgs(argv) {
  const args = { force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--department') args.department = argv[++i];
    else if (a === '--course') args.course = argv[++i];
  }
  return args;
}

async function fetchLessons(args) {
  const filters = ['1=1'];
  const params = [];
  if (!args.force) filters.push('l.content IS NULL');
  if (args.department) {
    params.push(args.department);
    filters.push(`c.department = $${params.length}`);
  }
  if (args.course) {
    params.push(args.course);
    filters.push(`c.title = $${params.length}`);
  }
  const sql = `
    SELECT l.id, l."order", l.title, l.objectives, l.keywords,
           c.id AS course_id, c.department, c.title AS course_title,
           c.source_document_id
    FROM lessons l
    JOIN courses c ON c.id = l.course_id
    WHERE ${filters.join(' AND ')}
    ORDER BY c.department, c.title, l."order"
  `;
  const { rows } = await db.query(sql, params);
  return rows;
}

async function loadSourceText(documentId, cache) {
  if (!documentId) return '';
  if (cache.has(documentId)) return cache.get(documentId);
  const { rows } = await db.query(
    'SELECT text FROM ingested_documents WHERE id = $1',
    [documentId]
  );
  const text = rows[0]?.text || '';
  cache.set(documentId, text);
  return text;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const lessons = await fetchLessons(args);

  if (lessons.length === 0) {
    console.log('Nada que generar. Todas las lecciones filtradas ya tienen contenido.');
    await db.pool.end();
    return;
  }

  const estCost = (lessons.length * 0.04).toFixed(2);
  console.log(`Lecciones a procesar: ${lessons.length}`);
  console.log(`Coste OpenAI estimado: ~$${estCost}`);
  if (args.dryRun) {
    lessons.forEach(l => console.log(`  · [${l.department}] ${l.course_title} — ${l.order}. ${l.title}`));
    await db.pool.end();
    return;
  }

  let ok = 0;
  let ko = 0;
  const docCache = new Map();
  for (const lesson of lessons) {
    const label = `[${lesson.department}] ${lesson.course_title} — ${lesson.order}. ${lesson.title}`;
    try {
      process.stdout.write(`→ ${label} ... `);
      const sourceText = await loadSourceText(lesson.source_document_id, docCache);
      const content = await professor.buildLesson({
        department: lesson.department,
        lesson: {
          title: lesson.title,
          objectives: lesson.objectives || [],
          keywords: lesson.keywords || [],
        },
        sourceText,
      });
      await db.query('UPDATE lessons SET content = $1 WHERE id = $2', [content, lesson.id]);
      ok++;
      console.log(`ok (${content.slides?.length ?? 0} slides${sourceText ? ', con fuente' : ''})`);
    } catch (err) {
      ko++;
      console.log(`FALLO: ${err.message}`);
    }
  }

  console.log(`\n✅ Generación completa. OK: ${ok}, errores: ${ko}`);
  await db.pool.end();
}

run().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
