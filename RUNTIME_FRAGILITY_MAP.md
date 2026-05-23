# RUNTIME FRAGILITY MAP — BHARATOS SHAHDOL PILOT

**Maps every runtime code path by fragility level. Identifies exactly what will break, under what conditions, and with what impact.**

---

## FRAGILITY CLASSIFICATION

| Level | Meaning | Action |
|---|---|---|
| 🟢 STABLE | Tested, deterministic, no known failure modes | Monitor only |
| 🟡 FRAGILE | Works under normal conditions, breaks on edge cases | Fix before pilot if critical path |
| 🟠 UNSAFE | Has known failure modes that can cause data corruption or crash | Fix immediately |
| ⚫ DEAD | Code path that will always fail or is never reached | Delete or fix |
| 🔵 LEGACY | Deprecated but functional — being phased out | Avoid for new development |

---

## LEGEND FOR PATH TRACING

```
[Component] — File:Line
  Condition: When this code path executes
  Failure: What happens when it fails
  Impact: Business effect
  Fix: Surgical remedy (if needed)
```

---

# 🟠 UNSAFE PATHS — WILL FAIL IN PILOT

## U1. Admin Vendor Approve Route (BROKEN)
**Path:** `PATCH /admin/vendors/:id/approve`  
**File:** `server/routes/admin/admin.routes.ts:375-433`

```
Condition: Admin clicks "Approve" on a vendor in admin dashboard
Execution: Line 409 attempts `prisma.adminActionLog.create({ adminId })`
Failure: ReferenceError — `adminId` is not defined (copy-paste artifact from fraud alert endpoint)
Impact: Vendor approval completely broken. Admin gets 500 error with no useful message.
Downstream: Vendor remains PENDING, cannot list products, merchant cannot operate.
```

**Root Cause:** Route appears to have been copy-pasted from `/vendors/:id/resolve-fraud-alert` without variable renaming. Lines 409-419 reference `adminId`, `action`, `reason`, `fraudAlert` — none declared in this route scope.

**Fix:** Remove this route if covered by `/vendors/:id/status`, or rewrite to proper implementation.

## U2. Legacy Order Client-Trusted vendorId
**Path:** `POST /orders` (legacy)  
**File:** `server/routes/orders.routes.ts:140-144`

```
Condition: Any order placement via legacy engine (default)
Execution: `vendorId: item.vendorId` — uses client-provided value directly
Failure: Malicious client submits vendorId=99999 (non-existent) or vendorId=1 (cross-district)
Impact: Phantom orders, cross-district data corruption, vendor reputation manipulation
Downstream: Admin sees orders attributed to wrong vendors, settlement impossible
```

**Root Cause:** No server-side verification that `item.vendorId` corresponds to a real, active vendor in the correct district.

## U3. Sovereign Engine No Legacy Fallback
**Path:** Sovereign order engine failure  
**File:** `server/orders/routes.ts:88-91`

```
Condition: SovereignEngine fails (DB timeout, schema mismatch, any error)
Execution: Catch block returns 500 immediately
Failure: ALL order creation blocked — no fallback to legacy engine
Impact: Complete order system outage during peak times
```

**Root Cause:** Migration flags default to LEGACY (`ORDER_ENGINE_VERSION` defaults to `'legacy'`). If manually switched to SOVEREIGN and engine fails, there's no gradual degradation path.

---

# 🟡 FRAGILE PATHS — WORKS NOW, BREAKS ON EDGE

## F1. DSSL Score Recalculation (Commented Out)
**Path:** Admin endpoint for DSSL recalculation  
**File:** `server/routes/admin/dssl.ts` (commented or not wired)

```
Condition: Admin triggers DSSL recalculation from dashboard
Execution: Endpoint disabled, always returns 404 or isn't mounted
Failure: DSSL scores remain at initial values — no dynamic vendor scoring
Impact: All vendors at score 70 (initial), ranking is flat, sponsored boosts don't recalculate
```

**Note:** Not a crash risk — DSSL scores still work at initial values. But discovery ranking is non-functional beyond initial score.

## F2. Auth Verify Dual Response Shape
**Path:** `/auth/verify`  
**File:** `server/routes/auth.routes.ts:403-421`

```
Condition: Frontend calls GET /auth/verify
Execution: Returns BOTH `response.data.user` AND `response.user`
Failure: Frontend AuthContext.tsx has fallback chain: `res?.data?.user || res?.user || res?.data`
Impact: If data shape shifts, frontend silently falls through fallback chain — may detect wrong user
```

## F3. Shop Model Missing districtId
**Path:** Shop operations  
**File:** `server/storage.ts:434-445` + `prisma/schema.prisma:139-157`

```
Condition: Any route calls storage.getShop() or storage.getShopByOwnerId()
Execution: Calls `requireTenantContextDistrict()` which returns districtId from AsyncLocalStorage
Failure: `prisma.shop.findFirst({ where: { id, districtId } })` — districtId filter applied
  but Shop table has NO districtId column → Prisma throws P2022 (column does not exist)
Impact: All Shop operations FAIL at runtime
```

**Mitigation:** Shop is legacy and largely replaced by Vendor. Ensure no active route calls Shop operations.

## F4. Review Listing — Unbounded Query
**Path:** `GET /admin/reviews/pending`  
**File:** `server/routes/admin/admin.routes.ts:707-740`

```
Condition: Admin views pending reviews with 100+ pending
Execution: `prisma.review.findMany({ take: 100 })` — hardcoded limit but no skip/pagination
Failure: With 200+ reviews, only first 100 visible. Admin unaware of overflow.
Impact: Missing reviews are invisible — moderation bottleneck
```

**Note:** Not a crash risk, but a visibility gap.

