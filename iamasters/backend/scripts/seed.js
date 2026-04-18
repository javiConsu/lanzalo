#!/usr/bin/env node
/**
 * Seed idempotente del catálogo de cursos.
 * Uso:
 *   npm run seed          (desde /iamasters)
 *
 * Requiere DATABASE_URL. No llama a OpenAI: solo crea filas en courses y
 * lessons. Para rellenar contenido (slides + narración) usar después
 *   npm run generate:content
 */

require('dotenv').config();
const db = require('../db/client');
const catalog = require('../seeds/courses');

async function seed() {
  let created = 0;
  let skipped = 0;
  let lessonsInserted = 0;

  for (const course of catalog) {
    const existing = await db.query(
      'SELECT id FROM courses WHERE department = $1 AND title = $2',
      [course.department, course.title]
    );

    let courseId;
    if (existing.rows[0]) {
      courseId = existing.rows[0].id;
      skipped++;
      console.log(`· ya existe  [${course.department}] ${course.title}`);
    } else {
      const { rows } = await db.query(
        `INSERT INTO courses (department, title, summary, audience, outline)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [course.department, course.title, course.summary, course.audience, course]
      );
      courseId = rows[0].id;
      created++;
      console.log(`+ creado     [${course.department}] ${course.title}`);
    }

    for (const lesson of course.lessons) {
      const res = await db.query(
        `INSERT INTO lessons (course_id, "order", title, objectives, keywords, estimated_minutes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (course_id, "order") DO NOTHING
         RETURNING id`,
        [
          courseId,
          lesson.order,
          lesson.title,
          lesson.objectives || [],
          lesson.keywords || [],
          lesson.estimated_minutes || 20,
        ]
      );
      if (res.rowCount > 0) lessonsInserted++;
    }
  }

  const totalLessons = catalog.reduce((acc, c) => acc + c.lessons.length, 0);
  console.log(`\n✅ Seed completado`);
  console.log(`   Cursos:   ${created} creados, ${skipped} ya existían`);
  console.log(`   Lecciones: ${lessonsInserted} insertadas, ${totalLessons - lessonsInserted} ya existían`);

  await db.pool.end();
}

seed().catch(err => {
  console.error('❌ Seed falló:', err);
  process.exit(1);
});
