# Tenant Authority Audit — Isolation & Context Trace

This document audits the lifecycle of multi-tenant isolation in BharatOS, tracing the resolution of district scope from incoming request to the Prisma database queries.

---

## 1. Tenant Lifecycle Context Trace

```
Client Request (e.g. GET /api/marketplace/products with x-district-slug: shahdol)
  ↓
api/index.ts (Global Middleware Stack)
  ↓
tenantResolver (First Execution - Global)
  ├─ Reads x-district-slug header
  ├─ Queries DB: findDistrictBySlug("shahdol") -> resolved ID: 1
  ├─ Sets req.districtId = 1, req.ctx.districtId = 1
  └─ Binds to AsyncLocalStorage: tenantContext.getStore().districtId = 1
  ↓
requireAuth / optionalAuth (Route-level Middleware)
  ├─ Validates JWT token from cookie or header
  ├─ Fetches DB user (e.g. user belongs to district 2 - Bhopal)
  ├─ Validates district match
  ├─ Sets req.districtId = 2, req.ctx.districtId = 2
  └─ 🚨 CRITICAL FLUSH FAILS: Does NOT update AsyncLocalStorage tenantContext!
  ↓
server/routes/marketplace/products.routes.ts (Route Router)
  ↓
tenantResolver (Second Execution - Local Router Wrapper)
  ├─ Runs again for /marketplace routes
  └─ Performs redundant database lookup for slug (findDistrictBySlug)
  ↓
Prisma Query Interceptor ($extends query hook in server/storage.ts)
  ├─ Operation intercepted: findMany on Product
  ├─ Reads from AsyncLocalStorage: tenantContext.getStore().districtId (still holds 1!)
  └─ Appends filter: where: { districtId: 1 }
  ↓
Prisma Database Access
  └─ Returns products from District 1 (Shahdol) instead of District 2 (Bhopal)
```

---

## 2. Identified Vulnerabilities & Risks

### A. AsyncLocalStorage Context Divergence (Critical)
* **Vulnerability:** While `requireAuth` and `optionalAuth` correctly validate the JWT token and update `req.districtId` and `req.ctx.districtId` to match the user's authentic district from the database, they **do not propagate this updated districtId to the AsyncLocalStorage `tenantContext` store**.
* **Impact:** Any database queries executed downstream that rely on Prisma's auto-isolation hook will use the `districtId` captured by the global `tenantResolver` pass (resolved from the client header `x-district-slug`), rather than the validated user's district. If a user maliciously or accidentally sends a different header (e.g. `x-district-slug: shahdol` when their profile is locked to Bhopal), the DB query hook filters by Shahdol, causing data leakage or context bugs.

### B. Double `tenantResolver` Executions (Performance Degrade)
* **Vulnerability:** `tenantResolver` is mounted globally on `/api` in `api/index.ts` and again locally on `/marketplace`, `/analytics`, and `/search` routes in `server/routes/index.ts`.
* **Impact:** For every guest search or marketplace browse request, the database performs two redundant `findDistrictBySlug` queries, doubling database load.

### C. Public Route Bypass Ordering
* **Vulnerability:** In `tenantResolver.ts`, the list of public bypass routes is hardcoded:
  ```typescript
  const isPublicRoute =
    req.originalUrl.startsWith("/api/health") ||
    req.originalUrl.startsWith("/api/docs") ||
    req.originalUrl.startsWith("/api/auth/") ||
    req.originalUrl.startsWith("/api/districts");
  ```
  If new public routes are added to the application, they will return `400 Bad Request` unless manually added to this hardcoded list, posing a maintenance and runtime fragility risk.
