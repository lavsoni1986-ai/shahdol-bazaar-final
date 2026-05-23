# TRANSPORT_DRIFT_REPORT

## Executive Summary

Objective: Unify frontend transport to a single canonical authority: `client/src/lib/api-client.ts`.

Current state: Active duplication between `client/src/lib/api-client.ts` (canonical target) and `client/src/lib/api.ts` (legacy/alternate transport). Multiple frontend modules import `api-client.ts`; a small set still import `api.ts` or the relative `../lib/api` variant, producing split-brain behavior.

Impact: Auth inconsistency, district propagation drift, response normalization mismatch, silent runtime divergence, cache inconsistency, governance instability.

---

## Inventory

A. Files importing api-client (canonical):

(Full list discovered in repository search)

- client/src/pages/admin/AuditPanel.tsx
- client/src/contexts/AuthContext.tsx
- client/src/pages/admin/VendorManagement.tsx
- client/src/pages/admin/AdminStats.tsx
- client/src/pages/admin/Dashboard.tsx
- client/src/pages/partner-dashboard.tsx
- client/src/pages/vendor-register.tsx
- client/src/pages/product-detail.tsx
- client/src/pages/marketplace.tsx
- client/src/pages/marketplace-product.tsx
- client/src/pages/hospitals.tsx
- client/src/pages/customer-dashboard.tsx
- client/src/pages/checkout.tsx
- client/src/pages/category-listing.tsx
- client/src/pages/auth.tsx
- client/src/pages/admin/UserPanel.tsx
- client/src/pages/admin/PolicyPanel.tsx
- client/src/pages/admin/FraudCenter.tsx
- client/src/pages/admin/EmergencyPanel.tsx
- client/src/pages/ServiceDetail.tsx
- client/src/pages/MyOrders.tsx
- client/src/pages/BusTimetable.tsx
- client/src/pages/admin/AdminLogin.tsx
- client/src/pages/admin/AdminDashboard.tsx
- client/src/lib/order-logic.ts
- client/src/hooks/useDistricts.ts
- client/src/components/merchant/SubscriptionMeter.tsx
- client/src/components/merchant/LimitModal.tsx
- client/src/components/home/LocalPulseBanner.tsx
- client/src/components/VoiceSearch.tsx
- client/src/components/category-section.tsx
- client/src/components/admin/HyperRegionalDashboard.tsx
- client/src/components/admin/DistrictManager.tsx
- client/src/components/admin/CashFlowStatus.tsx
- client/src/components/admin/AIInsights.tsx
- client/src/components/SovereignGlobalSearch.tsx
- client/src/components/SovereignAIAssistant.tsx
- client/src/components/PricingPlans.tsx
- client/src/components/FloatingWhatsApp.tsx
- client/src/components/Cart.tsx
- client/src/components/BookingModal.tsx
- client/src/hooks/useHomeSnapshot.ts (Note: imports `@/lib/api` currently; this file is listed here for attention)
- client/src/pages/admin/DistrictsPanel.tsx
- client/src/components/AISearchTerminal.tsx
- client/src/hooks/useSearch.ts
- client/src/pages/services.tsx
- client/src/pages/schools.tsx
- client/src/pages/archive/legacy/marketplace/marketplace-store.tsx
- client/src/pages/archive/legacy/marketplace-stores.tsx
- client/src/pages/archive/legacy/ReviewsPanel.tsx
- client/src/pages/admin/OrdersPanel.tsx
- client/src/pages/admin/NewsPanel.tsx
- client/src/pages/admin/CategoriesPanel.tsx
- client/src/pages/archive/legacy/BannersPanel.tsx
- client/src/pages/admin/ProductsPanel.tsx
- client/src/pages/archive/legacy/VendorPanel.tsx
- client/src/pages/archive/legacy/school.tsx
- client/src/pages/archive/legacy/DSSLControl.tsx
- client/src/components/archive/legacy/StickyAlerts.tsx
- client/src/components/vendor/VendorBoostStatus.tsx
- client/src/components/archive/legacy/DSSLHistoryChart.tsx
- client/src/hooks/useTrustScore.ts
- client/src/hooks/useSafeQuery.ts
- client/src/hooks/useLoadMore.ts
- client/src/pages/VendorDashboard.tsx
- client/src/hooks/useBalance.ts
- client/src/components/vendor/NebulaPulse.tsx
- client/src/components/DSSL/DSSLLeaderboard.tsx
- client/src/test-connectivity.js (imports local ./lib/api-client.js)
- legacy-archive and graveyard files referencing api-client (archival)

