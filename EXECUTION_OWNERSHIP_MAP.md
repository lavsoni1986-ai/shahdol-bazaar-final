# Execution Ownership Map — Duplicate Execution Chain Audit

**Audit Date:** 2026-06-19  
**Status:** EVIDENCE SECURED (CODE UNMODIFIED)  
**Objective:** Prove or disprove whether BharatOS currently has duplicated execution paths and map the execution flow for critical endpoints.

---

## Duplication Status Summary

**VERDICT: BHARATOS HAS DUPLICATED EXECUTION PATHS.**

The audit confirms that the codebase contains two parallel execution paths for almost all API endpoints:
1. **Path A (Direct Serverless Functions):** Individual endpoint files located under the `api/` directory (e.g., `api/auth.ts`, `api/marketplace.ts`, `api/merchant.ts`) bootstrapping via `api/bootstrap.ts`.
2. **Path B (Catch-all Serverless Function):** A single master entrypoint `api/index.ts` which imports the main server router (`server/routes/index.ts`) directly.

### Production Routing Enforcements
At Vercel runtime, **Path B (Catch-all)** is the active path used in production. This is because the rewrite rule in `vercel.json` intercepts all `/api/...` calls and routes them to `api/index.ts`:
```json
{
  "source": "/api/(.*)",
  "destination": "/api/index"
}
```
As a result:
- **Path A** entry files (`api/auth.ts`, `api/marketplace.ts`, `api/merchant.ts`) are **completely dead** in production.
- **Conflicting Middleware (CORS):** The active production path (`api/index.ts`) uses an inline CORS whitelist that lacks production domain origins like `shahdolbazaar.com`, whereas the dead direct path (`api/bootstrap.ts`) uses `centralizedCors` (which correctly reflects origins).
- **Duplicated Tenant Resolution:** Marketplace endpoints execute the `tenantResolver` middleware twice in their lifecycle—once at the entrypoint level and a second time at the router level.
- **Duplicate Router Mounts:** The product router (`products.routes.ts`) is imported twice and mounted at two different paths in the same router index.

---

## Detailed Endpoint Routing Matrix

### 1. `/api/auth/login`
* **Vercel Route Match:** `/api/(.*)` (rewritten to `/api/index`)
* **Entry File (Production):** `api/index.ts` *(Authoritative)*
* **Middleware Chain:** 
  1. `compression`
  2. `cors` (inline with limited origins)
  3. `helmet`
  4. Security Headers (HSTS, nosniff, DENY)
  5. `cookieParser`
  6. `apiCacheMiddleware`
  7. `express.json` / `express.urlencoded`
  8. Request tracking (`tenantContext.run` context injection)
  9. `tenantResolver` (district resolution)
  10. Route Flag Injection
  11. `loginLimiter` (rate limiter)
* **Controller:** `server/routes/auth.routes.ts` inlined handler:
  ```typescript
  router.post("/login", loginLimiter, async (req, res) => { ... })
  ```
* **Repository:** `findUserByUsername` in `server/repositories/user.repo.ts`.
* **Database Access Layer:** `prisma` client (`server/storage.ts`) querying `User` table.
* **Verdict:** `MULTIPLE PATHS`

```mermaid
graph TD
    subgraph Client Requests
        Req[POST /api/auth/login]
    end
    subgraph Path A (Direct - DEAD)
        Req -->|Bypassed by rewrite| Direct[api/auth.ts]
        Direct --> BootA[api/bootstrap.ts]
        BootA -->|CORS: centralizedCors| RouteA[server/routes/auth.routes.ts]
    end
    subgraph Path B (Catch-all - ACTIVE IN PRODUCTION)
        Req -->|vercel.json rewrite| Master[api/index.ts]
        Master -->|CORS: Inline whitelist| MasterRouter[server/routes/index.ts]
        MasterRouter --> RouteB[server/routes/auth.routes.ts]
        RouteB --> Repo[server/repositories/user.repo.ts]
        Repo --> DB[(Prisma User Table)]
    end
```
* **Conflicting Middleware:** CORS is handled by `centralizedCors` (uses whitelist mapping) in Path A, but runs on inline limited CORS (restricts to localhost and `*.bharatos.in`) in Path B.

---

### 2. `/api/auth/register`
* **Vercel Route Match:** `/api/(.*)` (rewritten to `/api/index`)
* **Entry File (Production):** `api/index.ts` *(Authoritative)*
* **Middleware Chain:**
  1. `compression`
  2. `cors` (inline with limited origins)
  3. `helmet`
  4. Security Headers (HSTS, nosniff, DENY)
  5. `cookieParser`
  6. `apiCacheMiddleware`
  7. `express.json` / `express.urlencoded`
  8. Request tracking (`tenantContext.run`)
  9. `tenantResolver`
  10. Route Flag Injection
  11. `registerLimiter` (rate limiter)
