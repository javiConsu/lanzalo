#!/usr/bin/env node
/**
 * test-migrations.js
 * Verifica la sintaxis y orden de las migraciones 001-027.
 * No requiere conexión a PostgreSQL — valida los archivos localmente.
 *
 * Uso:
 *   node scripts/test-migrations.js              # solo validación sintáctica local
 *   DATABASE_URL=postgresql://... node scripts/test-migrations.js --run  # ejecuta en DB real
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'database', 'migrations');
const SCHEMA_FILE = path.join(PROJECT_ROOT, 'database', 'schema.sql');

const EXPECTED_MIGRATIONS = [
  '001_add_quotas.sql',
  '002_add_auth.sql',
  '003_add_settings.sql',
  '004_add_tasks_system.sql',
  '005_add_reports.sql',
  '006_add_memory.sql',
  '007_add_tweets_emails.sql',
  '008_add_discovered_ideas.sql',
  '009_add_daily_syncs.sql',
  '010_add_onboarding_fields.sql',
  '011_add_discovery_fields.sql',
  '012_add_preview_system.sql',
  '013_fix_missing_columns.sql',
  '014_add_gamification.sql',
  '015_add_credits.sql',
  '016_add_change_requests.sql',
  '017_add_email_pro.sql',
  '018_add_marketing_content.sql',
  '019_add_brand_config.sql',
  '020_fix_tasks_columns.sql',
  '021_business_slots.sql',
  '022_referral_system.sql',
  '023_password_reset_tokens.sql',
  '024_add_support_feedback.sql',
  '025_add_feedback_daily_reports.sql',
  '026_budgets_governance_heartbeat.sql',
  '027_add_password_reset_tokens_v1.sql',
];

// -------------------------------------------------------
// Validación local (sin DB)
// -------------------------------------------------------
function validateLocal() {
  const results = [];
  let allOk = true;

  console.log('\n=== Validación Local de Migraciones ===\n');

  // Verificar schema base
  if (fs.existsSync(SCHEMA_FILE)) {
    const content = fs.readFileSync(SCHEMA_FILE, 'utf8');
    const stats = { lines: content.split('\n').length, size: content.length };
    console.log(`✓ schema.sql encontrado (${stats.lines} líneas, ${(stats.size / 1024).toFixed(1)}KB)`);
  } else {
    console.log('✗ schema.sql NO ENCONTRADO');
    allOk = false;
  }

  console.log('');

  // Verificar cada migración
  for (const migration of EXPECTED_MIGRATIONS) {
    const filePath = path.join(MIGRATIONS_DIR, migration);
    const exists = fs.existsSync(filePath);

    if (!exists) {
      results.push({ migration, status: 'MISSING', issues: ['Archivo no encontrado'] });
      console.log(`✗ [MISSING]  ${migration}`);
      allOk = false;
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    // Verificaciones básicas de SQL
    // 1. Que use IF NOT EXISTS en CREATE TABLE/INDEX
    const createStatements = content.match(/CREATE\s+(TABLE|INDEX|UNIQUE INDEX)\s+(?!IF)/gi) || [];
    if (createStatements.length > 0) {
      // Filtrar los que no tienen IF NOT EXISTS
      const withoutIfExists = createStatements.filter(s => !s.toUpperCase().includes('IF NOT EXISTS'));
      if (withoutIfExists.length > 0) {
        issues.push(`CREATE sin IF NOT EXISTS: puede fallar si se re-ejecuta`);
      }
    }

    // 2. Que no tenga errores obvios (sintaxis muy básica)
    const unclosedParens = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
    if (unclosedParens !== 0) {
      issues.push(`Paréntesis desbalanceados: ${unclosedParens > 0 ? 'faltan' : 'sobran'} ${Math.abs(unclosedParens)}`);
    }

    const lines = content.split('\n').length;
    const size = (content.length / 1024).toFixed(1);

    if (issues.length === 0) {
      results.push({ migration, status: 'OK', lines, size });
      console.log(`✓ [OK]       ${migration} (${lines} líneas, ${size}KB)`);
    } else {
      results.push({ migration, status: 'WARN', lines, size, issues });
      console.log(`⚠ [WARN]     ${migration} (${lines} líneas) — ${issues.join('; ')}`);
    }
  }

  // Verificar que migrate.js incluye todas las migraciones
  console.log('\n=== Verificando migrate.js ===\n');
  const migrateJsPath = path.join(PROJECT_ROOT, 'backend', 'migrate.js');
  if (fs.existsSync(migrateJsPath)) {
    const migrateContent = fs.readFileSync(migrateJsPath, 'utf8');
    const missingInMigrateJs = EXPECTED_MIGRATIONS.filter(m => !migrateContent.includes(m));
    if (missingInMigrateJs.length > 0) {
      console.log(`⚠ Las siguientes migraciones existen como archivo pero NO están en backend/migrate.js:`);
      missingInMigrateJs.forEach(m => console.log(`  - ${m}`));
      allOk = false;
    } else {
      console.log('✓ migrate.js incluye todas las migraciones esperadas');
    }
  }

  // Resumen
  const ok = results.filter(r => r.status === 'OK').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  const missing = results.filter(r => r.status === 'MISSING').length;

  console.log('\n=== Resumen ===\n');
  console.log(`  ✓ OK:      ${ok}/${EXPECTED_MIGRATIONS.length}`);
  if (warn > 0)    console.log(`  ⚠ WARN:    ${warn}/${EXPECTED_MIGRATIONS.length}`);
  if (missing > 0) console.log(`  ✗ MISSING: ${missing}/${EXPECTED_MIGRATIONS.length}`);
  console.log('');

  if (allOk && missing === 0) {
    console.log('✅ Todas las migraciones están presentes y parecen válidas.');
  } else if (missing > 0) {
    console.log('❌ Hay migraciones faltantes.');
    process.exit(1);
  } else {
    console.log('⚠  Hay advertencias. Revisar antes del deploy.');
  }

  return results;
}

// -------------------------------------------------------
// Ejecución real contra DB (requiere DATABASE_URL)
// -------------------------------------------------------
async function runAgainstDb() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL no está definida. Exporta la variable primero.');
    process.exit(1);
  }

  const { runMigrations } = require('../backend/migrate');

  console.log('\n=== Ejecutando Migraciones en Base de Datos ===\n');

  try {
    const results = await runMigrations();
    let hasErrors = false;

    results.forEach(r => {
      if (r.status.startsWith('error')) {
        console.log(`✗ [ERROR]   ${r.migration}: ${r.status}`);
        hasErrors = true;
      } else if (r.status.includes('skipped')) {
        console.log(`- [SKIP]    ${r.migration}: ${r.status}`);
      } else {
        console.log(`✓ [OK]      ${r.migration}: ${r.status}`);
      }
    });

    if (hasErrors) {
      console.log('\n❌ Hay errores en las migraciones.');
      process.exit(1);
    } else {
      console.log('\n✅ Todas las migraciones ejecutadas correctamente.');
    }
  } catch (err) {
    console.error('Error fatal:', err.message);
    process.exit(1);
  }
}

// -------------------------------------------------------
// Main
// -------------------------------------------------------
const runFlag = process.argv.includes('--run');

if (runFlag) {
  runAgainstDb();
} else {
  validateLocal();
}
