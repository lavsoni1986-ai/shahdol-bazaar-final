# VENDOR_GOVERNANCE_DRIFT_REPORT

Scope
- Investigate vendor sponsorship/governance mutations and UI contract for: POST /api/admin/vendors, PATCH /api/admin/vendors/:id/sponsorship, PATCH /api/admin/vendors/:id/status, vendor edit flow.

Findings (facts)
1) Exact broken endpoints
- PATCH /api/admin/vendors/:id/sponsorship -> Fails at runtime. Callsite: server/routes/admin/vendor.control.ts:90-97 (attempts prisma.vendor.update({ data: { isSponsored } })).
- Multiple server callsites reference `isSponsored` (select/update/uses) and produce TypeScript errors: server/repositories/vendor.repo.ts, server/routes/marketplace/stores.routes.ts, server/services/searchUnified.service.ts, server/routes/payments.cashfree.routes.ts, server/dto/entity.dto.ts, client components (VendorManagement, SovereignStoreCard, PremiumCard) expect `isSponsored` in vendor DTO.

2) Exact schema drift
- Prisma migration removed `isSponsored` from Vendor.
  - Evidence: prisma/migrations/20260507214943_remove_product_district_redundancy/migration.sql includes `- You are about to drop the column 'isSponsored'` and later DROP COLUMN "isSponsored".
- Current prisma schema (prisma/schema.prisma) for model Vendor does NOT include `isSponsored`. It contains `boostedUntil` (DateTime?), `isTrending` (Boolean), `aiRankScore` (Float), and VendorMetadata relation.

3) Runtime blockers
- prisma.vendor.update({ data: { isSponsored } }) will fail because `isSponsored` is not a valid field -> PrismaClientKnownRequestError or runtime/compile-time mismatch depending on build. This produces 500s and prevents sponsorship toggle flow from completing.
- Other callsites that attempt to select `isSponsored` will fail typecheck and may cause runtime errors (depending on compiled JS). These cause inconsistent vendor DTOs reaching the frontend.
- Frontend expects `isSponsored` boolean in vendor objects; absence causes UI to read undefined -> toggles may show stale state and buttons may appear not to work due to returned payload mismatch or API failures.

4) Constitutional truth (answers)
A) Was isSponsored removed intentionally?
- Yes. Migration script explicitly drops the `isSponsored` column. This indicates intentional removal as part of schema consolidation (see migration comments). The canonical schema now uses `boostedUntil`/boost fields instead of a simple boolean.

B) Should sponsorship instead use which fields?
- Canonical fields present in schema that serve sponsorship/boost semantics:
  - boostedUntil (DateTime?) — primary canonical field for a time-limited boost/sponsorship window.
  - isTrending (Boolean) — boolean signal for trending state (not sponsorship but related exposure).
  - aiRankScore / aiRankScore (Float) — ranking score used by AI; not a boolean sponsorship flag but used to surface/promote vendors.
  - metadata (VendorMetadata JSON relation) — can hold ad/boost metadata and merchant-provided flags.
- Conclusion: time-limited sponsorship should be represented by boostedUntil (and optionally VendorMetadata for plan details). A derived boolean (isSponsored) can be computed at runtime from boostedUntil > now.

C) Is frontend using stale governance assumptions?
- Yes. Client code (client/src/pages/admin/VendorManagement.tsx, client components) expects vendor.isSponsored and calls PATCH /admin/vendors/:id/sponsorship with { isSponsored }. That contract is stale relative to the current DB schema which removed isSponsored.

Safest constitutional fix (A-class, no schema change)
- Implement a surgical runtime mapping in the sponsorship mutation handler only (server/routes/admin/vendor.control.ts):
  1. Accept { isSponsored: boolean, durationDays?: number } from frontend (preserves existing frontend contract).
  2. Map true -> set vendor.boostedUntil = now + durationDays (default 7 days). Map false -> set boostedUntil = null.
  3. Update prisma.vendor.update({ data: { boostedUntil } }) (no schema change).
  4. Return a vendor payload that includes a computed isSponsored boolean (vendor.boostedUntil > now) so frontend consumers continue to work unchanged.
- Rationale: Minimal code-path change, preserves existing frontend contract, avoids schema migration and data loss risks.
- Files to change (A-class): server/routes/admin/vendor.control.ts (sponsorship handler). Optionally return derived isSponsored in response and emit vendor:update with derived flag.

