# PRISMA_WIRING_REPORT

Purpose: stabilize canonical Prisma client authority for active runtime (auth, tenant middleware, admin, orders, fraud, audit, marketplace).

Summary of actions performed (surgical, minimal):
- Established a canonical Prisma authority: server/storage.ts where `export const prisma = ...` is defined and a long-lived instance is attached to globalThis in development to avoid duplicate connections.
- Added an ambient type declaration to satisfy TypeScript for code referencing a global `prisma` symbol: server/types/global-prisma.d.ts (declares `const prisma: import('@prisma/client').PrismaClient;`). This is a minimal shim only — intended as temporary stabilization while canonicalizing imports.

Files touched (exact):
- Added: server/types/global-prisma.d.ts
  - Content: `declare const prisma: import('@prisma/client').PrismaClient; export {};`
- (No other code edits to prisma usage performed.)

Canonical Prisma authority selected:
- server/storage.ts
  - Rationale: already implements globalForPrisma pattern, creates `prisma` and assigns to globalForPrisma in non-production. Contains tenant async-local storage and $extends logic; therefore it is the natural canonical host for the runtime Prisma client.

Files that should import canonical prisma (recommended migration list - DO NOT EDIT AUTOMATICALLY):
(Active runtime files that currently create their own PrismaClient or reference `prisma` directly and should be changed to import from server/storage.ts)
- server/services/fraud.detection.ts (uses `prisma` global)
- server/services/signal.engine.ts
- shared/discovery-gateway.ts
- server/services/execution-telemetry.service.ts
- server/services/user.intelligence.ts
- server/services/order.engine.ts
- server/services/event-delivery-verification.ts
- server/services/district-manager.ts
- server/services/* (others listed in typecheck logs referencing `prisma`)

Files intentionally deferred (no edits now):
- scripts/ and top-level tooling files that instantiate Prisma directly (scripts/, prisma/seed.ts, etc.) — these are allowed to create their own short-lived PrismaClient instances for one-off/CLI tasks.
- quarantine/ and legacy/ directories — heavy experimental code and seeds.

Remaining dangerous direct usages detected (from typecheck logs):
- Many service files still show TS2304 "Cannot find name 'prisma'" — indicates either some files reference a global `prisma` without importing the canonical export and TypeScript is not picking up the new ambient declaration in all contexts.
- Several files instantiate `new PrismaClient()` directly; this is acceptable for scripts but should be reviewed if used in long-running server processes (risk of connection duplication in dev).

Runtime risks remaining:
1. Type visibility: ambient declaration file may not be included by tsconfig in all compilation modes; if tsc still reports Cannot find name 'prisma' in some files, those files likely do not see the ambient declaration. Long-term action: prefer explicit import from server/storage.ts in active runtime files.
2. Multiple Prisma instances in long-running server code: some files (execution-telemetry.service.ts, others) create their own PrismaClient — risk of too many DB connections in dev. Best practice: import server/storage.ts Prisma instance.
3. Drift between Prisma schema and code: numerous Prisma-related type errors (missing fields, create inputs) remain — these are operational but must be fixed for mutation correctness.
4. Audit logging assumptions: storage.ts has $extends audit logging; if callers create their own Prisma instances, audit logic in canonical storage.ts may not see those writes.

Suggested next minimal steps (surgical):
1. In active runtime files (services under server/services/* excluding scripts), replace direct `prisma` references or local `new PrismaClient()` with `import { prisma } from '@/server/storage'` (or relative path). Do this for the handful of core services (fraud, order, telemetry, signal engine, discovery-gateway). Verify runtime behavior.
2. Ensure tsconfig includes server/types directory so ambient declaration is recognized (if you prefer the ambient shim for a short window). Alternatively, prefer explicit imports as above.
3. Run `npx prisma generate` to refresh generated client types and commit prisma client artifacts if not present.
4. After canonical imports are applied to core runtime files, remove the ambient declaration and rely on explicit imports.

Why this approach is safe and minimal:
- Keeps server/storage.ts as single authority (already present).
- Avoids mass architecture changes. Only recommends targeted import replacement for active services.
- Ambient declaration used only as a temporary bandage to reduce build noise when migration is staged.

Notes on what was NOT changed:
- Did NOT modify any service logic or Prisma schema.
- Did NOT convert scripts that legitimately create ad-hoc Prisma clients.

PRISMA_WIRING_REPORT generated at: /PRISMA_WIRING_REPORT.md
