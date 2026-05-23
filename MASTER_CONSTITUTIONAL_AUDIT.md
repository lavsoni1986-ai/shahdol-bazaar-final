# BHARATOS MASTER CONSTITUTIONAL AUDIT

**Audit Timestamp:** 2026-05-17T17:10:00Z
**Scope:** Full sovereign district-commerce runtime
**Target:** Shahdol soft pilot readiness
**Methodology:** Forensic constitutional engineering — no rewrites, no mass refactors

---

## PHASE A — RUNTIME CONSTITUTION

### A1. ROUTE REGISTRATION — STABLE
All critical paths registered via `registerSovereignRoutes()` in `server/routes/index.ts`:
- `/api/products` ✓
- `/api/stores` ✓  
- `/api/stores/:slug` ✓
- `/api/vendors/id/:id` ✓
- `/api/auth/login|register|verify|refresh|logout` ✓
- `/api/admin/*` ✓ (dual mounting: `admin.routes.ts` + `admin/index.ts`)
- `/api/orders` ✓ (legacy + sovereign routing)
- `/api/search` ✓
- `/api/health` ✓
- `/api/docs` (Swagger) ✓

**Risk:** Dual admin route mounts (`server/routes/admin.routes.ts` and `server/routes/admin/admin.routes.ts`) create potential route duplication. Both mount on `/admin` — some endpoints may conflict silently.

### A2. MIDDLEWARE CHAINS — STABLE
Order: CORS → Compression → cookieParser → rateLimit → requestId → tenantResolver → auth → routes

Key chain verified:
```
cookieParser → session → requestId → tenantContext → tenantResolver → auth → routes
```

**Strength:** `tenantResolver` runs BEFORE auth, so district context is established early.
**Strength:** `requireAuth` validates JWT + DB user + district match + token version.

### A3. TRANSPORT NORMALIZATION — FRAGILE
- **Dual response format** detected: `sendError/sendSuccess` (standardized) AND raw `res.json({success: false})` (legacy)
- `sendSuccess` wraps in `{ success: true, data: ... }` 
- But `server/routes/admin.routes.ts` lines 72-83 use `res.json({success: true, user: {...}})` directly
- `stores.routes.ts` uses `success/failure` helpers from `apiResponse`
- Inconsistent error shape creates fragile frontend parsing (checkout.tsx line 54: `response?.data ?? response`)

**P0 finding:** Response contract inconsistency across admin endpoints.

### A4. AUTH/SESSION BEHAVIOR — STABLE WITH EDGE
- JWT with httpOnly cookies: `accessToken` (30min) + `refreshToken` (7d)
- Token version validation implemented in `requireAuth`, `optionalAuth`, `/refresh`, `/verify`
- CSRF double-submit cookie pattern implemented
- Rate limiting on `/login` (5/15min) and `/register` (3/hour)
- `requireAuth` does final DB lookup — good practice
- `optionalAuth` sets `req.user` silently on failure — correct behavior

**Edge:** Line 376 `optionalAuth` checks `req.path?.includes("/auth/verify")` for verbose logging — ok for debugging, leaves intentional debug artifacts in prod logs.

### A5. DISTRICT PROPAGATION — STABLE
- `tenantResolver` sets `req.districtId`, `req.districtSlug`, `req.ctx.districtId`
- `requireAuth` validates JWT districtId matches DB districtId
- Tenant context stored in `AsyncLocalStorage`
- Prisma extension auto-filters by districtId for all scoped models
- Direct district models: User, Vendor, Product, Order, Offer, Category, Shop, Banner, AuditLog, AdminActionLog
- Relational models: FraudHistory (via Vendor), Review (via Product), ProductImage (via Product)

**P1 finding:** `Shop` model has no `districtId` field in Prisma schema (line 139-157), yet `tenantResolver` creates district context and `storage.getShop` calls `requireTenantContextDistrict()`. This will throw runtime errors on shop operations.

### A6. API CONTRACTS — FRAGILE
- `/auth/verify` returns BOTH `data.user` AND `user` at top level (lines 403-421) — ambiguous contract
- `AuthContext.tsx` line 102-106: `res?.data?.user || res?.user || res?.data` — defensive parsing hides ambiguity
- Checkout POST `/orders` expects `{ items, customerName, customerPhone, customerAddress, paymentMethod }`
- Order success page reads `result?.id` (line 192) — fragile if response shape changes

### A7. ERROR HANDLING — FUNCTIONAL
- `errorHandler` middleware handles: AppError, ZodError, Prisma P2002/P2025, JWT errors
- `asyncHandler` wrapper available but NOT used consistently — many routes use raw try/catch
- `sendError` produces standardized `{ success: false, error: { code, message } }`

**P2 finding:** ~40% of routes use raw try/catch instead of `asyncHandler` — not a blocker but increases boilerplate.

