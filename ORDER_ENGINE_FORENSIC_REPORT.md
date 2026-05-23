# ORDER ENGINE FORENSIC REPORT

**Date:** 2026-05-17
**Scope:** Full forensic audit of all order execution paths in BharatOS / Shahdol Bazaar MVP
**Mission:** Identify competing order engines, duplicated flows, runtime divergence, and canonical execution truth

---

## PHASE 1 — DISCOVERY COMPLETE

### All Order-Related Code Paths Identified

| # | Component | File | Type | Lines |
|---|-----------|------|------|-------|
| 1 | Legacy Order Route | `server/routes/orders.routes.ts` | Route Handler | 249 |
| 2 | Sovereign Order Engine | `server/services/order.engine.ts` | Service | 299 |
| 3 | Legacy Order Repo | `server/repositories/order.repo.ts` | Repository | 37 |
| 4 | Reservation Cleanup Worker | `server/services/reservation-cleanup-worker.ts` | Daemon | 319 |
| 5 | Migration Config | `server/config/migration.ts` | Config | 57 |
| 6 | Observability Dashboard | `server/services/observability-dashboard.ts` | Service | Partial |
| 7 | Migration Observability | `server/services/migration-observability.ts` | Service | Partial |
| 8 | Event Bus | `server/events/index.ts` | Events | Partial |
| 9 | Storage (prisma singleton) | `server/storage.ts` | Storage | Partial |
| 10 | Checkout Frontend | `client/src/pages/checkout.tsx` | UI | 358 |
| 11 | MyOrders Frontend | `client/src/pages/MyOrders.tsx` | UI | ~400 |
| 12 | Customer Dashboard | `client/src/pages/customer-dashboard.tsx` | UI | Partial |

### Prisma Data Models

| Model | Table | Fields | Status |
|-------|-------|--------|--------|
| `Order` | `orders` | Single productId, Float totalPrice, no commission | **LEGACY** |
| `SovereignOrder` | `sovereign_orders` | Multi-item basket, paisa-based pricing, idempotencyKey | **CANONICAL** |
| `SovereignOrderItem` | `sovereign_order_items` | Line items with paisa pricing | **CANONICAL** |
| `AuditLog` | `audit_log` | Immutable financial trail | **CANONICAL** |

---

## PHASE 2 — ENGINE CLASSIFICATION

### Truth Table

| Flow | Entry Route | Engine | Canonical? | Active (default)? | Risk Level |
|------|-------------|--------|------------|-------------------|------------|
| **Create Order** | `POST /orders` | **SovereignOrderEngine** | ✅ YES | ❌ NO (flag `SOVEREIGN_ENGINE_ACTIVE` = false) | LOW |
| **Create Order** | `POST /orders` | **Legacy path** (lines 94-197, `orders.routes.ts`) | ❌ NO | ✅ YES (default for `ORDER_ENGINE_VERSION` = `LEGACY`) | **🔴 CRITICAL** |
| **Get User Orders** | `GET /orders` | `prisma.order.findMany` (legacy) | ❌ NO | ✅ YES | MEDIUM |
| **Reservation Cleanup** | Daemon worker | `ReservationCleanupWorker` | ✅ YES | ✅ YES (runs on start) | LOW (no timestamp tracking) |
| **Audit Trail (sovereign)** | `order.engine.ts` | `tx.auditLog.create` | ✅ YES | Branch-only | LOW |
| **Audit Trail (legacy)** | `orders.routes.ts` | **NOTHING** | ❌ NO | Always | **🔴 CRITICAL** |
| **Stock Mgmt (sovereign)** | `order.engine.ts` | `reservedStock` increment in tx | ✅ YES | Branch-only | LOW |
| **Stock Mgmt (legacy)** | `orders.routes.ts` | **NOTHING** | ❌ NO | Always | **🔴 CRITICAL** |
| **Intelligence Update** | Legacy path | vendor.totalOrders, product.orderCount, etc. | N/A | Always | MEDIUM |
| **Intelligence Update** | Sovereign path | **NOTHING** | N/A | Branch-only | MEDIUM |
| **Payment Verify** | `POST /payments/verify` | Cashfree routes | STANDALONE | ✅ YES | LOW (separate concern) |
| **Vendor Orders View** | Admin routes | Direct `prisma.order` queries | AD-HOC | ✅ YES | LOW |