* **Controller:** `server/routes/auth.routes.ts` inlined handler:
  ```typescript
  router.post("/register", registerLimiter, async (req, res) => { ... })
  ```
* **Repository:**
  - `findDistrictBySlug` (`server/repositories/district.repo.ts`)
  - `findUserByUsername` (`server/repositories/user.repo.ts`)
  - `createUser` (`server/repositories/user.repo.ts`)
* **Database Access Layer:** `prisma` client (`server/storage.ts`) querying `User`, `District`, and `Vendor` tables (creates vendor record on auto-provisioning for merchants).
* **Verdict:** `MULTIPLE PATHS`
  - **Active Chain:** `api/index.ts` -> `server/routes/index.ts` -> `server/routes/auth.routes.ts`
  - **Dead Chain:** `api/auth.ts` -> `api/bootstrap.ts` -> `server/routes/auth.routes.ts`
  - **Conflicting Middleware:** Inline limited CORS in catch-all vs `centralizedCors` in bootstrap.

---

### 3. `/api/auth/verify`
* **Vercel Route Match:** `/api/(.*)` (rewritten to `/api/index`)
* **Entry File (Production):** `api/index.ts` *(Authoritative)*
* **Middleware Chain:**
  1. `compression`
  2. `cors` (inline with limited origins)
  3. `helmet`
  4. Security Headers (HSTS, nosniff, DENY)
  5. `cookieParser`
  6. `apiCacheMiddleware`
  7. `express.json` / `express.urlencoded`
  8. Request tracking (`tenantContext.run`)
  9. `tenantResolver`
  10. Route Flag Injection
  11. `optionalAuth` (auth validation helper)
* **Controller:** `server/routes/auth.routes.ts` inlined handler:
  ```typescript
  router.get("/verify", optionalAuth, async (req, res) => { ... })
  ```
* **Repository:** `findUserByUsername` in `server/repositories/user.repo.ts`.
* **Database Access Layer:** `prisma` client (`server/storage.ts`) querying `User` table.
* **Verdict:** `MULTIPLE PATHS`
  - **Active Chain:** `api/index.ts` -> `server/routes/index.ts` -> `server/routes/auth.routes.ts`
  - **Dead Chain:** `api/auth.ts` -> `api/bootstrap.ts` -> `server/routes/auth.routes.ts`
  - **Conflicting Middleware:** Inline limited CORS in catch-all vs `centralizedCors` in bootstrap.

---

### 4. `/api/orders`
* **Vercel Route Match:** `/api/(.*)` (rewritten to `/api/index`)
* **Entry File (Production):** `api/index.ts` *(Authoritative)*
* **Middleware Chain:**
  1. `compression`
  2. `cors` (inline)
  3. `helmet`
  4. Security Headers (HSTS, nosniff, DENY)
  5. `cookieParser`
  6. `apiCacheMiddleware`
  7. `express.json` / `express.urlencoded`
  8. Request tracking (`tenantContext.run`)
  9. `tenantResolver`
  10. Route Flag Injection
  11. `requireCSRF` (CSRF double-submit token validator)
* **Controller:** `server/routes/orders.routes.ts` inlined handlers:
  - POST `/`: `router.post("/", requireAuth, validate(createOrderSchema, 'body'), ...)`
  - GET `/`: `router.get("/", requireAuth, ...)`
* **Repository:**
  - `findProductById` (`server/repositories/product.repo.ts`)
  - `createOrder` (`server/repositories/order.repo.ts`)
  - `findOrders` (`server/repositories/order.repo.ts`)
* **Database Access Layer:** `prisma` client querying `Order`, `Product`, `Vendor`, and `User` tables. Coordinates with the database using the `SovereignOrderEngine` and `reliableEventPublisher` services.
* **Verdict:** `MULTIPLE PATHS`
  - **Active Chain:** `api/index.ts` -> `server/routes/index.ts` -> `server/routes/orders.routes.ts`
  - **Dead Chain:** `api/marketplace.ts` -> `api/bootstrap.ts` -> `server/routes/orders.routes.ts` (mounted under `/api/orders` in `api/marketplace.ts` line 195).
  - **Conflicting Middleware:** Inline limited CORS in catch-all vs `centralizedCors` in bootstrap.

---

