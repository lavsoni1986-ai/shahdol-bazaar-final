/**
 * ============================================
 * VERCEL API PRE-BUNDLER — BharatOS Sovereign
 * ============================================
 * Uses esbuild to bundle api/index.ts and ALL server dependencies
 * into a single CommonJS file for Vercel serverless deployment.
 *
 * WHY THIS IS NEEDED:
 * - package.json has "type": "module" (pure ESM)
 * - Vercel's @vercel/node esbuild pass cannot resolve extensionless
 *   ESM imports at runtime (ERR_MODULE_NOT_FOUND)
 * - server/lib/swagger.ts is excluded from tsconfig, breaking the
 *   esbuild trace for apiRegistry → swagger chain
 * - "build": "build:client" never compiles backend TypeScript
 *
 * RESULT:
 * - api/index.js = fully self-contained CJS bundle (~single file)
 * - Zero runtime module resolution needed
 * - Vercel deploys it as a Node.js serverless function
 * ============================================
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

console.log('🔨 [BUILD-API] Bundling api/index.ts for Vercel serverless...');
console.log('🔨 [BUILD-API] Root:', root);

try {
  await build({
    entryPoints: [path.join(root, 'api', 'index.ts')],

    // ── OUTPUT ──────────────────────────────────────────────────────
    // Write to api/index.js — Vercel picks up the .js file and runs
    // it directly without any further compilation step.
    outfile: path.join(root, 'api', 'index.js'),

    // ── BUNDLING ────────────────────────────────────────────────────
    // bundle: true makes esbuild follow ALL imports and inline them.
    // This is the core fix — no runtime module resolution needed.
    bundle: true,

    // ── PLATFORM ────────────────────────────────────────────────────
    platform: 'node',
    target: 'node18',   // Vercel Node.js 18 runtime

    // ── FORMAT ──────────────────────────────────────────────────────
    // CJS (CommonJS) is required for Vercel Lambda/serverless runtime.
    // Despite package.json "type": "module", CJS is the safe choice
    // for bundled serverless functions — no extension resolution issues.
    format: 'cjs',

    // ── EXTERNALS ───────────────────────────────────────────────────
    // Mark packages that MUST remain external (native bindings, Prisma
    // client engines, and large packages Vercel handles separately).
    // Everything else — including all server/** files — is BUNDLED.
    external: [
      // Prisma: has native engine binaries that can't be inlined
      '@prisma/client',
      'prisma',
      '.prisma/client',

      // Native node addons (may or may not be present)
      'bcrypt',
      'sharp',
      'canvas',
      'bufferutil',
      'utf-8-validate',

      // Socket.IO / ws native bindings
      'uws',
    ],

    // ── SOURCE MAPS ─────────────────────────────────────────────────
    // Inline source maps for readable Vercel stack traces
    sourcemap: 'inline',

    // ── MINIFICATION ────────────────────────────────────────────────
    // Do NOT minify — keeps Vercel logs readable
    minify: false,

    // ── TSCONFIG ────────────────────────────────────────────────────
    // Point esbuild at the project tsconfig for path aliases & settings
    tsconfig: path.join(root, 'tsconfig.json'),

    // ── DEFINE ──────────────────────────────────────────────────────
    // Ensure Vercel guard branches activate in the bundle
    define: {
      'process.env.VERCEL': '"1"',
    },

    // ── LOG LEVEL ───────────────────────────────────────────────────
    logLevel: 'info',

    // ── METAFILE ────────────────────────────────────────────────────
    // Write build metadata for debugging (what was bundled vs external)
    metafile: true,
  }).then((result) => {
    // Write metafile for inspection
    const metaPath = path.join(root, '.vercel-build-meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(result.metafile, null, 2));

    const outFile = path.join(root, 'api', 'index.js');
    const stat = fs.statSync(outFile);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

    console.log(`✅ [BUILD-API] Bundle written: api/index.js (${sizeMB} MB)`);
    console.log(`📊 [BUILD-API] Build meta: .vercel-build-meta.json`);
    console.log(`🚀 [BUILD-API] Ready for Vercel serverless deployment`);
  });
} catch (err) {
  console.error('❌ [BUILD-API] Bundle failed:', err);
  process.exit(1);
}
