#!/usr/bin/env tsx

/**
 * SOVEREIGN ARCHITECTURE QUALITY GATE
 * Runs before every commit to prevent architectural violations
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const VIOLATIONS: string[] = [];

function checkFile(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // 🚫 BAN RAW FETCH
    if (line.includes('fetch(') && !line.includes('// ALLOWED')) {
      VIOLATIONS.push(`${filePath}:${lineNumber} - 🚫 Raw fetch() detected. Use apiRequest()`);
    }

    // 🚫 BAN DIRECT PRISMA IN ROUTES
    if (filePath.includes('/routes/') && line.includes('prisma.') && !filePath.includes('/repositories/')) {
      VIOLATIONS.push(`${filePath}:${lineNumber} - 🚫 Direct Prisma in routes. Use repository layer`);
    }

    // 🚫 BAN RAW RES.JSON
    if (line.includes('res.json(') && !line.includes('sovereignSuccess') && !line.includes('sovereignFailure')) {
      VIOLATIONS.push(`${filePath}:${lineNumber} - 🚫 Raw res.json(). Use sovereignSuccess/sovereignFailure`);
    }

    // 🚫 BAN RAW BUSINESS TYPE
    if (line.includes('.businessType') && !line.includes('normalizeBusinessType')) {
      VIOLATIONS.push(`${filePath}:${lineNumber} - 🚫 Raw businessType access. Use normalizeBusinessType()`);
    }

    // 🚫 MISSING DISTRICT ISOLATION
    if (line.includes('prisma.') && line.includes('findMany') && !line.includes('districtId') && !filePath.includes('/repositories/')) {
      VIOLATIONS.push(`${filePath}:${lineNumber} - 🚫 Missing districtId in query. Add district isolation`);
    }

    // ✅ REQUIRE COGNITION LOGGING
    if (line.includes('aiEngine.') || line.includes('cognition') && !content.includes('cognitionLogger.')) {
      VIOLATIONS.push(`${filePath}:${lineNumber} - ⚠️ Missing cognition logging. Add structured logging`);
    }
  });
}

function walkDirectory(dir: string): void {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(filePath);
    } else if (stat.isFile() && ['.ts', '.tsx'].includes(extname(file))) {
      checkFile(filePath);
    }
  }
}

// Run quality checks
console.log('🔍 Running Sovereign Architecture Quality Gate...\n');

walkDirectory('./client/src');
walkDirectory('./server');

if (VIOLATIONS.length > 0) {
  console.error('❌ ARCHITECTURAL VIOLATIONS DETECTED:');
  VIOLATIONS.forEach(violation => console.error(`  ${violation}`));
  console.error(`\n🚫 ${VIOLATIONS.length} violations found. Fix before committing.`);
  console.error('📖 See ARCHITECTURE_GUARDRAILS.md for rules.');
  process.exit(1);
} else {
  console.log('✅ No architectural violations detected.');
  console.log('🎉 Quality gate passed!');
}