### Classification Summary

| Classification | Count | Components |
|---------------|-------|------------|
| **CANONICAL** | ✅ 3 | SovereignOrderEngine, ReservationCleanupWorker, AuditLog model |
| **LEGACY** | ❌ 3 | Legacy order route path, legacy `Order` model, legacy `order.repo.ts` |
| **SHADOW FLOW** | ⚠️ 1 | Intelligence updates performed in legacy but NOT in sovereign |
| **DEAD FLOW** | 💀 0 | N/A |
| **PARTIAL FLOW** | 🔶 2 | Order status transitions (neither engine), payment flow (not connecting back) |

---

## PHASE 3 — DIVERGENCE ANALYSIS

### 🔴 CRITICAL: Legacy Engine Is the Active Default

**File:** `server/config/migration.ts` (line 17-19)
```typescript
export const ORDER_ENGINE_VERSION: OrderEngineVersion =
  (process.env.ORDER_ENGINE_VERSION as OrderEngineVersion) ||
  OrderEngineVersion.LEGACY; // Default to legacy for safety
```

**Impact:** 100% of production order traffic goes through the Legacy engine.

### 🔴 CRITICAL: Trust-Client Vulnerability in Legacy Path

**File:** `server/routes/orders.routes.ts` (lines 128, 140)
```typescript
// LEGACY VENDOR VALIDATION (BROKEN - trusts client)
if (product.vendorId !== item.vendorId || ...) { ... }
const order = await createOrder({
  ...
  vendorId: item.vendorId, // TRUSTS CLIENT (VULNERABLE)
  ...
});
```

While there IS a check `product.vendorId !== item.vendorId`, this still means the client **must** provide `vendorId` in the payload. If the check fails, the response is an error. But if the product is re-assigned to a different vendor in the DB between validation and creation, there's a TOCTOU race.

**Contrast with SovereignEngine** (line 202-203):
```typescript
vendorId: product.vendorId, // FROM DB, NOT BROWSER ✅
```

### 🔴 CRITICAL: No Audit Trail in Legacy Engine

The Legacy path creates `prisma.order.create()` calls but never creates any `auditLog` entry. The Sovereign engine creates a comprehensive audit trail via `createOrderAudit()`.

### 🔴 CRITICAL: No Stock Management in Legacy Engine

The Legacy path never touches `reservedStock`, `availableStock`, or `soldStock`. Products are ordered with zero inventory tracking.

### 🔶 MEDIUM: Split Intelligence Updates

Legacy path updates multiple intelligence fields per vendor/product:
- `vendor.totalOrders`
- `vendor.aiRankScore`
- `product.orderCount`
- `product.aiRankScore`
- `product.conversionScore`
- `vendor.repeatCustomers`

Sovereign path does NONE of these.

### 🔶 MEDIUM: Orphaned `SovereignOrder` Reads

No user-facing API reads from `SovereignOrder`. The `GET /orders` endpoint only queries legacy `prisma.order`. Once migration completes, users will see no order history.

### 🔶 MEDIUM: Reservation Worker Runs Blind

**File:** `server/services/reservation-cleanup-worker.ts` (line 110-111)
```typescript
// Note: In a real implementation, we'd need a timestamp field for reservation time
// For now, we'll use a simplified approach
```

The cleanup worker finds products with `reservedStock > 0` but has no way to know WHICH reservations are expired since there's no reservation timestamp.

### ✅ LOW: SovereignEngine Handles Well

- Transaction boundary ✅
- Idempotency ✅
- Server-side pricing ✅
- District isolation ✅
- Vendor approval/banned check ✅
- Stock reservation ✅
- Audit log creation ✅

---

## PHASE 4 — RECOMMENDATIONS

### 1. Canonical Engine

**Recommendation:** SovereignOrderEngine (`server/services/order.engine.ts`)

Reasons:
- Only engine with proper transaction safety
- Only engine with idempotency
- Only engine with financial authority (server-calculated prices)
- Only engine with audit trail
- Only engine with inventory reservation

