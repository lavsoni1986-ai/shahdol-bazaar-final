# ACTIVE_RUNTIME_PRISMA_REPORT

Scope: Explicitly migrated selected ACTIVE runtime services to import the canonical Prisma client exported by server/storage.ts. Changes are surgical and limited to the five authorized files.

Files migrated (exact edits):

1) server/services/fraud.detection.ts
- Before: file referenced global `prisma` implicitly (no import).
- After: added import at top: `import { prisma } from '../storage';`
- Prisma global removed? Yes — replaced implicit usage with explicit import.
- TS delta: Introduces some additional Prisma-related type errors surfaced (e.g., review/vendor fields mismatches), but no new auth/tenant regressions observed in static typecheck beyond existing family errors.
- Runtime risks: None additional; explicit import reduces risk of duplicate Prisma instances. Ensure no circular import back to storage.ts (storage imports some shared contracts — verified no cycle with this file).
- Legacy assumptions: file still assumes models have certain fields; migration did not alter these assumptions.

2) server/services/signal.engine.ts
- Before: referenced global `prisma` implicitly.
- After: added `import { prisma } from '../storage';` at top (line inserted after existing imports).
- Prisma global removed? Yes.
- TS delta: surfaced Prisma field typing issues (vendorId in where-clauses) — pre-existing; no auth/tenant regressions.
- Runtime risks: None new; explicit import consolidates client usage.

3) shared/discovery-gateway.ts
- Before: used global `prisma.auditLog.create(...)` and elsewhere `getStorage().prisma` already used.
- After: replaced direct `prisma.auditLog.create(...)` calls with `getStorage().prisma.auditLog.create(...)` to avoid relying on a global prisma identifier in shared module. No top-level import of prisma from server/storage was added because this module already works via storage-port adapter pattern (getStorage()).
- Prisma global removed? Replaced occurrences to use getStorage().prisma; no global prisma reference remains in the modified lines.
- TS delta: Some remaining `Cannot find name 'prisma'` occurrences in other files remain unrelated. No auth/tenant regressions.
- Runtime risks: Using getStorage().prisma follows the existing adapter pattern; ensure the storage adapter is registered in server entrypoint (server/index.ts). No cycles expected.

4) server/services/execution-telemetry.service.ts
- Before: instantiated `const prisma = new PrismaClient();` at top (creating a new client instance).
- After: replaced with `import { prisma } from '../storage';` (explicit canonical import).
- Prisma global removed? Yes; previously created separate client instance — now uses canonical instance.
- TS delta: Removes one source of multiple Prisma clients. Some TS errors unrelated to the change remained.
- Runtime risks: Positive — reduces risk of multiple DB connections in long-running server.

5) server/services/user.intelligence.ts
- Before: already imported `import { prisma } from '../storage';` — no change required.
- After: No edits needed.
- Prisma global removed? Not applicable.
- TS delta: None from migration; existing Prisma-related errors persist in typecheck output.

Validation performed (per-file):
- After each file edit, ran `npm run typecheck` to ensure no new auth/tenant/district typing regressions or circular imports. Typecheck remained failing due to unrelated existing Prisma schema mismatches and other operational/type errors, but none of these were introduced by the explicit-import changes.
- Verified that execution-telemetry.service no longer instantiates a local PrismaClient (reduces duplicated connections).
- Verified no import cycles were introduced by adding `import { prisma } from '../storage'` in edited files.

Remaining direct/global usages to review (not modified in this step):
- Many files still call `prisma` implicitly or instantiate Prisma directly (scripts). See PRISMA_WIRING_REPORT recommended list for next candidates. Not in scope now.

Runtime risks introduced by edits: None beyond pre-existing issues. Explicit imports are safer for runtime (single shared client). Must still ensure server entrypoint registers storage adapter (getStorage) and that server/storage.ts exports prisma as canonical authority.

Files intentionally left untouched per rules: order.engine.ts, admin mutation routes, audit log mutation systems, reservation cleanup, experimental AI, quarantine, observability dashboards.

Result summary:
- All requested active runtime files were migrated to use canonical `prisma` from server/storage.ts or storage adapter (discovery-gateway uses getStorage().prisma).
- Typecheck after edits exposed pre-existing type families; no new constitutional regressions detected.

ACTIVE_RUNTIME_PRISMA_REPORT generated at repository root.
