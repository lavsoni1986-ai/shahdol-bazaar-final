# Typecheck Triage Report

Date: 2026-05-15T14:44:10+05:30
Working dir: E:/Shahdol-Bazaar-MVP

Summary
- Ran npm run typecheck after constitutional cleanup and Prisma client generation.
- Created this triage to categorize remaining TypeScript errors blocking full dev startup.

Error categories (high-level)
1) Shared contract drift (HIGH)
  - Symptoms: Many client and server modules reference shared types that no longer match (missing fields, renamed properties, incompatible shapes).
  - Sample files / errors:
    - client/src/components/AIRecommendations.tsx — CanonicalEntity vs AIRecommendation / TrendingItem mismatch
    - client/src/contexts/BrandingProvider.tsx — DistrictPublicContract missing ogImageUrl/twitterImageUrl/imageUrl
    - client/src/shared/district-intelligence/types.ts — LocalityInsight incorrectly extends DistrictInsight
    - server/types/sovereign.ts — SovereignRequest.user shape incompatible with Request user type
  - Root cause: central shared contracts evolved (or partial imports) while consumers remained with older expectations.
  - Severity: P0/P1 (blocks client features & admin UX).
  - Recommended fix order:
    1. Reconcile shared contracts in shared/* to canonical shapes (single source of truth).
    2. Update consumers to use new properties or adapt via minimal adapters in same module (not cross-cutting).

2) Prisma type mismatch (HIGH)
  - Symptoms: Many server callsites send fields removed/renamed in Prisma client (dsslScore, isSponsored, districtId on Product, etc). Many object-literal property mismatches when calling prisma client.
  - Sample files / errors:
    - server/repositories/product.repo.ts (districtId/slug usage)
    - server/repositories/vendor.repo.ts (isSponsored/select fields)
    - server/routes/admin.routes.ts (vendor create/update payloads mismatch)
  - Root cause: Prisma schema changed (or code references older schema). Prisma client has been regenerated (we ran generate) exposing current schema types.
  - Severity: P0 (server runtime and admin APIs rely on these shapes).
  - Recommended fix order:
    1. Audit prisma schema vs callsites; update callsites to match prisma types.
    2. If schema intentionally changed, coordinate migration plan; otherwise, revert mismatched callsites.

3) Route / response mismatch (MEDIUM)
  - Symptoms: Code expects fields in API responses that are absent or differently named (e.g., dsslStats._avg, totalAmount, flags, searchText).
  - Sample files / errors:
    - server/routes/admin.routes.ts (assumptions about aggregated shapes)
    - server/routes/admin/admin.routes.ts (order totals / vendor fields)
  - Root cause: response shapes changed (aggregates, selects), consumers not updated.
  - Severity: P1
  - Recommended fix order:
    1. Add explicit local type guards or safe accessors around aggregated responses.
    2. Normalize admin response shapes in server endpoints or update client expectations.

4) Ontology duplication & enum mismatches (MEDIUM)
  - Symptoms: Duplicate identifiers, enum mismatches between OperationalSignalType and CanonicalSignal usage; duplicate constants (TTL_CONFIG duplicate removed earlier)
  - Sample files / errors:
    - shared/contracts/ontology/assertions.ts (CANONICAL_SIGNALS missing/misused)
    - shared/contracts/ontology/resolver-pipeline.ts (ConstitutedSignal vs OperationalSignal mismatch)
    - shared/contracts/ontology/signal-engine.ts (CanonicalSignal | OperationalSignalType assignment issues)
  - Root cause: ontology modules split and partially duplicated; enums/types not strictly partitioned.
  - Severity: P1
  - Recommended fix order:
    1. Centralize canonical enums in single file and export one canonical mapping (index.ts already present — reconcile duplicates).
    2. Update usages to consistent enum types or widen union types where semantically valid.

5) Legacy / missing modules & dead imports (LOW)
  - Symptoms: Missing imports in client (archive/legacy references), leftover legacy code referencing older shared paths.
  - Sample files / errors:
    - client/src/core/* referencing shared types under legacy paths
    - client/src/shared/* index exports pointing to broken relative paths
  - Root cause: partial repo restructuring and missing import bridges.
  - Severity: P2
  - Recommended fix order:
    1. Where safe, restore index re-exports or adjust import paths to shared/* canonical files.
    2. Archive truly legacy code under client/src/archive/ and remove from active tsconfig compilation until migrated.

Counts & top failing files (sample from tsc output)
- Total distinct failing source files (sample): >150 (see tsc output file)
- Top server hotspots: server/services/*, server/routes/admin.routes.ts, server/dto/entity.dto.ts
- Top shared/client hotspots: client/src/components/*, client/src/shared/*, shared/contracts/ontology/*

Constitutional-risk level
- HIGH — repo-wide contract drift between shared, client, and server plus Prisma schema mismatch. Left unaddressed will cause runtime errors and diverging behavior between admin/merchant shells.

Immediate next P0 actions (safe, minimal scope)
1. Fix shared contract canonicalization: pick single source (shared/contracts/*). Reconcile properties used by client (DistrictPublicContract enhancements: ogImageUrl, twitterImageUrl, imageUrl). Update shared/contracts.ts to reflect agreed shapes.
2. Update admin/client imports to a single API authority — completed.
3. Resolve Prisma mismatches only at server callsites: replace removed fields and ensure create/update shapes match generated client types (do not change schema).
4. Archive more legacy client code from active compilation by excluding folders in tsconfig and re-run typecheck to shrink error surface.

Artifacts created/modified in this phase
- Moved files into archive:
  - client/src/archive/legacy-admin/Dashboard.tsx (proxy to original)
  - client/src/archive/legacy-admin/AdminStats.tsx (proxy to original)
- Replaced internal API imports to single authority (@/lib/api-client) in admin Dashboard/AdminStats and verified globally where applicable
- Stabilized VendorManagement.tsx:
  - Wrapped in <AdminLayout>
  - Replaced alert(...) with toast.success/error
  - Added Vendor interface
  - Removed unsafe any where identified inside that file
- AdminLayout.tsx:
  - Removed hardcoded DISTRICTS constant
  - Added TanStack Query for GET /admin/districts and wired selector to backend
- Created shared/contracts/api/admin-response.contract.ts with AdminResponse/MutationResponse/ErrorResponse/PaginatedResponse types
- Ran Prisma commands: format, validate, generate (Prisma Client regenerated)
- Ran npm run typecheck and captured full output: saved to tool output (see Kilo logs)

Remaining blockers (summary)
- Widespread server-side type failures primarily due to Prisma/schema drift and shared contract mismatches.
- Client-side contract mismatches (CanonicalEntity vs AIRecommendation/TrendingItem) still need reconciliation.

Next recommended controlled steps (if you want me to proceed)
1. Reconcile DistrictPublicContract (add ogImageUrl/twitterImageUrl/imageUrl) in shared/contracts/district.contract.ts and update consumers.
2. Reduce typecheck scope by excluding deep shared/cognition/ modules and iteratively fix admin/client errors.
3. Triage and fix small Prisma callsites in server/admin routes that block admin runtime (vendor fields, product fields).

Attachments
- Full tsc output saved by the run: C:\Users\LAV\.local\share\kilo\tool-output\tool_e2af0ae23001gcKgDBVzlRny16

