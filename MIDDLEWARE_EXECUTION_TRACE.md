# MIDDLEWARE EXECUTION TRACE

This document traces the current execution path and count of the `tenantResolver` middleware across various endpoint patterns in BharatOS.

---

## 1. Trace Inventory

### A. Marketplace Routes (e.g., `GET /api/marketplace/products`)
1. **Global App Scope:** Runs via `app.use("/api", tenantResolver)` in the main app entrypoint.
   - *Status:* Resolves `x-district-slug` header or body parameters, performs database lookup, and sets `req.districtId` and ALS `tenantContext` store.
2. **Route Router Scope:** Runs via `app.use("/marketplace", tenantResolver, productsRoutes)` in `server/routes/index.ts`.
   - *Status:* Executes again, repeating the database lookup and rewriting the ALS store.
- **TOTAL EXECUTIONS:** **2** (Duplicate execution detected)

---

### B. Search Routes (e.g., `GET /api/search?q=hospital`)
1. **Global App Scope:** Runs via `app.use("/api", tenantResolver)` in the main app entrypoint.
   - *Status:* Resolves district from header, binds to request and ALS.
2. **Route Router Scope:** Runs via `app.use("/search", tenantResolver, searchUnifiedRoutes)` in `server/routes/index.ts`.
   - *Status:* Re-executes the resolver and rewrites context.
- **TOTAL EXECUTIONS:** **2** (Duplicate execution detected)

---

### C. Analytics Routes (e.g., `POST /api/analytics/track`)
1. **Global App Scope:** Runs via `app.use("/api", tenantResolver)` in the main app entrypoint.
   - *Status:* Parses tracking body for districtSlug fallback, binds to request and ALS.
2. **Route Router Scope:** Runs via `app.use("/analytics", tenantResolver, analyticsRoutes)` in `server/routes/index.ts`.
   - *Status:* Re-executes resolver and rewrites context.
- **TOTAL EXECUTIONS:** **2** (Duplicate execution detected)

---

### D. Auth Routes (e.g., `POST /api/auth/login`)
1. **Global App Scope:** Runs via `app.use("/api", tenantResolver)` in the main app entrypoint.
   - *Status:* Automatically matches public bypass check: `req.originalUrl.startsWith("/api/auth/")`. Returns `next()` immediately without resolving slug or database lookup.
2. **Route Router Scope:** Mounts router via `app.use("/auth", authRoutes)` in `server/routes/index.ts` with no local resolver attached.
- **TOTAL EXECUTIONS:** **1** (Immediate bypass, zero resolver operations performed)

---

## 2. Remediation Action Plan

We will remove duplicate route-level registrations of `tenantResolver` in [server/routes/index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts#L353-L357):
- Modify the mount statements to pass only the routers.
- This ensures `tenantResolver` runs exactly once globally at the app level, and avoids redundant database queries and memory allocation.
