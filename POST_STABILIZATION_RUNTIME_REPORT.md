# POST-STABILIZATION RUNTIME REPORT

**Generated**: 2026-05-17T14:45 UTC  
**Scope**: Constitutional Phase-1 validation only  
**Mandate**: Detect regressions. DO NOT implement fixes.

---

## 1. SEARCH VALIDATION (`/api/search/unified?q=mobile`)

### Sponsorship derivation (`search.service.ts`)
- **Correct**: Line 106 uses `!!(v.boostedUntil && new Date(v.boostedUntil) > new Date())`
- No Prisma `isSponsored` reads — removed from all `select` blocks
- No `boostWeight`/`boostExpiry` Prisma reads — these never existed in schema

### ⚠️ Class C: `findVendorsByDistrict` 2-arg call (pre-existing drift, not regressive)
- `vendor.repo.ts` signature: `findVendorsByDistrict(districtId: number)` — **single arg**
- `search.service.ts` calls: `findVendorsByDistrict(districtId, { select: {...}, where: {...}, take: 30 })`  
  **Runtime effect**: 2nd arg silently ignored. Query returns ALL approved vendors in district (unbounded unless `.take` from the Prisma default). The dead `select`, `where`, `take` parameters do nothing.
- **Classification**: **C** (deferred drift) — file is `@ts-nocheck` and self-declared `@deprecated`. No regression from Phase-1.

### `failure()` call pattern in search route
- **SEARCH**: Search service does not directly call `failure()` — it returns arrays. The route handlers use `res.json(...)` directly. No concern here.

**Result**: ✅ No regressions. No runtime Prisma crashes.

---

## 2. MARKETPLACE VALIDATION

### Home snapshot (`/home-snapshot`)
- `getTopDiscoveryPicks` → `discovery.service.ts`  
  - `mapVendor` (line 134): `isSponsored: dto.isSponsored || false` — derives from DTO which uses `deriveSponsored(vendor)` ✅  
  - `mapProduct` (line 159): `!!(p.vendor?.boostedUntil && ...)` — direct canonical derivation ✅  
  - `mapHospital` (line 184): `dto.isSponsored || false` — correct DTO derivation ✅  
  - `mapSchool` (line 209): same ✅  
  - `mapWorker` (line 234): same ✅  
  - `mapDoctor` (line 291): `!!(vendor?.boostedUntil && ...)` — direct canonical derivation ✅  
- `adaptDiscoveryHomePayload` reads `x.isSponsored` from DiscoveryEntity — correct

### Stores listing (`/stores`)
- **Direct fallback** (line 191): `!!(v.boostedUntil && new Date(v.boostedUntil) > new Date())` ✅  
- No `isSponsored` in Prisma reads ✅

### Store by slug (`/stores/:slug`)
- Line 265: `store?.type` — Vendor model has **no `type` field**. Optional chaining prevents crash but logs `type: undefined`.  
  **Classification**: **D** (cosmetic) — no runtime or user-facing impact.

### Vendor by ID (`/vendors/id/:id`)
- Calls `mapVendorByType(vendor)` which calls DTO mappers — all use `deriveSponsored(vendor)` ✅

### Product detail
- `mapProductToDTO` (entity.dto.ts line 401): `isSponsored: false` — products are never sponsored. Correct by design. ✅

**Result**: ✅ No regressions. Sponsored derivation correct across all surfaces.

---

## 3. ADMIN GOVERNANCE

### Vendor sponsorship toggle (`vendor.control.ts`)
- **Line 110**: `boostedUntil = isSponsored ? new Date(... + days) : null` — correct mapping ✅  
- **Line 117**: `prisma.vendor.update({ ..., data: { boostedUntil } })` — only canonical field written ✅  
- **Line 130**: `computedIsSponsored = !!(vendor.boostedUntil && ...)` — correct derivation ✅  
- **Line 175**: `isSponsored: computedIsSponsored` — correct DTO exposure ✅  
- **No `isSponsored` Prisma write** anywhere in file ✅

