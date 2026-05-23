# TRANSPORT_CALLER_MATRIX

Objective: classify all transport consumers into SAFE, BRIDGED, HIGH RISK to guide controlled migration to canonical transport (api-client.ts).

Guidelines used:
- SAFE: callers already try/catch based, React Query based (they rely on thrown errors), or otherwise consume promise rejections (throw-compatible).
- BRIDGED: callers expect legacy ApiResponse shape (res.success, res.data, res.error) and need temporary compatibility handling.
- HIGH RISK: admin mutations, auth hydration, district-sensitive flows, analytics, optimistic UI; migrate last and with supervision.

Summary counts (approx):
- SAFE: Majority of admin & read-only React-Query queryFns and many components already using api-client.ts directly. ~85 files.
- BRIDGED: Files relying on res.success/res.data shape. ~35 files.
- HIGH RISK: AuthContext, vendor.service analytics & write methods, admin mutation pages/components, optimistic UI paths. ~25 files.

---

SAFE (examples — low migration friction)
- Criteria: using React Query queryFn => returns apiRequest directly (expects throw on failure)
- Files (representative):
  - client/src/pages/admin/AuditPanel.tsx (queryFn: apiRequest)
  - client/src/pages/admin/AdminDashboard.tsx (queryFns for admin system health etc.)
  - client/src/pages/admin/ai-dashboard.tsx
  - client/src/pages/partner-dashboard.tsx (most read queries)
  - client/src/pages/marketplace.tsx (many fetches use api-client and treat errors as exceptions)
  - client/src/hooks/useSearch.ts (uses apiRequest in queryFn)
  - client/src/components/SovereignAIAssistant.tsx
  - client/src/components/AISearchTerminal.tsx

Notes: Move these early in migration order (read-only public modules). Verify district header propagation after migration.

---

BRIDGED (needs compatibility or small caller changes)
- Criteria: directly inspects result.success / result.data / expects ApiResponse wrapper
- Representative files and rationale:
  - client/src/hooks/useSafeQuery.ts — expects res.success check before normalization (moderate difficulty)
  - client/src/hooks/useLoadMore.ts — reads res.data for pagination (moderate difficulty)
  - client/src/hooks/useBalance.ts — returns res.data as WalletBalance (moderate)
  - client/src/pages/shop-detail.tsx — checks if (!result.success) throw (easy to update)
  - client/src/pages/category-listing.tsx — expects res.success (easy)
  - client/src/components/merchant/LimitModal.tsx — checks response.success and response.data.paymentLink (moderate; payment flow caution)
  - client/src/pages/auth.tsx (some flows) — uses result shapes for registration/login (but auth is HIGH RISK in general)
  - client/src/lib/admin-response.ts — helper that inspects res.success/res.data

Migration difficulty: Usually low-to-moderate — either replace with try/catch and access returned payload (if api-client returns canonical payload directly), or temporarily call compatibility helper.

Migration recommendation for BRIDGED:
1. Short-term: import a small compatibility helper legacyApiRequest(method, endpoint, body) that calls canonical apiRequest and returns legacy-shaped ApiResponse (wraps success/data on success, catches and returns { success:false, error: message }). Mark import clearly and use only for bridged callers.
2. Medium-term: update callers to be throw-compatible (try/catch or rely on React Query) and remove legacyApiRequest usage.
3. Long-term: delete compatibility helper.

---

HIGH RISK (migrate last, manual verification required)
- Criteria: auth hydration, admin mutations, analytics events, district-sensitive UI, optimistic updates
- Files / areas:
  - Auth
    - client/src/contexts/AuthContext.tsx — checkAuth uses apiRequest and expects success flag logic; critical for session persistence and login flows
    - client/src/pages/admin/AdminLogin.tsx — login flow; expects data?.success check
  - Admin mutations & dashboards
    - client/src/pages/admin/VendorManagement.tsx — PATCH/POST admin vendor mutations
    - client/src/pages/admin/Dashboard.tsx — district lock/patch endpoints
    - client/src/pages/admin/ProductsPanel.tsx — product approve/reject mutations
    - client/src/pages/admin/PolicyPanel.tsx — policy patch/simulate endpoints
    - client/src/components/admin/DistrictManager.tsx — district add endpoints
    - client/src/components/admin/HyperRegionalDashboard.tsx — admin hyper actions
  - Merchant / partner critical writes
    - client/src/pages/partner-dashboard.tsx — product create/update/delete endpoints, image upload
    - client/src/services/vendor.service.ts — analytics.track & captureLead (also fetchVendorBySlug/id, fetchVendorProducts) — these functions currently throw based on result.success; analytics writes must preserve auth/district semantics
  - Analytics & Observability
    - client/src/lib/ai-brain.ts — ai/track calls
    - Any frontend code sending analytics (track endpoints) — ensure cookies/credentials and district header included
  - Optimistic UI patterns
    - Components which optimistically update UI after POST/PATCH (various vendor/product actions)

Migration difficulty: High. Requires manual verification of auth sessions (cookies), district header propagation, admin permission enforcement, and rollback safety.

Migration order for HIGH_RISK:
1. Ensure compatibility helper covers these callers if necessary.
2. Perform exhaustive smoke tests: admin mutations, login/logout, dashboard load, merchant dashboard operations, analytics ingestion.
3. Only after green validations, convert to direct apiRequest usage (throw semantics) and remove compat usage.

---

Per-role mapping (selected files)
- Admin (HIGH_RISK): client/src/pages/admin/*, client/src/components/admin/*
- Customer (SAFE/BRIDGED mix): client/src/pages/marketplace.tsx, product-detail.tsx (mostly SAFE), useHomeSnapshot.ts (we migrated to api-client — BRIDGED? normalization handles both)
- Merchant (HIGH_RISK/BRIDGED): client/src/pages/partner-dashboard.tsx, client/src/services/vendor.service.ts
- Auth (HIGH_RISK): client/src/contexts/AuthContext.tsx, client/src/pages/auth.tsx, client/src/pages/admin/AdminLogin.tsx
- Analytics: client/src/services/vendor.service.ts (trackAnalytics), client/src/lib/ai-brain.ts (track) — HIGH_RISK
- Realtime: no central transport consumers found for websocket-based realtime in this grep; treat as N/A

---

Safe migration cluster order (repeatable, verify after each cluster):
1. Read-only public modules (safe) — marketplace listing, product pages, home snapshot (verify normalization)
2. Analytics (with compatibility guard) — vendor.service.trackAnalytics, ai-brain tracking (monitor delivery)
3. Customer panels — checkout, carts, user-facing pages (verify session & district header)
4. Merchant panels — partner-dashboard and services (large testing)
5. Admin runtime last — manual verification and staged rollout

---

Notes and Constraints
- Do NOT perform bulk automated import replacement. Use per-file changes and run typecheck/build after each cluster.
- Compatibility helper is temporary; must be explicitly flagged and removed after migration.
- All changes must preserve cookies (credentials: include) and x-district-slug header doctrine.

Generated by: constitutional stabilization automation
