# TRANSPORT_UNSAFE_PATTERNS

Purpose: inventory of callers that rely on legacy ApiResponse shape ({ success, data, error }) or inspect nested payloads. These are the highest-risk spots during migration and must either use the compatibility bridge (client/src/lib/api-compat.ts) or be updated to throw-compatible patterns before removing the bridge.

Format: file — exact pattern — migration difficulty — risk severity

HIGH RISK
- client/src/contexts/AuthContext.tsx: if (res?.success && userPayload) — expects success flag for auth hydration. Migration difficulty: HIGH. Risk: CRITICAL.
- client/src/services/vendor.service.ts: if (!result.success) { throw new Error(result.error) } (multiple locations) — fetchVendorBySlug/fetchVendorById/fetchVendorProducts. Migration difficulty: HIGH. Risk: HIGH (merchant flows & analytics).
- client/src/pages/admin/VendorManagement.tsx: handles admin POST/PATCH and expects result shapes & shows toasts — pattern: const response = await apiRequest(...); if (!response.success) ...; Migration difficulty: HIGH. Risk: CRITICAL.
- client/src/pages/admin/Dashboard.tsx: if (!result.success) throw new Error(result.error) — admin district locks. Migration difficulty: HIGH. Risk: CRITICAL.
- client/src/pages/admin/ProductsPanel.tsx: toast on approve; reads result.success — Migration difficulty: HIGH. Risk: HIGH.
- client/src/pages/admin/PolicyPanel.tsx: mutationFn uses apiRequest and expects result. Migration difficulty: HIGH. Risk: CRITICAL.

MEDIUM RISK
- client/src/hooks/useSafeQuery.ts: if (!res || res.success === false) { throw Error } and then normalize res.data — pattern: res.success / res.data. Migration difficulty: MEDIUM. Risk: MEDIUM.
- client/src/hooks/useLoadMore.ts: if (!res || res.success === false) ... const data = res.data ?? [] — Migration difficulty: MEDIUM. Risk: MEDIUM.
- client/src/hooks/useBalance.ts: return res.data as WalletBalance — Migration difficulty: MEDIUM. Risk: MEDIUM.
- client/src/pages/shop-detail.tsx: const result = await apiRequest(...); if (!result.success) { ... } and later leadResult.success check — Migration difficulty: MEDIUM. Risk: MEDIUM.
- client/src/pages/category-listing.tsx: if (!res.success) { ... } — Migration difficulty: LOW-MEDIUM. Risk: MEDIUM.
- client/src/components/merchant/LimitModal.tsx: if (response.success && response.data.paymentLink) — payment flow; Migration difficulty: MEDIUM. Risk: HIGH (payments).
- client/src/components/admin/DistrictManager.tsx: if (response?.success) { ... } — Migration difficulty: MEDIUM. Risk: MEDIUM.

LOW RISK
- client/src/pages/marketplace.tsx: many reads but mostly react-query; some call-sites expect data fields — check per-file. Migration difficulty: LOW. Risk: LOW.
- client/src/pages/product-detail.tsx: uses res from apiRequest then calls normalize/uses toast — many calls are try/catch-friendly; Migration difficulty: LOW. Risk: LOW.
- client/src/pages/checkout.tsx: uses result?.id and other fields — verify shape usage. Migration difficulty: LOW. Risk: MEDIUM (checkout flow).
- client/src/lib/admin-response.ts: safeData uses res.success/res.data — Migration difficulty: LOW (update to use compatibility helper or to accept thrown errors). Risk: MEDIUM.
- client/src/pages/admin/AdminLogin.tsx: if (data?.success && data?.data?.user) — Migration difficulty: HIGH (auth). Risk: CRITICAL.

PATTERNS FOUND (search tokens)
- "res.success" occurrences: multiple files — use TRANSPORT_CALLER_MATRIX to map.
- "res.data" occurrences: useSafeQuery.ts, useLoadMore.ts, useBalance.ts, admin-response.ts, and others.
- "result.error" usage: vendor.service.ts, admin pages — thrown or surfaced to UI.

RECOMMENDED ACTIONS
1. Use compatibility bridge for BRIDGED callers: import legacyApiRequest from '@/lib/api-compat' and replace only within bridged files until caller updated.
2. For HIGH RISK callers (auth, admin mutations, analytics): do NOT change runtime to compatibility bridge automatically. Perform manual update and exhaustive smoke tests.
3. Update hooks that normalize data (useSafeQuery/useLoadMore) to unwrap compatibility responses via legacyApiRequest then normalize res.data; plan to remove bridge after callers become throw-compatible.
4. After each small migration, run: npm run typecheck && npm run build, and perform auth/district/merchant/admin smoke tests.

Appendix: A full grep of occurrences was used; this document highlights the prioritized list. For the exact full list of matches, see the earlier search logs in the migration workspace and TRANSPORT_CALLER_MATRIX.md.