> Notes: Many of the above already use `api-client` as intended. Some legacy/archived files also reference it but are not part of active runtime; they are included for completeness.

B. Files importing api.ts (legacy / alternate transport):

- client/src/hooks/useHomeSnapshot.ts (imports `@/lib/api`)  <-- active
- client/src/services/vendor.service.ts (imports `../lib/api`) <-- active

(Ad hoc/legacy archives may also reference `api.ts` in `_graveyard_...` paths; those are not in active runtime.)

---

## Categorization by runtime role

- Admin
  - client/src/pages/admin/*
  - client/src/components/admin/*
  - Most admin modules already import `api-client`.

- Customer
  - client/src/pages/marketplace.tsx
  - client/src/pages/product-detail.tsx
  - client/src/pages/category-listing.tsx
  - client/src/pages/hospitals.tsx
  - client/src/pages/services.tsx
  - client/src/hooks/useHomeSnapshot.ts (currently using `api.ts`) — customer-read-only

- Merchant/Partner
  - client/src/pages/VendorDashboard.tsx
  - client/src/components/vendor/*
  - client/src/services/vendor.service.ts (currently using `api.ts`) — merchant service, analytics, write operations

- Auth
  - client/src/pages/auth.tsx
  - client/src/contexts/AuthContext.tsx
  - client/src/shared/api/response-normalizers.ts (normalizeAuthResponse)

- Realtime
  - No dedicated realtime transport files detected referencing api or api-client.

- Analytics
  - client/src/services/vendor.service.ts (trackAnalytics) — currently uses `api.ts` (via ../lib/api). Many analytics calls in other modules already use `api-client`.

---

## Key Behavioral Differences (api-client.ts vs api.ts)

1. District header propagation
   - api-client.ts: Always sets `x-district-slug` using `resolveCanonicalDistrictSlug()` (URL → localStorage fallback → default "shahdol").
   - api.ts: Adds `x-district-slug` selectively only for marketplace/analytics routes and excludes admin; derives district from DistrictContext (`getDistrictFromContext()`).

   Risk: Duplicate semantics cause district drift between components that rely on URL/localStorage vs DistrictContext. Admin endpoints may have intentionally omitted district header.

2. Authentication / credentials
   - api-client.ts: Uses `credentials: "include"` (cookie-based auth) by default.
   - api.ts: Does not include `credentials: "include"` anywhere; presumes header-based auth or context-managed tokens.

   Risk: Parts of app using cookie-based sessions rely on `credentials: include`; others may rely on explicit Authorization headers. Switching authority may change which requests include cookies.

3. Error handling and response expectations
   - api-client.ts: Reads response text → attempts JSON parse → requires presence of `success` key; throws Error on non-ok responses.
   - api.ts: Validates Content-Type header for `application/json`, parses JSON, validates response shape via `validateApiResponse`, and on non-ok returns a validated failure ApiResponse (does not throw). Uses createDomainError abstractions.

   Risk: Call sites expect either thrown exceptions (promise rejection) or receive an ApiResponse with success=false. Divergence causes silent behavioral mismatches.

4. Observability and logging
   - api.ts: Extensive transport logging and response time metrics; logs hasAuth by checking Authorization header.
   - api-client.ts: Minimal logging; logs parse errors only.

   Risk: Admin observability endpoints may rely on api.ts logs; migration requires ensuring observability is preserved or reproduced elsewhere.

5. Helper utilities
   - api-client.ts exports: apiRequest, getData, getArrayData, persistPortalContext, getPortalContext.
   - api.ts exports: apiRequest, ApiResponse type, validateApiResponse.

   Risk: Type-level imports (ApiResponse) and validation usage are only exported by api.ts; migrating those modules requires adjusting type imports or adding compatible exports in api-client.ts.

---

## Identified Duplicated Helpers & Incompatibilities

- Duplicated intent: both offer `apiRequest` with differing signatures/behaviors.
- Duplicate responsibility: response shape validation appears in both (`validateApiResponse` vs runtime check for `success` in api-client). Different error flows (throw vs returning failed ApiResponse).
- Normalization: response normalization pipeline is centralized under `client/src/shared/api/response-normalizers.ts` and is independent; however, some callers expect `apiRequest` to return ApiResponse typed object to feed into normalization. Inconsistency in what `apiRequest` returns (throw vs returning failure) is a compatibility gap.

---

## Risk Map

- High risk
  - services/vendor.service.ts — uses `../lib/api` and exported ApiResponse type; writes/analytics operations; migrating requires type compatibility and careful auth checks.
  - useHomeSnapshot hook — currently uses `api.ts` and feeds into heavy normalization pipeline; however it's read-only and easily testable.

- Medium risk
  - AuthContext and admin flows that rely on thrown errors vs returned failure objects: ensure auth compatibility.
  - Modules that rely on `getArrayData` / `getData` (these exist only in api-client). Verify all call-sites expect same runtime semantics.

- Low risk
  - Pages/components already using `api-client` (majority): stabilization is about removing remaining legacy imports.
  - Legacy/archival files under /archive or /legacy directories — not active.

---

## Migration Order (Controlled)

Follow required order. For each cluster, run typecheck and build, and verify auth.

1. Read-only public modules (low risk)
   - Migrate: client/src/hooks/useHomeSnapshot.ts (import from api-client)
   - Validation: run typecheck, build, run UI smoke tests for homepage

2. Analytics
   - Migrate analytics call-sites that still use `api.ts` (e.g., services/vendor.service.ts.trackAnalytics)
   - Validation: verify analytics delivery and no auth regressions

3. Customer panels
   - Migrate any remaining customer-facing modules still importing `api.ts` (likely none after step 1)

4. Merchant panels
   - Migrate vendor.service.ts and merchant UI that rely on ApiResponse types

5. Admin runtime (last)
   - Validate admin observability & error handling

---

## High-risk Modules

- client/src/services/vendor.service.ts: uses `../lib/api` and `ApiResponse` type; performs POST analytics and leads; may assume different error handling.
- client/src/hooks/useHomeSnapshot.ts: used by home dashboard; normalization pipeline expects input shape and may rely on `api.ts` content-type checks.

## Safe Modules (no changes needed)

- Files already importing `client/src/lib/api-client.ts`.

---

## Recommended Pre-migration Checks (STEP 2 prerequisites)

1. Ensure `api-client.ts` provides the same runtime promise behavior (throw vs return) expected by callers or plan minimal adapter wrappers at call-sites.
2. Ensure `api-client.ts` exports the `ApiResponse` TypeScript type (or update importers to no longer import it) and any small utilities used by callers (getData/getArrayData exist in api-client).
3. Verify `api-client.ts`'s always-on `x-district-slug` header will not affect admin-only endpoints. If admin endpoints MUST be district-free, add a controlled opt-out parameter to apiRequest (documented) or ensure server ignores header for admin.
4. Check analytics write endpoints for cookie vs header-based auth expectations.

---

## Migration Plan Summary (concrete file actions)

Planned replacements (search-and-replace import only):

- client/src/hooks/useHomeSnapshot.ts
  - before: import { apiRequest } from "@/lib/api";
  - after:  import { apiRequest } from "@/lib/api-client";

- client/src/services/vendor.service.ts
  - before: import { apiRequest, type ApiResponse } from '../lib/api';
  - after:  import { apiRequest } from '@/lib/api-client';
  - Notes: Remove the imported ApiResponse type or re-declare/alias it from types in client/src/types/api.ts if needed.

No other active runtime imports of `api.ts` detected.

---

## Remaining Risks & Blockers (summary)

- Type compatibility: `api-client.ts` does not export ApiResponse interface. Call-sites importing that type must be updated.
- Error semantics: `api.ts` returned failures as ApiResponse(false) sometimes; `api-client.ts` throws on non-ok responses. This difference must be resolved by either:
  - Adapting callers to expect thrown errors, or
  - Adding a thin compatibility layer in `api-client.ts` to optionally return failure payloads instead of throwing (preferred only if low-friction).
- Admin expectations: confirm admin-exclusive routes tolerate `x-district-slug` header.
- Test coverage: ensure end-to-end auth flows (cookie-based sessions and token-based) are validated on migration.


---

## Outputs produced

- TRANSPORT_DRIFT_REPORT.md (this file)


End of TRANSPORT_DRIFT_REPORT