### Admin product listing (`admin.routes.ts` sponsorship mutation)
- Line: `data: { boostedUntil: new Date(...) }` — correct canonical write ✅  
- No `isSponsored: true` anywhere ✅

### ⚠️ Class C: FraudHistory `flags` field (pre-existing drift, not regressive)
- **admin.routes.ts line 109**:  
  `fraudRecords.filter(f => (f.flags as any)?.resolved === true).length`  
  **Reality**: `FraudHistory` model has NO `flags` field. It has `details` (Json?).  
  **Runtime effect**: `f.flags` is `undefined`. Optional chaining returns `undefined`. `undefined === true` is `false`. Result: `resolvedToday: 0` for ALL queries. Not a crash but produces **incorrect governance data**.
- **Classification**: **C** (deferred drift) — pre-existing, not introduced by Phase-1.
- **Fix required**: `f.details` should be used instead of `f.flags`.

### Verified reads
- `prisma.vendor.count({ where: districtFilter as any })` ✅  
- `prisma.user.count(...)` ✅  
- No `isSponsored` in any Prisma query ✅

**Result**: ✅ No regressions. No invalid writes. Correct canonical field persistence.

---

## 4. PAYMENT RUNTIME AUDIT

### Response path analysis (`payments.cashfree.routes.ts`)

| Route | All `failure()` calls | Resolves? |
|-------|----------------------|-----------|
| `createCashfreeOrder` | Line 71: `failure(res, "VALIDATION_ERROR", ..., 400)` ✅ | HTTP 400 returned |
| | Line 77: `failure(res, "USER_NOT_FOUND", ..., 404)` ✅ | HTTP 404 returned |
| | Line 117: `failure(res, "SERVER_ERROR", ..., 500)` ✅ | HTTP 500 returned |
| `verifyCashfreePayment` | Line 128: `unauthorized(res, ...)` ✅ | HTTP 401 returned |
| | Line 148: `failure(res, "PAYMENT_ERROR", ..., 400)` ✅ | HTTP 400 returned |
| | Lines 158,162: `failure(res, "VALIDATION_ERROR", ..., 400)` ✅ | HTTP 400 returned |
| | Lines 172,177: `failure(res, "VALIDATION_ERROR", ..., 400)` ✅ | HTTP 400 returned |
| | Line 221: `failure(res, "SERVER_ERROR", ..., 500)` ✅ | HTTP 500 returned |
| `createBoostOrder` | Line 232: `unauthorized(res, ...)` ✅ | HTTP 401 returned |
| | Lines 241,247,252: `failure(res, "VALIDATION_ERROR", ..., 400)` ✅ | HTTP 400 returned |
| | Line 305: `failure(res, "SERVER_ERROR", ..., 500)` ✅ | HTTP 500 returned |

**All failure paths now return proper HTTP responses. No hanging. No silent promise hangs.**

### Boost activation correctness
- `activateBoost` writes `boostedUntil: boostData.boostExpiry` — only canonical field ✅  
- `isBoostActive(vendor)` reads `vendor.boostedUntil` — canonical field ✅  
- No `isSponsored` in data/select ✅

### ⚠️ Pre-existing governance gap: `req.ctx?.userId!` non-null assertion
- Lines 61, 131, 236: `const userId = req.ctx?.userId!`  
- If `req.ctx` exists but `userId` is `null`/`undefined`, the `!` assertion will **not crash at this line** (the runtime value is still undefined), but subsequent usage will cause `TypeError: Cannot read properties of undefined`.  
- **Risk**: Low — `req.ctx.userId` is populated by auth middleware and `requireAuth` ensures `req.user` exists. The guard `if (!req.user) return unauthorized(...)` runs before this line.  
- **Classification**: Not actionable — pre-existing pattern, safe due to upstream guards.