## F5. Cart Price Drift
**Path:** Checkout with stale cart  
**File:** `client/src/contexts/CartContext.tsx`

```
Condition: User adds product to cart at ₹100. Admin later changes price to ₹150. User checks out.
Execution: Legacy engine trusts client-stored price (₹100)
Failure: Order placed at old price — revenue loss
Sovereign engine: Uses server-side price — correct
Impact: Price inconsistency between displayed and charged amount
```

**Mitigation:** Sovereign engine handles this correctly. Legacy engine is vulnerable.

## F6. Order Stock Desync
**Path:** Concurrent order placement for same product  
**File:** `server/orders/order.engine.ts`

```
Condition: Two users place orders for same product simultaneously (stock=1)
Execution: SovereignEngine checks `availableStock - reservedStock >= quantity` 
Failure: Within transaction, both checks pass if run simultaneously (no row-level lock verified)
Impact: Overselling possible under concurrent load
```

**Note:** Need to verify if Prisma transaction uses pessimistic locking or SERIALIZABLE isolation.

---

# 🟢 STABLE PATHS — PRODUCTION READY

| Path | File | Confidence |
|---|---|---|
| User login/register/refresh | `auth.routes.ts` | HIGH — rate-limited, DTO validated, token version checked |
| Vendor listing by district | `stores.routes.ts` | HIGH — dual fallback (PSR → direct query), deterministic ranking |
| Store detail by slug | `stores.routes.ts:252-277` | HIGH — district-scoped, properly validated |
| Admin: vendor status update | `admin.routes.ts:257-316` | HIGH — district-locked, audit-logged |
| Admin: vendor ban | `admin.routes.ts:319-372` | HIGH — verified district match before mutation |
| Admin: system health | `admin.routes.ts:34-82` | HIGH — proper error handling, DB latency check |
| Admin: audit logs | `admin.routes.ts:437-459` | HIGH — district-scoped |
| Product listing | Product routes | HIGH — district-scoped |
| Search | `search.unified.routes.ts` | HIGH — unified multi-entity search |
| Upload | `upload.routes.ts` | HIGH — standard pattern |

---

# ⚫ DEAD PATHS — NEVER EXECUTE

| Path | File | Why Dead |
|---|---|---|
| Quarantine user | `admin.routes.ts:531-561` | Logs only — no actual isolation implemented |
| Kill switch | `admin.routes.ts:590-617` | Logs only — doesn't call SystemLockdown |
| Revenue metrics | `admin.routes.ts:664-681` | Returns hardcoded mock data |
| Policies endpoints | `admin.routes.ts:462-479` | Both GET/POST return empty array or stub message |
| DSSL recalculation | `server/routes/admin/dssl.ts` | Endpoint disabled/commented out |

**These paths don't crash — they just don't do what they claim.**

---

# ROUTES: RUNTIME CONTRACT VERIFICATION

| Endpoint | Method | Status | Verified Against | Contract Match? |
|---|---|---|---|---|
| `/auth/login` | POST | 🟢 STABLE | auth.dto.ts | ✅ |
| `/auth/register` | POST | 🟢 STABLE | registerDTO | ✅ |
| `/auth/refresh` | POST | 🟢 STABLE | verifyRefreshToken | ✅ |
| `/auth/verify` | GET | 🟡 FRAGILE | AuthContext.tsx | ⚠️ Dual shape |
| `/auth/logout` | POST | 🟢 STABLE | — | ✅ |
| `/stores` | GET | 🟢 STABLE | storesQueryDTO | ✅ |
| `/stores/:slug` | GET | 🟢 STABLE | — | ✅ |
| `/vendors/id/:id` | GET | 🟢 STABLE | — | ✅ |
| `/orders` | POST | 🟠 UNSAFE | Client-trusted vendorId | ❌ |
| `/orders` | GET | 🟢 STABLE | — | ✅ |
| `/admin/vendors` | GET | 🟢 STABLE | — | ✅ |
| `/admin/vendors/:id/status` | PATCH | 🟢 STABLE | — | ✅ |
| `/admin/vendors/:id/approve` | PATCH | 🟠 UNSAFE | — | ❌ BROKEN |
| `/admin/vendors/:id/ban` | PATCH | 🟢 STABLE | — | ✅ |
| `/admin/system-health` | GET | 🟢 STABLE | — | ✅ |
| `/admin/audit-logs` | GET | 🟢 STABLE | — | ✅ |
| `/admin/users/:id/role` | PUT | 🟡 FRAGILE | — | ⚠️ No audit before mutation |
| `/admin/users/:id/quarantine` | PATCH | ⚫ DEAD | — | No-op |
| `/admin/kill-switch` | POST | ⚫ DEAD | — | No-op |
| `/health` | GET | 🟢 STABLE | — | ✅ |

---

# FRAGILITY HEAT MAP

```
                    
    CRITICAL PATH    │  UNSAFE    FRAGILE   STABLE
    ─────────────────┼──────────────────────────────
    Order Placement  │  U1, U2    F5, F6    Sovereign path
    Vendor Approval  │  U1        —         Status PATCH
    Auth / Session   │  —         F2        Login/Register/Refresh
    Product Listing  │  —         —         All product routes
    Admin Dashboard  │  —         F4        Most endpoints
    Search           │  —         —         All search routes
    Cart             │  —         F5        Client-side only
    Shop Ops         │  —         F3        Legacy/dead
```

---

## SUMMARY

- **3 UNSAFE paths** — all impact order placement and vendor management. Must fix.
- **6 FRAGILE paths** — edge cases that degrade experience but don't crash. Fix before full launch.
- **5 DEAD paths** — ceremonial endpoints that don't do what they claim. Document as tech debt.
- **15+ STABLE paths** — core commerce, auth, admin operations are solid.