### A8. RUNTIME DETERMINISM — SATISFACTORY
- DSSL score recalculations are deterministic
- Product discovery uses deterministic rankings (aiRankScore, dsslScore, rating)
- Cart operations in memory — no server-side cart state
- Legacy order engine trusts client pricing — but Sovereign engine is read-only

---

## PHASE B — GOVERNANCE CONSTITUTION

### B1. ADMIN AUTHORITY BOUNDARIES — STABLE
- `requireSuperAdmin`, `requireCityAdmin`, `requireMerchant` all inspect `normalizeRole(req.user.role)`
- SUPER_ADMIN bypasses all checks in `requireRole`
- CITY_ADMIN district-isolated with cross-tenant validation

### B2. MODERATION FLOWS — ADEQUATE
- Vendor approval: `PATCH /admin/vendors/:id/verify` — transactional, audit-logged, DSSL re-rank
- Vendor status change: `PATCH /admin/vendors/:id/status` — validates status enum, district-locked
- Product approval/rejection: `ProductService.approveProduct` — fraud-scored
- Review management: `GET /reviews/pending`, `DELETE /reviews/:id` — district-locked

### B3. VENDOR APPROVAL — FUNCTIONAL
- New merchants get auto-provisioned vendor on registration (`auth.routes.ts` line 160-186)
- Auto-provision uses `category: "SERVICE"`, `status: "PENDING"` — correct
- Vendor creation wrapped in try/catch — non-blocking, merchant can claim later

### B4. SPONSORSHIP GOVERNANCE — STABLE
- `PATCH /admin/vendors/:id/verify` sets `isVerified: true`
- `POST /admin/vendors/:id/feature` sets `boostedUntil` for 30 days
- Both audit-logged

### B5. AUDIT LOGGING — STRONG FOUNDATION
- Prisma extension auto-audits all write operations (background via `setImmediate`)
- Chain-hash validation for tamper detection
- `adminLog`, `auditLog`, `adminActionLog` — three separate tables (potential consolidation issue)
- Kill switch, system lockdown, user quarantine all audit-logged

**P2 finding:** Three audit tables (`adminLog`, `auditLog`, `adminActionLog`) have overlapping schemas — query fragmentation risk.

### B6. DISTRICT ISOLATION — STRONG
- Prisma extension auto-injects districtId filter
- Manual district checks in admin vendor operations
- Dual-layer enforcement: middleware (route level) + Prisma extension (data level)

### B7. ROLE ENFORCEMENT — ADEQUATE
- `normalizeRole()` centralizes role mapping
- `getRoleLevel()` enables hierarchy (SUPER_ADMIN > CITY_ADMIN > MERCHANT > CUSTOMER)
- Role normalization handles `"SELLER"` → `"MERCHANT"`, `"admin"` → `"SUPER_ADMIN"` etc.

### B8. MUTATION SAFETY — CONCERN
- Legacy `/orders` endpoint (line 140-141 of orders.routes.ts): **trusts client for vendorId and totalPrice**
- `vendorId: item.vendorId` — client-supplied (VULNERABLE)
- `totalPrice` derived from client's product price (line 133) — server recalculates but legacy path still trusts
- Sovereign engine (`order.engine.ts`) calculates ALL pricing server-side — correct

**P0 finding:** Legacy order engine accepts client-supplied `vendorId` and uses client price for total.

---

## PHASE C — COMMERCE CONSTITUTION

### C1. CART FLOW — STABLE IN ISOLATION
- `CartContext` stores in localStorage, keyed by userId+districtSlug
- Cart is UI-only — backend never stores cart state
- `CartItem` includes `productId`, `vendorId`, `price` (UI cache only)
- Migration logic converts old `shopId` → `vendorId`

### C2. ORDER FLOW — FRAGILE (DUAL ENGINE)
- **SovereignEngine** (`order.engine.ts`): Atomic transactions, server-side pricing, stock reservation, audit trail — CORRECT
- **Legacy engine** (`orders.routes.ts`): Single-item orders, client-trusted pricing, per-item DB updates — DEPRECATED
- `MIGRATION_FLAGS.SOVEREIGN_ENGINE_ACTIVE` controls routing (defaults to LEGACY)
- Sovereign engine failure returns **500 with no fallback** (line 88-91)

**P0 finding:** Sovereign engine falls back to 500 instead of legacy on failure. LEGACY is default. No smooth migration path.

### C3. INVENTORY LOGIC — SOVEREIGN ONLY
- SovereignEngine checks `availableStock - reservedStock` before order creation
- Legacy engine does NOT check stock
- Product model has `availableStock`, `reservedStock` fields

### C4. RESERVATION LOGIC — SOVEREIGN ONLY
- SovereignEngine `reserveInventory()` increments `reservedStock` atomically within transaction
- No expiration mechanism for reserved stock — abandoned carts reserve forever
- No release mechanism for reserved stock on order cancellation

