# Middleware Ownership Map — BharatOS

This document catalogs every middleware deployed in the request lifecycle, highlighting duplications and conflicting configurations.

---

## 1. System Middleware Inventory

| Middleware Name | File Location | Purpose | Routes Applied To | Global/Local | Duplicate Exists |
|---|---|---|---|---|---|
| **`tenantResolver`** | `server/middleware/tenantResolver.ts` | Resolves multi-tenant district context and binds it to `AsyncLocalStorage`. | `/api/*` (global catch-all) & `/api/marketplace/*`, `/api/analytics/*`, `/api/search/*` (local router mounts). | **BOTH** | **YES** *(Runs twice in same request for local mounts)* |
| **`requireAuth`** | `server/auth/middleware.ts` | Enforces valid JWT token, validates user in database, aligns district scope. | Protected routes (`/orders`, `/merchant/*`, `/admin/*`, `/payments/*`). | **Local** | **NO** |
| **`optionalAuth`** | `server/auth/middleware.ts` | Best-effort JWT parsing. Sets user context if token exists, falls back to guest silently if absent. | `/api/auth/verify` | **Local** | **NO** |
| **`requireCSRF`** | `server/auth/middleware.ts` | Double-Submit Cookie validator to prevent cross-site request forgery. | `/api/orders/*` | **Local** | **NO** |
| **`helmet`** | npm package `helmet` | Injects security headers and Content Security Policy (CSP) rules. | Global level in `api/index.ts` and `api/bootstrap.ts`. | **Global** | **YES** *(Parallel bootstrap setups)* |
| **`cors`** | npm package `cors` | Configures allowed cross-origin requests and credentials policy. | Global level in `api/index.ts` (inline) and `api/bootstrap.ts` (via `server/config/cors.ts`). | **Global** | **YES** *(Conflicting implementations)* |
| **`cookieParser`** | npm package `cookie-parser` | Parses headers into `req.cookies`. | Global level in `api/index.ts` and `api/bootstrap.ts`. | **Global** | **YES** *(Parallel setups)* |
| **`loginLimiter`** | `server/auth/rateLimiter.ts` | Rate limits login attempts to prevent brute force. | `/api/auth/login` | **Local** | **NO** |
| **`registerLimiter`** | `server/auth/rateLimiter.ts` | Rate limits account creations. | `/api/auth/register` | **Local** | **NO** |
| **`apiLimiter`** | `server/auth/rateLimiter.ts` | Protects general API endpoints from rate abuse (local dev node server only). | `/api/*` (except auth routes) | **Global** *(Local only)* | **NO** *(Bypassed on Vercel)* |
| **`compression`** | npm package `compression` | Compresses outgoing response payloads (gzip/brotli). | Global level in `api/index.ts` and `api/bootstrap.ts`. | **Global** | **YES** *(Parallel setups)* |

---

## 2. Key Middleware Conflicts & Vulnerabilities

### A. The CORS Split-Brain Configuration
* **Catch-all (`api/index.ts`):** Implements an inline `cors` configuration with a hardcoded `ALLOWED_ORIGINS` array:
  ```typescript
  const ALLOWED_ORIGINS = [
    "http://localhost:5174",
    "http://localhost:5002",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    /^https?:\/\/.*\.bharatos\.in$/,
  ];
  ```
  This config lacks `https://shahdolbazaar.com` or `https://*.vercel.app` (Vercel deployment previews).
* **Direct Bootstrap (`api/bootstrap.ts`):** Uses `centralizedCors` imported from `server/config/cors.ts`, which correctly resolves whitelisted origins and handles district headers.
* **Impact:** Since `api/index.ts` is the active serverless function in production, any request containing a cross-origin from the production site to catch-all routes will fail CORS validation if `FRONTEND_URL` is misconfigured.

### B. Double `tenantResolver` Execution
* **Mount 1:** Global catch-all resolver in `api/index.ts` line 240:
  ```typescript
  app.use("/api", tenantResolver);
  ```
* **Mount 2:** Router-level wrappers in `server/routes/index.ts` lines 353-357:
  ```typescript
  app.use("/marketplace", tenantResolver, storesRoutes);
  app.use("/marketplace", tenantResolver, productsRoutes);
  ```
* **Impact:** For every request to `/api/marketplace/...`, the `tenantResolver` is executed twice. This results in duplicate database lookups (performing `findDistrictBySlug` twice) for guest/pre-auth sessions, causing unnecessary database strain during high traffic.