### No `prisma.payment` model references
- All helpers were rewritten to use `prisma.vendor.update` and `prisma.user.update` — no `prisma.payment` calls ✅  
- The original code had commented-out imports from `payment.repo` — these never existed at runtime. Fixed by inlining. ✅

**Result**: ✅ PASS. No hanging routes. No silent response failures. All `failure()` calls supply `res` first arg.

---

## 5. DTO CONSISTENCY

### Response contract verification
All API response surfaces return:
```json
{ "success": true, "data": {...} }
```
or
```json
{ "success": false, "error": "...", "meta": {...} }
```

### DTO `isSponsored` derivation chain
```
Prisma query → boostedUntil selected
     ↓
vendor.repo returns boostedUntil
     ↓
deriveSponsored(vendor) computes !!vendor.boostedUntil && Date check
     ↓
DTO.isSponsored set to computed boolean
     ↓
DiscoveryEntity.isSponsored / API response exposes compatibility field
```

No DTO reads `isSponsored` from Prisma. All derive from `boostedUntil`. ✅

### Product DTO
- `mapProductToDTO` sets `isSponsored: false` (hardcoded — products are not sponsored) ✅  
- `dsslScore: vendor?.dsslScore || 60` — reads from vendor object passed as arg, NOT from Prisma select. No crash. ✅

**Result**: ✅ Consistent contract. No `isSponsored` in Prisma I/O.

---

## 6. LOG ANALYSIS

### Prisma runtime warnings
None introduced. All `select` blocks use only canonical fields:
- `boostedUntil` — present in all vendor selects ✅  
- No `isSponsored` in any Prisma query ✅  
- No `boostWeight` or `boostExpiry` in any Prisma query ✅

### Unhandled rejections
- Payment routes have `try/catch` wrapping all handlers ✅  
- `activateBoost` calls `updateVendor` which is wrapped in try/catch for Prisma errors ✅  
- Discovery service uses `safeQuery` wrapper for all Prisma calls ✅

### Express hangs
- All 3 payment route handlers have catch blocks returning `failure(res, ...)` ✅  
- No silent `return` missing in any path ✅

### Retry loops
- No infinite retries introduced ✅

### Contract violations
- None from Phase-1 modifications ✅

---

## CLASSIFICATION SUMMARY

| ID | Finding | File | Class | Phase-1 Regression? |
|----|---------|------|-------|---------------------|
| F1 | `FraudHistory.flags` → should be `details` | `admin.routes.ts:109` | **C** (deferred drift) | ❌ Pre-existing |
| F2 | `findVendorsByDistrict` called with dead 2nd arg | `search.service.ts:56-72` | **C** (deferred drift) | ❌ Pre-existing |
| F3 | `vendor.type` log reference (field doesn't exist) | `stores.routes.ts:265` | **D** (cosmetic) | ❌ Pre-existing |
| F4 | `req.ctx?.userId!` non-null assertion pattern | `payments.cashfree.routes.ts:61,131,236` | Risk acknowledged | ❌ Pre-existing |

**Classification legend**:
- **A** = Deploy blocker  
- **B** = Governance risk  
- **C** = Deferred drift (pre-existing, not introduced)  
- **D** = Cosmetic

**Result**: **0 new regressions. 0 deploy blockers. 0 governance risks from Phase-1.**

---

## FINAL VERDICT

**Phase-1 constitutional stabilization is runtime-safe.**

- ✅ All `isSponsored` Prisma SELECTs eliminated
- ✅ All `isSponsored` Prisma writes eliminated
- ✅ All `isSponsored` reads derive from `boostedUntil` via response-time derivation
- ✅ Payment routes have correct `failure(res, ...)` signatures — no hanging calls
- ✅ Admin sponsorship toggle correctly maps boolean ↔ `boostedUntil` date
- ✅ DTO mappers consistently use `deriveSponsored(vendor)` helper
- ✅ Governance filters untouched
- ✅ Prisma schema unmodified
- ✅ No regressions detected

**4 deferred/pre-existing issues (F1-F4) identified — none are Phase-1 regressions.**
