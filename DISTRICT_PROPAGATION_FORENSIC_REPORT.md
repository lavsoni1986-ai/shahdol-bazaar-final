# DISTRICT PROPAGATION FORENSIC REPORT

## 1. Audit Scope
- Goal: identify front-end request paths that bypass canonical `x-district-slug` propagation.
- Focused on active client app code in `client/src/`.
- Also noted stale/legacy raw fetch patterns outside the main app.

## 2. Canonical Transport
- `client/src/lib/api-client.ts` is the canonical API client.
- It normalizes endpoint paths, prefixes `/api/`, and adds:
  - `x-district-slug: resolveCanonicalDistrictSlug()`
- All active app requests should use `apiRequest(...)`.

## 3. Active App Findings
### Verified canonical usage
- `client/src/pages/product-detail.tsx` uses `apiRequest(...)` for:
  - `marketplace/products/${Number(productKey)}`
  - `marketplace/products/slug/${safeSlug}`
  - `marketplace/reviews/${product.id}`
  - `marketplace/reviews` (review POST)
- `client/src/services/vendor.service.ts` uses `apiRequest(...)` for vendor + analytics + leads.
- `client/src/hooks/useSafeQuery.ts` and `client/src/hooks/useLoadMore.ts` use `legacyApiRequest(...)`, which delegates to `apiRequest(...)`.
- No active `@/lib/api` imports were found in `client/src/`; `client/src/lib/api.ts` is present but unused.

### Active bypass discovered
- `client/src/pages/admin/AdminLayout.tsx` previously used raw `fetch("/api/admin/districts")`.
- This bypassed the canonical transport layer and its district slug logic.

## 4. Legacy / inactive bypass candidates
- `client-tracking.ts` contains a raw `fetch('/api/marketplace/events')` without `x-district-slug`
  - No imports were found for `client-tracking.ts` in the repo, so this appears dormant.
- `admin-ui-components.ts` has commented-out raw fetches.
- `client-realtime-dashboard.ts` has commented-out raw fetches.

## 5. Fixes Applied
- Updated `client/src/pages/admin/AdminLayout.tsx` to use the canonical `apiRequest('GET', 'admin/districts')`.
- This ensures the admin district switcher follows the same district header propagation model as the rest of the app.

## 6. Risk Assessment
- `client/src/pages/product-detail.tsx` review fetch path is already using canonical transport and should not be the source of a missing `x-district-slug` header in the current repo.
- The most likely active bypass in the front-end audit was the admin layout raw fetch.

## 7. Recommendation
- Keep `client/src/lib/api-client.ts` as the single source of truth for browser API calls.
- Remove or refactor any remaining raw `fetch('/api/...')` usage in active client code.
- If `client-tracking.ts` becomes active, update it to use `apiRequest(...)` or add the district header explicitly.
