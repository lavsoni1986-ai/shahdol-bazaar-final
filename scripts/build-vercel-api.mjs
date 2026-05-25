/**
 * ============================================
 * VERCEL API PRE-BUNDLER — BharatOS Sovereign (VALIDATION MODE)
 * ============================================
 * Uses esbuild to bundle api/index.ts and ALL server dependencies.
 * Output goes to dist-api/index.js for CI validation only.
 *
 * THIS FILE IS NOT THE VERCEL DEPLOYMENT ENTRYPOINT.
 * Vercel uses api/index.ts compiled by @vercel/node directly.
 * @vercel/node is forced to CJS mode via api/package.json.
 *
 * WHY WE KEEP THIS STEP:
 * - Validates the full import chain can be bundled (no missing files)
 * - Catches ERR_MODULE_NOT_FOUND before deployment
 * - Detects circular deps and bad imports at build time
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
    // Write to dist-api/index.js for CI validation.
    // Vercel uses api/index.ts compiled by @vercel/node (CJS via api/package.json).
    outfile: path.join(root, 'dist-api', 'index.js'),

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

    const outFile = path.join(root, 'dist-api', 'index.js');
    const stat = fs.statSync(outFile);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

    console.log(`✅ [BUILD-API] Validation bundle: dist-api/index.js (${sizeMB} MB)`);
    console.log(`📊 [BUILD-API] Build meta: .vercel-build-meta.json`);
    console.log(`✅ [BUILD-API] Import chain validated — @vercel/node will bundle api/index.ts directly`);
    console.log(`🚀 [BUILD-API] CJS boundary: api/package.json forces @vercel/node into CJS mode`);
  });
} catch (err) {
  console.error('❌ [BUILD-API] Bundle failed:', err);
  process.exit(1);
}