**P1 finding:** Reserved stock never expires — abandoned carts leak inventory permanently.

### C5. ORDER VISIBILITY — STABLE
- GET `/orders` returns user's orders filtered by district
- GET `/admin/activity-feed` returns recent orders with vendor names
- Proper district isolation on order queries

### C6. COD READINESS — ADEQUATE
- Checkout supports `cod` and `online` payment methods
- COD flow: clear cart → toast success → redirect to `/order-success`
- Order success page handles COD mode with cash icon
- Online flow: expects `result.paymentLink` — BUT no payment gateway handling implemented

**P1 finding:** Online payment expects `paymentLink` in response, but backend never generates one. Online flow is broken.

### C7. SETTLEMENT ASSUMPTIONS — PENDING
- No settlement engine implemented
- Commission calculated at 5% in SovereignEngine
- No vendor payout system
- COD settlement logic is entirely absent

### C8. TRANSACTION ATOMICITY — GOOD IN SOVEREIGN ENGINE
- `prisma.$transaction` wraps entire order creation
- Failure reverts all DB changes
- Legacy engine does NOT use transactions for multi-item orders

---

## PHASE D — DATA CONSTITUTION

### D1. PRISMA RELATION CORRECTNESS — GENERALLY SOUND
- District → Vendor: `1:N` with `districtId` FK
- District → User: `1:N` with `districtId` FK
- District → SovereignOrder: `1:N`
- Vendor → Product: `1:N` with `vendorId` FK
- Vendor → FraudHistory: `1:N`
- Product → Review: `1:N` via `productId`
- Product → ProductImage: `1:N`

### D2. ORPHAN RISK — MODERATE
- `Vendor.districtId` is optional (`Int?`) — can create vendors without district
- `Shop` model has NO `districtId` — but storage layer forces district context
- Legacy `Shop` table co-exists with `Vendor` — dual entity problem
- `Order` legacy table co-exists with `SovereignOrder` — dual truth source

**P1 finding:** `Vendor.districtId` is nullable — vendors can exist without district association.

### D3. SOFT-DELETE CONSISTENCY — ABSENT
- No `deletedAt` or `isDeleted` fields on any model
- Hard deletes used throughout — data loss risk
- Reviews, products, shops use `DELETE` directly

### D4. DISTRICT LEAKAGE RISK — LOW
- Prisma extension injects district filter automatically
- Storage layer adds manual district checks
- Admin routes manually verify district match before mutations
- Shop model lacks districtId — but Shop is legacy and being phased out

### D5. DTO CONSISTENCY — FRAGILE
- `server/dto/entity.dto.ts` references `mapProductToDTO`, `mapVendorByType`
- `auth.dto.ts` uses Zod schemas for validation
- `marketplace.dto.ts` for query params
- Product routes use `failure(res, "NOT_FOUND", "msg", 404)` — 3 args when `failure` expects 2-4
- Checkout uses `apiRequest("POST", "/orders", ...)` — raw fetch, no DTO validation on client

**P2 finding:** `failure()` function call inconsistency — some calls pass 4 args, others 2. Type mismatch.

### D6. LEGACY FIELD DRIFT — SIGNIFICANT
- `Shop` model (14 fields) — legacy, being replaced by `Vendor`
- `Vendor` model (40+ fields) — includes legacy fields: `legacyHospitalId`, `legacyShopId`, `legacySchoolId`, `legacyServiceWorkerId`
- `Order` model + `SovereignOrder` model — dual system
- `Product` `categoryName` and `categoryId` co-exist — dual reference

### D7. DUPLICATE TRUTH SOURCES
1. `Shop` vs `Vendor` — both describe merchants
2. `Order` vs `SovereignOrder` — dual order models
3. `categoryName` vs `categoryId` on Product — dual category reference
4. `adminLog` / `auditLog` / `adminActionLog` — three audit tables
5. `User.role` string vs shared/roles.ts enum — runtime vs contract

---

## PHASE E — UX & TRUST CONSTITUTION

### E1. VISIBLE BROKEN STATES — MODERATE
- `/order-success` tries to fetch order details but `setOrderDetails({ id: orderId })` just sets the ID — no real data
- `/admin/fraud-alerts` requires `districtId` in context but response path casts `vendor.districtId` non-nullably
- Online payment radio button visible but backend has no payment gateway integration

### E2. EMPTY STATES — GENERALLY HANDLED
- Cart page redirects to home if empty
- Stores listing falls back to direct vendor query if PSR discovery fails
- Auth context returns `user: null` gracefully for guests

### E3. DEAD BUTTONS
- "Track Your Order" on `/order-success` links to `/my-orders` — path may not exist
- Online payment radio in checkout leads to broken flow
- Some admin endpoints return stubbed data (policies, revenue metrics)

