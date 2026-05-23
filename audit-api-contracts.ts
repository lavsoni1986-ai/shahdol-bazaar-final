#!/usr/bin/env tsx

/**
 * API CONTRACT MIGRATION AUDITOR
 * Finds all success() and failure() calls that need migration to new contract
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const BROKEN_SUCCESS_CALLS: string[] = [];
const BROKEN_FAILURE_CALLS: string[] = [];

function analyzeFile(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Check for success() calls that don't start with res.json(success(res, ...))
    if (line.includes('success(') && !line.includes('success(res,')) {
      // Skip the corrected ones
      if (!line.includes('success(res,') && !line.includes('return success(res,')) {
        BROKEN_SUCCESS_CALLS.push(`${filePath}:${lineNumber} - ${line.trim()}`);
      }
    }

    // Check for failure() calls that don't start with failure(res, ...)
    if (line.includes('failure(') && !line.includes('failure(res,')) {
      BROKEN_FAILURE_CALLS.push(`${filePath}:${lineNumber} - ${line.trim()}`);
    }
  });
}

function walkDirectory(dir: string): void {
  try {
    const files = readdirSync(dir);

    for (const file of files) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDirectory(filePath);
      } else if (stat.isFile() && file.endsWith('.ts')) {
        analyzeFile(filePath);
      }
    }
  } catch (error) {
    // Directory doesn't exist, skip
  }
}

console.log('🔍 API Contract Migration Audit\n');

walkDirectory('./server');

console.log(`❌ BROKEN SUCCESS() CALLS (${BROKEN_SUCCESS_CALLS.length}):`);
BROKEN_SUCCESS_CALLS.forEach(call => console.log(`  ${call}`));

console.log(`\n❌ BROKEN FAILURE() CALLS (${BROKEN_FAILURE_CALLS.length}):`);
BROKEN_FAILURE_CALLS.forEach(call => console.log(`  ${call}`));

console.log(`\n📊 TOTAL ISSUES: ${BROKEN_SUCCESS_CALLS.length + BROKEN_FAILURE_CALLS.length}`);

if (BROKEN_SUCCESS_CALLS.length > 0 || BROKEN_FAILURE_CALLS.length > 0) {
  console.log('\n🔧 REQUIRED FIXES:');
  console.log('  1. Replace: return res.json(success(data)) → return success(res, data)');
  console.log('  2. Replace: return res.json(failure(code, msg)) → return failure(res, msg, status)');
  console.log('  3. Replace: return res.status(500).json(failure(...)) → return failure(res, ..., 500)');
} else {
  console.log('\n✅ ALL API CONTRACTS MIGRATED');
}