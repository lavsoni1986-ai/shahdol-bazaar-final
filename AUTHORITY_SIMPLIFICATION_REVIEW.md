# AUTHORITY SIMPLIFICATION REVIEW

This document presents an architectural review of the tenant authority chain for BharatOS, specifically analyzing whether the `tenantResolver` middleware can or should be bypassed for authenticated requests.

---

## I. Investigation Findings

### 1. Which routes truly require guest district resolution?
Guest district resolution is required for all **unauthenticated, guest-facing endpoints** that query district-scoped models. These include:
- Public Marketplace: `/api/marketplace/stores`, `/api/marketplace/products`, `/api/marketplace/reviews`
- Unified Search: `/api/search`
- Public Content & Settings: `/api/banners`, `/api/offers`, `/api/categories`
- Analytics: `/api/analytics/track`
- Stats and Local Data: `/api/stats`, `/api/local/*`

For these routes, the user has no authenticated session/JWT, and the application must rely on the client-supplied `x-district-slug` header to determine which district's data to retrieve.

### 2. Which routes always require authentication?
Authentication is strictly required for all administrative, merchant, and transaction-related endpoints:
- Admin Management: `/api/admin/*`
- Merchant Dashboard & Product Management: `/api/merchant/*`
- Order Placement & Browsing: `/api/orders/*`
- Payments processing: `/api/payments/*`
- User Balance & Transactions: `/api/auth/balance`, `/api/auth/transactions`

### 3. Whether `requireAuth` executes before or after `tenantResolver`?
- **Execution Order:** `tenantResolver` executes **BEFORE** `requireAuth`.
- **Reason:** `tenantResolver` is registered as a global application-level middleware on `app.use("/api", tenantResolver)` in `server/index.ts`, `api/index.ts`, and `api/bootstrap.ts`. Route-specific authentication guards (such as `requireAuth`) are registered as router-level/inline middlewares and execute only when the route matches downstream.

### 4. Whether authenticated routes can derive authority exclusively from JWT/database identity?
**Yes.** Authenticated users have a database-verified identity that contains their authoritative `districtId`. This identity is verified during token decoding and validated against the database. Authenticated routes can and **must** derive their tenant authority exclusively from this verified database identity. A client-supplied header (`x-district-slug`) must never dictate the query isolation boundaries of an authenticated request.

### 5. Whether `tenantResolver` can be restricted to public marketplace, search, and guest-facing routes only?
Yes, but doing so carries high regression risks. If `tenantResolver` is removed globally:
- Any public endpoint that queries district-scoped database tables (e.g. `/api/banners`, `/api/offers`, `/api/categories`, `/api/stats`) would need `tenantResolver` explicitly and manually mounted.
- If any public route is missed, it will run without a resolved district context (`districtId: -1`), causing queries to fail or return empty datasets.

---

## II. Option Evaluation

### OPTION A: Keep `tenantResolver` globally and synchronize ALS in `requireAuth` / `optionalAuth`

Keep `tenantResolver` registered globally to handle fallback resolution for all incoming requests, but update `requireAuth` and `optionalAuth` to overwrite and synchronize the `tenantContext` ALS store with the database-verified user district.

- **Security Impact:** **High/Secure.** By synchronizing `tenantContext` with the database-verified district during authentication, any prior value resolved from headers is completely overwritten. Prisma queries will execute strictly under the authenticated user's database-backed district.
- **Complexity:** **Low.** Minimal, surgical modifications are made to `requireAuth` and `optionalAuth` in `server/auth/middleware.ts`.
- **Backward Compatibility:** **Excellent.** No modifications to routing structures, Express middleware order, or frontend request headers.
- **Recommended Choice:** **YES.** This is the safest, most robust, and lowest-risk approach to restoring tenant isolation.

---

### OPTION B: Remove `tenantResolver` from authenticated routes and derive authority only from verified user identity

Remove the global `app.use("/api", tenantResolver)` registration. Mount `tenantResolver` explicitly only on public routers (e.g., `/marketplace`, `/search`, `/analytics`, `/local`). Authenticated routers (e.g., `/admin`, `/merchant`, `/orders`) will rely strictly on `requireAuth` to initialize and set the ALS store.

- **Security Impact:** **High/Secure.** Bypasses `tenantResolver` completely for authenticated routes, eliminating the header parsing surface area.
- **Complexity:** **High.** Requires audit and modification of all routing configurations. Risk of missing public guest routes that query district-scoped models, leading to database query scoping failures.
- **Backward Compatibility:** **Medium.** Breaks any client implementation that expects public, non-marketplace endpoints to resolve district from headers without explicit route-level middleware mounting.
- **Recommended Choice:** **NO.** While architecturally cleaner in terms of middleware separation, it introduces high regression fragility for a production MVP.

---

## III. Architectural Verdict

**OPTION A** is the recommended choice. It maintains maximum backward compatibility and preserves stable global routing while decisively resolving the tenant authority split. By explicitly updating the ALS store in the authentication middlewares, we ensure the verified database identity remains the absolute source of truth for all authenticated requests.