### 5. `/api/merchant/store-settings`
* **Vercel Route Match:** `/api/(.*)` (rewritten to `/api/index`)
* **Entry File (Production):** `api/index.ts`
* **Middleware Chain:** *None* (Unregistered route)
* **Controller:** *None*
* **Repository:** *None*
* **Database Access Layer:** *None*
* **Verdict:** `MULTIPLE PATHS` (Unmounted / Dead on both paths)
  - **Attempts to route via Path A:** `api/merchant.ts` imports `products.routes.ts` and mounts it at `/api` but this route is not defined.
  - **Attempts to route via Path B:** `api/index.ts` -> `server/routes/index.ts` imports `products.routes.ts` as `merchantRoutes` and mounts it at `""` but this route is not defined.
  - **Active state:** Both chains return `404 Not Found`. 
  - **Conflicting Middleware:** None.
  - **Note:** In the frontend (`partner-dashboard.tsx` line 135), the settings form save button is bypassed and disabled with a client-side warning toast stating: `"Store settings syncing soon — module coming online"`. The targeted PATCH endpoint `vendor/update` is also unregistered in the backend.

---

### 6. `/api/marketplace/products`
* **Vercel Route Match:** `/api/(.*)` (rewritten to `/api/index`)
* **Entry File (Production):** `api/index.ts` *(Authoritative)*
* **Middleware Chain:**
  1. `compression`
  2. `cors` (inline)
  3. `helmet`
  4. Security Headers (HSTS, nosniff, DENY)
  5. `cookieParser`
  6. `apiCacheMiddleware`
  7. `express.json` / `express.urlencoded`
  8. Request tracking (`tenantContext.run`)
  9. **`tenantResolver`** (First run - global catch-all resolver)
  10. Route Flag Injection
  11. **`tenantResolver`** (Second run - local router-level resolver)
* **Controller:** `server/routes/marketplace/products.routes.ts` inlined handler:
  ```typescript
  router.get("/products", async (req, res) => { ... })
  ```
* **Repository:** `findProductBySlug` (`server/repositories/product.repo.ts`) and `findMerchantProductsByVendor` (`server/repositories/product.repo.ts`).
* **Database Access Layer:** `prisma` client querying `Product` and `Vendor` tables.
* **Verdict:** `MULTIPLE PATHS`
  - **Active Chain:** `api/index.ts` -> `server/routes/index.ts` -> `server/routes/marketplace/products.routes.ts`
  - **Dead Chain:** `api/marketplace.ts` -> `api/bootstrap.ts` -> `server/routes/marketplace/products.routes.ts`
  - **Duplicate Mounts:** `products.routes.ts` is imported twice in `server/routes/index.ts` under different names (`productsRoutes` and `merchantRoutes`). It is mounted at `/marketplace` and `/` (root), exposing the same catalog at `/api/marketplace/products` and `/api/products` respectively.
  - **Conflicting Middleware (Double tenantResolver):** The request pipeline triggers `tenantResolver` twice because it is registered globally in the entrypoint (`api/index.ts`) and again at the router mount point (`app.use("/marketplace", tenantResolver, productsRoutes)`).

---

### 7. `/api/marketplace/stores/:slug`
* **Vercel Route Match:** `/api/(.*)` (rewritten to `/api/index`)
* **Entry File (Production):** `api/index.ts` *(Authoritative)*
* **Middleware Chain:**
  1. `compression`
  2. `cors` (inline)
  3. `helmet`
  4. Security Headers (HSTS, nosniff, DENY)
  5. `cookieParser`
  6. `apiCacheMiddleware`
  7. `express.json` / `express.urlencoded`
  8. Request tracking (`tenantContext.run`)
  9. **`tenantResolver`** (First run - global catch-all resolver)
  10. Route Flag Injection
  11. **`tenantResolver`** (Second run - local router-level resolver)
* **Controller:** `server/routes/marketplace/stores.routes.ts` inlined handler:
  ```typescript
  router.get("/stores/:slug", async (req, res) => { ... })
  ```
* **Repository:** `resolveVendorBySlug` in `server/services/entity-resolution/index.ts`.
* **Database Access Layer:** `prisma` client queried via the entity-resolution service to fetch `Vendor` and nested `Product` tables.
* **Verdict:** `MULTIPLE PATHS`
  - **Active Chain:** `api/index.ts` -> `server/routes/index.ts` -> `server/routes/marketplace/stores.routes.ts`
  - **Dead Chain:** `api/marketplace.ts` -> `api/bootstrap.ts` -> `server/routes/marketplace/stores.routes.ts`
  - **Conflicting Middleware (Double tenantResolver):** Same as products; `tenantResolver` is run twice on the active path (once globally and once at `/marketplace` router mount).
