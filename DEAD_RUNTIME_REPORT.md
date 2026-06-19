# Dead Runtime Report — Unused Files Inventory

This document identifies files that are currently part of the codebase but are unused/dead at runtime in the production environment.

---

## 1. Dead Serverless Entrypoints

At Vercel runtime, the catch-all rewrite rule (`/api/(.*) -> /api/index`) causes Vercel to route all API calls to `api/index.ts`. Consequently, the following files in the `api/` directory are never executed:

### A. `api/auth.ts`
* **Why it is dead:** Any request directed to `/api/auth/*` is rewritten to `api/index.ts` by the wildcard rewrite.
* **What currently replaces it:** The auth routes are loaded by `api/index.ts` via `server/routes/index.ts` (`app.use("/auth", authRoutes)`).
* **Retirement Recommendation:** Yes, should be retired after consolidating the routes under `api/index.ts`.

### B. `api/admin.ts`
* **Why it is dead:** Wildcard rewrite routes all `/api/admin/*` calls to `api/index.ts`.
* **What currently replaces it:** Loaded by `api/index.ts` via `server/routes/index.ts` (`app.use("/admin", adminRoutes)`).
* **Retirement Recommendation:** Yes, should be retired.

### C. `api/ai.ts`
* **Why it is dead:** Wildcard rewrite routes all `/api/ai/*` calls to `api/index.ts`.
* **What currently replaces it:** Loaded by `api/index.ts` via `server/routes/index.ts` (`app.use("/ai", aiRoutes)` and `app.use("/ai", dsslRoutes)`).
* **Retirement Recommendation:** Yes, should be retired.

### D. `api/marketplace.ts`
* **Why it is dead:** Wildcard rewrite routes all `/api/marketplace/*` calls to `api/index.ts`.
* **What currently replaces it:** Loaded by `api/index.ts` via `server/routes/index.ts` (`app.use("/marketplace", tenantResolver, storesRoutes)` etc.).
* **Retirement Recommendation:** Yes, should be retired.

### E. `api/merchant.ts`
* **Why it is dead:** Wildcard rewrite routes all `/api/merchant/*` calls to `api/index.ts` (mapped under root router).
* **What currently replaces it:** Loaded by `api/index.ts` via `server/routes/index.ts` (`app.use("", merchantRoutes)`).
* **Retirement Recommendation:** Yes, should be retired.

### F. `api/health.ts`
* **Why it is dead:** Wildcard rewrite routes `/api/health` to `api/index.ts`.
* **What currently replaces it:** `api/index.ts` has its own inline `/api/health` check route (lines 260-268).
* **Retirement Recommendation:** Yes, should be retired.

---

## 2. Dead Shared Assets

### G. `api/bootstrap.ts`
* **Why it is dead:** This shared bootstrap logic is exclusively imported by the dead direct serverless entrypoints (`api/auth.ts`, `api/admin.ts`, etc.).
* **What currently replaces it:** The master express app is defined and bootstrapped directly in `api/index.ts`.
* **Retirement Recommendation:** Yes. This file also contains the broken module imports (`telemetryMiddleware` and `routeTimeTracker` from `observability.ts`) that caused the cold-start crashes in previous versions. Retiring this file completely eliminates that vulnerability.

---

## 3. Orphaned/Unmounted Router Files

These routers are located in `server/routes/` but are never imported or mounted by any active router:

* **`server/routes/admin/ai-dashboard.routes.ts`:** Leftover or experimental dashboard endpoints. Completely orphaned. Should be retired.
* **`server/routes/admin/ai-providers.routes.ts`:** Unused AI configuration manager. Should be retired.
* **`server/routes/admin/ai_stats.ts`:** Unused admin stats file. Should be retired.
* **`server/routes/admin/dssl.control.ts`:** Historical control panels. Should be retired.
* **`server/routes/admin/hyper.regional.control.ts`:** Abandoned regional routes. Should be retired.
* **`server/routes/ai/synthesis.orchestrator.ts`:** Unused orchestration helper. Should be retired.
* **`server/routes/ai/telemetry.orchestrator.ts`:** Unused telemetry helper. Should be retired.
* **`server/routes/marketplace/vendor-reviews.routes.ts`:** Duplicate reviews manager. Should be retired.
* **`server/routes/marketplace/vendors.routes.ts`:** Historical trust score routing file. Should be retired.
* **`server/routes/vendor.routes.ts`:** Orphaned duplicate router. Should be retired.