### 2. Flows Safe to Deprecate

| Flow | Deprecation Strategy |
|------|---------------------|
| Legacy `POST /orders` path (lines 94-197) | Remove entirely after SovereignEngine migration confirmed |
| Legacy `order.repo.ts` `createOrder()` | Remove after legacy write path deleted |
| Legacy `Order` model table writes | Remove after migration |
| Reservation manual cleanup endpoints | Keep for admin tooling |

### 3. Flows Requiring Redirect/Adaptation

| Flow | Action Required |
|------|----------------|
| **Intelligence updates** | Add to SovereignEngine: `createOrderIntelligence()` post-transaction |
| **User order reads (`GET /orders`)** | Add `SovereignOrder` + `SovereignOrderItem` union query to show both order types |
| **Admin order queries** | Add `SovereignOrder` awareness to admin dashboard |
| **Frontend `MyOrders.tsx`** | Must surface both order types with unified display |
| **`customer-dashboard.tsx`** | Same — unify legacy + sovereign order display |

### 4. Runtime Blockers

| Blocker | Severity | Description |
|---------|----------|-------------|
| `SOVEREIGN_ENGINE_ACTIVE` defaults false | CRITICAL | All traffic uses legacy path |
| No `SovereignOrder` read API | HIGH | Users can't see sovereign orders |
| `vendorId` trusted from client in legacy | HIGH | Financial integrity risk |
| No stock management in legacy | HIGH | Inventory drift |
| No audit trail in legacy | HIGH | No financial forensics |
| Reservation worker has no timestamps | MEDIUM | Blind cleanup, may leak inventory |
| No status transition logic in either engine | MEDIUM | Orders stuck at "pending" |

### 5. Deployment Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flipping `SOVEREIGN_ENGINE_ACTIVE` suddenly | Users see empty order history | Deploy read API first |
| Missing intelligence updates in Sovereign | AI rank degrades over time | Add post-transaction intelligence before switch |
| `SovereignOrder` table has no `paymentStatus` field | Can't track payment flow | Add field or create mapping |
| No rollback path for `availableStock/reservedStock` | If migration fails, inventory inconsistent | Keep reservation cleanup worker active |

### 6. Exact Minimal Consolidation Path

```
STEP 1 — Prepare SovereignEngine for production
  [ ] Add paymentStatus field to SovereignOrder (or map from payment flow)
  [ ] Add post-transaction intelligence updates in order.engine.ts
  [ ] Create GET /orders/sovereign endpoint to read sovereign orders
  [ ] Unify GET /orders to return both legacy + sovereign orders

STEP 2 — Activate SovereignEngine
  [ ] Set SOVEREIGN_ENGINE_ACTIVE = true via env
  [ ] Monitor order success rate for 48 hours
  [ ] Run reservation cleanup worker to clear stuck reservations

STEP 3 — Backfill & Deprecate Legacy
  [ ] Backfill missing intelligence data from legacy orders
  [ ] Mark legacy POST /orders path as READ-ONLY
  [ ] Remove legacy create path after verification
  [ ] Archive legacy Order model (keep for historical reads)

STEP 4 — Complete Order Lifecycle
  [ ] Implement status transition FSM (pending → confirmed → shipped → delivered)
  [ ] Wire payment verification callback to SovereignOrder status
  [ ] Add order cancellation flow with inventory release
  [ ] Add `availableStock` decrement on order confirmation
```

---

## EMERGENCY ITEMS

### Immediate corruption risk? NO

The legacy path is functional and has been processing orders. The `vendorId` trust issue is partially mitigated by the `product.vendorId !== item.vendorId` check. The lack of stock management and audit trail is operational risk, not immediate corruption.

### Flag for immediate surgery?

The feature flag should be kept at `LEGACY` until the read API for `SovereignOrder` is deployed. Flipping it pre-maturely would cause zero visible order history for users.

### Recommendation:

**Activate SovereignOrderEngine as CANONICAL in next deploy cycle, after:**
1. Adding the intelligence backfill to sovereign path
2. Deploying unified `GET /orders` that includes sovereign orders
3. Adding `paymentStatus` to SovereignOrder

This is a 1-2 day engineering effort.
