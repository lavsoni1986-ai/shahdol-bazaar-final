#!/usr/bin/env tsx

/**
 * CLIENT QUALITY GATE
 * Validates frontend sovereign compliance
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ISSUES: string[] = [];

function checkFile(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Check for service layer usage
    if (line.includes('const fetch') && filePath.includes('/pages/')) {
      ISSUES.push(`${filePath}:${lineNumber} - ⚠️ Data fetching in page. Consider service layer`);
    }

    // Check for direct API calls in components
    if (line.includes('apiRequest(') && filePath.includes('/components/')) {
      ISSUES.push(`${filePath}:${lineNumber} - ⚠️ API call in component. Move to service/hook`);
    }

    // Check for missing error boundaries
    if (line.includes('useQuery') && !content.includes('error') && !content.includes('ErrorBoundary')) {
      ISSUES.push(`${filePath}:${lineNumber} - ⚠️ useQuery without error handling`);
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
      } else if (stat.isFile() && ['.ts', '.tsx'].includes(extname(file))) {
        checkFile(filePath);
      }
    }
  } catch (error) {
    // Directory doesn't exist, skip
  }
}

console.log('🔍 Running Client Quality Gate...\n');

walkDirectory('./client/src');

if (ISSUES.length > 0) {
  console.warn('⚠️ CLIENT QUALITY ISSUES DETECTED:');
  ISSUES.forEach(issue => console.warn(`  ${issue}`));
  console.warn(`\n⚠️ ${ISSUES.length} issues found. Consider addressing for better architecture.`);
  // Don't fail build for client issues, just warn
} else {
  console.log('✅ Client quality checks passed!');
}