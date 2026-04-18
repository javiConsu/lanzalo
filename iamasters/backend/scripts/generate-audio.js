#!/usr/bin/env node
/**
 * Pre-renderiza audio TTS de todas las narraciones generadas.
 *
 * Recorre lessons.content (intro + slides[].narration + summary) y
 * llama al servicio cacheado. Si el hash ya existe en disco, no gasta.
 *
 * Uso:
 *   npm run generate:audio
 *   npm run generate:audio -- --department ventas
 *   npm run generate:audio -- --course "Asistentes virtuales con IA"
 *   npm run generate:audio -- --dry-run
 *
 * Requiere OPENAI_API_KEY y DATABASE_URL.
 * Coste OpenAI tts-1: ~$15 por 1M caracteres. Un curso completo (~50k
 * chars) ≈ $0.75. Las 5 academias completas ≈ $3.80 total y solo se paga
 * UNA vez por el cache.
 */

require('dotenv').config();
const db = require('../db/client');
const { getOrSynthesize } = require('../services/audio-cache');

const TTS_RATE_PER_1M = 15;

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--department') args.department = argv[++i];
    else if (a === '--course') args.course = argv[++i];
  }
  return args;
}

function collectNarrations(content) {
  const items = [];
  if (!content) return items;
  if (content.intro) items.push({ kind: 'intro', text: content.intro });
  (content.slides || []).forEach((s, i) => {
    if (s.narration) items.push({ kind: `slide-${i + 1}`, text: s.narration });
  });
  if (content.summary) items.push({ kind: 'summary', text: content.summary });
  return items;
}

async function fetchLessons(args) {
  const filters = ['l.content IS NOT NULL'];
  const params = [];
  if (args.department) {
    params.push(args.department);
    filters.push(`c.department = $${params.length}`);
  }
  if (args.course) {
    params.push(args.course);
    filters.push(`c.title = $${params.length}`);
  }
  const sql = `
    SELECT l.id, l.title, l.content, l."order",
           c.department, c.title AS course_title
    FROM lessons l
    JOIN courses c ON c.id = l.course_id
    WHERE ${filters.join(' AND ')}
    ORDER BY c.department, c.title, l."order"
  `;
  const { rows } = await db.query(sql, params);
  return rows;
}

function estCostUSD(chars) {
  return (chars / 1_000_000) * TTS_RATE_PER_1M;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const lessons = await fetchLessons(args);

  if (lessons.length === 0) {
    console.log('No hay lecciones con contenido para procesar. Ejecuta primero npm run generate:content.');
    await db.pool.end();
    return;
  }

  let totalItems = 0;
  let totalChars = 0;
  for (const l of lessons) {
    const items = collectNarrations(l.content);
    totalItems += items.length;
    for (const it of items) totalChars += it.text.length;
  }

  console.log(`Lecciones con contenido: ${lessons.length}`);
  console.log(`Fragmentos de audio:     ${totalItems}`);
  console.log(`Caracteres totales:      ${totalChars.toLocaleString('es-ES')}`);
  console.log(`Coste máx. si NADA está cacheado: ~$${estCostUSD(totalChars).toFixed(2)}`);

  if (args.dryRun) {
    await db.pool.end();
    return;
  }

  let synth = 0;
  let cached = 0;
  let errors = 0;
  for (const l of lessons) {
    const label = `[${l.department}] ${l.course_title} — ${l.order}. ${l.title}`;
    const items = collectNarrations(l.content);
    process.stdout.write(`→ ${label} (${items.length} fragmentos) ... `);
    let localSynth = 0;
    let localCached = 0;
    for (const item of items) {
      try {
        const res = await getOrSynthesize(item.text);
        if (res.cached) { cached++; localCached++; }
        else { synth++; localSynth++; }
      } catch (err) {
        errors++;
        console.log(`\n  ✗ ${item.kind}: ${err.message}`);
      }
    }
    console.log(`ok (nuevo: ${localSynth}, cache: ${localCached})`);
  }

  console.log(`\n✅ Audio listo.`);
  console.log(`   Sintetizados: ${synth}`);
  console.log(`   Cacheados:    ${cached}`);
  console.log(`   Errores:      ${errors}`);
  await db.pool.end();
}

run().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