### E4. LOADING FAILURES
- Checkout shows `Loader2` spinner during product fetch — good
- Order creation shows loading state — good
- Admin pages have no loading state verification (not audited in detail)

### E5. INVALID RESPONSES
- `/admin/vendors/:id/approve` (line 375) has a BROKEN route — references undeclared variables `adminId`, `action`, `reason`, `fraudAlert` (lines 409-419). This route will throw ReferenceError at runtime.

**P0 finding:** `PATCH /admin/vendors/:id/approve` is broken — references undeclared variables.

### E6. MOBILE EXPERIENCE — NOT AUDITED
Frontend audit scope limited — confidence assessment deferred.

### E7. USER TRUST BREAKERS
- Checkout says "100% सुरक्षित भुगतान" but online payment doesn't work
- Order success page shows "DSSL Protected Transaction" but no actual DSSL protection metadata
- `/balance` endpoint returns hardcoded zeros — user sees ₹0 balance

**P1 finding:** User-facing trust claims (secure payment, DSSL protection) are not backed by runtime implementation.

---

## PHASE F — SCALABILITY CONSTITUTION

### F1. 5 DISTRICTS — SURVIVABLE
- District isolation via Prisma extension — scales linearly
- No cross-district queries — maintainable
- TenantResolver adds constant overhead per request

### F2. 100 VENDORS — SURVIVABLE
- Current vendor queries use `findMany` with no pagination in some endpoints
- `/admin/vendors` returns ALL vendors — no limit, no pagination
- DSSL recalculation currently doesn't actually run (commented out)

**P2 finding:** `/admin/economy` and `/admin/vendors` endpoints lack pagination for vendor listing.

### F3. CONCURRENT ADMIN ACTIVITY — SURVIVABLE
- Rate limiting on admin actions: 50/hour per user, 20/minute per IP
- Kill switch and lockdown available for emergency scenarios
- No pessimistic locking on vendor operations — race conditions possible

### F4. INCREASING PRODUCT VOLUME — SURVIVABLE
- Product queries filter by vendor district + approval status
- Product indexing on `slug` and `districtId`
- No full-text search index — relies on `contains` (slow at scale)
- No pagination on `/admin/products/all` — returns up to 1000 products

**P1 finding:** Product listing at scale lacks proper pagination and full-text search indexing.

---

## CRITICAL FINDINGS SUMMARY

### P0 — LAUNCH BLOCKERS
1. **Legacy order engine trusts client for vendorId/totalPrice** (`orders.routes.ts:140-144`)
2. **Sovereign engine has no legacy fallback** — returns 500 on failure (`orders.routes.ts:88-91`)
3. **`PATCH /admin/vendors/:id/approve` references undeclared variables** — broken route (`admin/admin.routes.ts:375`)
4. **Response contract inconsistency across admin endpoints** — frontend uses defensive parsing
5. **Online payment flow is broken** — no payment gateway integration on backend

### P1 — SERIOUS BUT SURVIVABLE
1. Reserved stock never expires — inventory leak
2. `Vendor.districtId` nullable — orphan vendor risk
3. User trust claims not backed by runtime (secure payment messaging)
4. Product listing at scale lacks pagination and FTS indexing
5. `Shop` model has no `districtId` field — legacy route may crash
6. `/admin/products/all` returns up to 1000 products without cursor pagination

### P2 — POST-LAUNCH IMPROVEMENTS
1. Three audit tables with overlapping schemas
2. ~40% of routes use raw try/catch instead of asyncHandler
3. `failure()` function call inconsistency
4. Admin economy endpoints lack pagination
5. Soft-delete absent across all models
6. Dual admin route mounting creates potential conflicts

### P3 — COSMETIC/DEFERRED
1. Legacy `Shop` model co-existence
2. Debug logging artifacts in production paths
3. Commented-out DSSL recalculation endpoint
4. Hardcoded chart data in activity feed
5. Mock revenue metrics endpoint

---

## FINAL VERDICT

**Shahdol Soft Pilot: CONDITIONALLY SAFE**

The system's core constitutional architecture is sound:
- District isolation ✓
- Auth chain ✓
- Audit logging ✓
- Role enforcement ✓
- Sovereign order engine ✓

**Must fix before pilot:**
1. Block client-trusted vendorId in legacy order path (P0)
2. Fix broken `/admin/vendors/:id/approve` route (P0)
3. Add sovereign→legacy fallback or route completely to sovereign (P0)
4. Fix online payment messaging — either implement or remove (P0)
5. Standardize admin response contracts (P0)

**Safe to defer:**
- Soft-delete implementation
- Audit table consolidation
- Full-text search indexes
- Admin endpoint pagination
- Mock data cleanup
