# TRANSPORT_DEADCODE_REPORT

## Executive summary

This report lists duplicated/abandoned transport helpers and normalization utilities that are safe to review for removal after migration, but must NOT be deleted automatically. The goal is to highlight candidates for dead-code pruning once migration completes and canonical transport (`api-client.ts`) is authoritative.

---

## Candidates (locations + rationale)

1. client/src/lib/api.ts
   - Rationale: Legacy alternate transport. After all imports are migrated to `api-client.ts` and behaviors reconciled, this file may be retired.
   - Current status: Actively imported by:
     - client/src/hooks/useHomeSnapshot.ts
     - client/src/services/vendor.service.ts
   - Action: Migrate imports, run tests, then mark for removal.

2. client/src/shared/api/response-normalizers.ts (audit)
   - Rationale: Contains rich normalization pipeline. Not dead, but contains compatibility bridges and legacy helpers (createCompatibilityBridge) that may be unused after canonicalization.
   - Action: Run usage analysis for createCompatibilityBridge and other legacy exports.

3. client/src/shared/api/* potential utilities
   - Search for other transport-related helpers under shared/api; some helper functions might be orphaned (e.g., normalizeProducts, normalizeServices used only by response-normalizers). Keep until post-migration cleanup.

4. Legacy archive directories
   - legacy-archive/client/_graveyard_merchant_legacy
   - client/src/pages/archive/legacy
   - Rationale: Large set of archived files reference api-client; they are not in active routing. Tag for archival cleanup after release.

5. Duplicate response wrappers
   - `validateApiResponse` in client/src/lib/api.ts and JSON `success` presence check in client/src/lib/api-client.ts
   - Action: Choose single authority for validation (api-client.ts preferred) and remove duplicate from api.ts once migration is complete.

6. Duplicated district resolution
   - `resolveCanonicalDistrictSlug` in api-client.ts vs `getDistrictFromContext` used by api.ts + DistrictContext
   - Action: Consolidate to district resolver in api-client.ts; keep DistrictContext for runtime state, but ensure no duplicated sources of truth remain.

---

## Unused helpers discovered (initial scan)

- createCompatibilityBridge (response-normalizers.ts): may be unused; search suggests no current call-sites.
- getPortalContext / persistPortalContext (api-client.ts): used by some pages; verify usage and keep if still referenced.

---

## Recommended dead-code detection steps (automated)

1. After migration, run TypeScript strict build to find unused exports and references.
2. Use a code coverage run (integration tests) to confirm which helpers are exercised.
3. Run static analyzer (ts-prune or similar) to list unused exports.
4. Prepare a removal PR with small commits, each deleting one file and running full CI.

---

## Files flagged for manual review (do NOT delete automatically)

- client/src/lib/api.ts
- client/src/shared/api/response-normalizers.ts (specifically createCompatibilityBridge)
- client/src/shared/api/* (helper functions)
- client/src/pages/archive/legacy/**/*
- legacy-archive/**/*

---

## Next steps

1. Complete controlled migration to `api-client.ts` (per TRANSPORT_DRIFT_REPORT).
2. Ensure all behavior gaps are documented and resolved.
3. Run dead-code detection pipeline and produce removal candidates.
4. Create PR(s) to remove confirmed dead code with careful CI and staging verification.


End of TRANSPORT_DEADCODE_REPORT
