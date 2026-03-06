#!/usr/bin/env node
/**
 * Sprint 1 Fixer — Corrige problemas críticos del repo
 * 
 * 1. Fix SQL placeholders: ? → $1, $2, $3...
 * 2. Fix revenue_share_rate: 0.05 → 0.05
 * 3. Fix NOW() → NOW()
 * 
 * Uso: node scripts/sprint1-fix.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
let totalFixes = 0;
let filesFixed = 0;

// ─────────────────────────────────────────────
// Fix 1: SQL placeholders ? → $N
// ─────────────────────────────────────────────

function fixSQLPlaceholders(content, filePath) {
  let fixed = content;
  let fixCount = 0;

  // Find all pool.query() calls and fix ? placeholders
  // Strategy: find SQL strings with ?, replace sequentially with $1, $2, etc.
  
  // Match template literals and regular strings containing SQL with ?
  const sqlPattern = /pool\.query\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g;
  
  fixed = fixed.replace(/pool\.query\(\s*\n?\s*(`[\s\S]*?`)\s*,\s*\[/g, (match, sqlTemplate) => {
    if (!sqlTemplate.includes('?')) return match;
    
    let paramIndex = 0;
    const fixedSQL = sqlTemplate.replace(/\?/g, () => {
      paramIndex++;
      fixCount++;
      return `$${paramIndex}`;
    });
    
    return match.replace(sqlTemplate, fixedSQL);
  });

  // Also fix single-line queries
  fixed = fixed.replace(/pool\.query\(\s*'([^']*\?[^']*)'\s*,\s*\[/g, (match, sql) => {
    let paramIndex = 0;
    const fixedSQL = sql.replace(/\?/g, () => {
      paramIndex++;
      fixCount++;
      return `$${paramIndex}`;
    });
    return match.replace(`'${sql}'`, `'${fixedSQL}'`);
  });

  if (fixCount > 0) {
    console.log(`  📝 ${filePath}: ${fixCount} SQL placeholders fixed`);
    totalFixes += fixCount;
  }

  return fixed;
}

// ─────────────────────────────────────────────
// Fix 2: NOW() → NOW()
// ─────────────────────────────────────────────

function fixDatetime(content, filePath) {
  let fixCount = 0;
  const fixed = content.replace(/datetime\('now'\)/g, () => {
    fixCount++;
    return 'NOW()';
  });
  
  if (fixCount > 0) {
    console.log(`  📝 ${filePath}: ${fixCount} NOW() → NOW()`);
    totalFixes += fixCount;
  }
  
  return fixed;
}

// ─────────────────────────────────────────────
// Fix 3: revenue_share_rate 0.05 → 0.05
// ─────────────────────────────────────────────

function fixRevenueShare(content, filePath) {
  let fixCount = 0;
  
  // Fix in schema
  let fixed = content.replace(/DEFAULT 0\.20/g, () => {
    fixCount++;
    return 'DEFAULT 0.05';
  });
  
  // Fix in JS
  fixed = fixed.replace(/revenue_share_rate.*?0\.20/g, (match) => {
    fixCount++;
    return match.replace('0.20', '0.05');
  });

  if (fixCount > 0) {
    console.log(`  📝 ${filePath}: ${fixCount} revenue share fixes (0.20 → 0.05)`);
    totalFixes += fixCount;
  }

  return fixed;
}

// ─────────────────────────────────────────────
// Process files
// ─────────────────────────────────────────────

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let fixed = content;

  fixed = fixSQLPlaceholders(fixed, filePath);
  fixed = fixDatetime(fixed, filePath);
  fixed = fixRevenueShare(fixed, filePath);

  if (fixed !== content) {
    filesFixed++;
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, fixed, 'utf8');
    }
  }
}

function walkDir(dir, extensions = ['.js', '.sql']) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    
    if (entry.isDirectory()) {
      walkDir(fullPath, extensions);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      processFile(fullPath);
    }
  }
}

// ─────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────

console.log('');
console.log('🔧 Sprint 1 Fixer — Lanzalo');
console.log('────────────────────────────');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (writing files)'}`);
console.log('');

walkDir(path.join(__dirname, '..'));

console.log('');
console.log('────────────────────────────');
console.log(`✅ ${totalFixes} fixes across ${filesFixed} files`);
if (DRY_RUN) {
  console.log('⚠️  DRY RUN — no files were modified. Run without --dry-run to apply.');
}
console.log('');