Which fields are canonical now
- boostedUntil (can be null) — canonical for active sponsorship/boost windows.
- isTrending — canonical boolean for trending exposure.
- aiRankScore — canonical numeric ranking.
- VendorMetadata — canonical place for auxiliary promotion metadata.

Which UI actions are stale
- Direct reads/writes of `isSponsored` on the API / DB are stale. Specifically:
  - PATCH /admin/vendors/:id/sponsorship sending { isSponsored } expecting persistence of that boolean in DB.
  - Server selects and DTOs that include `isSponsored` as a persisted vendor field (many server files and client DTOs).

Schema migration justification/danger
- Rolling `isSponsored` back into the schema (adding column) is NOT recommended without product-level discussion:
  - Migration reversal risks data divergence and ambiguity: the project intentionally removed field in migration; reintroducing it reintroduces schema debt.
  - Data semantics: `isSponsored` boolean loses time-bound semantics (when sponsorship expires). The canonical model prefers boostedUntil.
  - Operational risks: data loss, migration failures, index/constraint changes (migration script dropped many columns and adjusted enums), and ripple effects in other services.
- Therefore: schema migration to re-add isSponsored is dangerous and not justified. Prefer application-level compatibility mapping.

Runtime stability checklist (before/after proposed A-class fix)
- Before: PATCH sponsorship calls prisma update with invalid field -> 500. Frontend toggle appears not to work.
- After (A-class fix): sponsorship handler updates boostedUntil; returns vendor object with derived isSponsored -> frontend toggles work; no schema change.

Recommended next steps (surgical, in order)
1. Apply A-class runtime fix to sponsorship handler only (server/routes/admin/vendor.control.ts): map isSponsored -> boostedUntil, return derived isSponsored. (Safe: single file, no schema changes.)
2. Add small compatibility mapper for vendor DTOs used by admin vendor lists (server/repositories/vendor.repo.ts and DTO mapping) to include derived isSponsored = boostedUntil > now. This is optional but recommended to reduce other mismatch failures.
3. Run npm run typecheck and run integration smoke tests: Add Vendor, Sponsor toggle, Status update, Vendor edit.
4. Triage remaining server files that still reference `isSponsored` in prisma selects/updates and replace them with computed derived property or boostedUntil mapping as required. Prioritize files that cause runtime failures.

Files referencing isSponsored (inventory - priority)
- server/routes/admin/vendor.control.ts (sponsorship handler) — fix recommended.
- server/repositories/vendor.repo.ts — selects isSponsored (change to derive from boostedUntil before returning or include boostedUntil in select and compute client-side).
- server/routes/marketplace/stores.routes.ts — maps isSponsored in DTOs.
- server/services/searchUnified.service.ts — sets isSponsored.
- server/routes/payments.cashfree.routes.ts — references vendor.isSponsored & boostExpiry/boostExpiry mismatches.
- server/dto/entity.dto.ts — maps isSponsored in DTOs.
- client/src/pages/admin/VendorManagement.tsx and client components — consume isSponsored; will work if API includes derived boolean in responses.

Why not change Prisma schema?
- Project policy (explicit): NO schema changes without chief architect approval. Migration shows intentional removal; undoing is risky.

Validation notes / UI button unclickable root causes
- Primary cause for sponsorship toggle appearing to fail: missing/invalid handler (calls succeed with 500) because server tries to write non-existent field -> frontend sees failure and doesn't update state.
- Secondary issues that may make buttons unclickable:
  - UI disabled state could be tied to presence of vendor.isSponsored in data; if undefined, UI may render incorrectly (but code toggles using !v.isSponsored so undefined toggles to true). Not primary cause.
  - Some handlers missing or router not mounted (we already mounted vendor.control earlier). Approve/suspend handlers exist in admin.routes.ts and vendor.control.ts.
  - Runtime exceptions at server produce error responses which the frontend may not surface beyond failing to update UI.

Stop point
- I will NOT change schema or run migrations.
- I will NOT apply runtime fixes until receiving approval to implement the recommended A-class fix (single-file mapping in vendor.control sponsorship handler) and optionally the vendor DTO compatibility step.

If approved (explicit): I will
- Implement the sponsorship handler mapping (isSponsored -> boostedUntil) and return vendor with derived isSponsored.
- Run npm run typecheck and basic smoke tests for Add Vendor, Toggle Sponsorship, Update Status, Vendor Edit.

Prepared artifacts
- This report (VENDOR_GOVERNANCE_DRIFT_REPORT.md).
- Inventory of files referencing isSponsored (above) for follow-up work.

Timestamp: 2026-05-17T11:31:21+05:30
