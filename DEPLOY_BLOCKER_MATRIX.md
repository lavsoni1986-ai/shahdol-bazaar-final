# DEPLOY BLOCKER MATRIX — SHAHDOL SOFT PILOT

**Blockers that would cause runtime failure, data corruption, or trust collapse in a live pilot.**

---

## P0 BLOCKERS — MUST FIX BEFORE PILOT

| # | Component | Finding | File:Line | Risk | Fix Complexity |
|---|---|---|---|---|---|
| B1 | Legacy Order Engine | Client-supplied `vendorId` and price trusted without server-side validation | `server/routes/orders.routes.ts:140-144` | Financial fraud — orders can be created with arbitrary vendor IDs and manipulated prices | LOW — Add server-side vendor/product lookup before order creation |
| B2 | Admin Approve Vendor Route | `PATCH /admin/vendors/:id/approve` references undeclared variables `adminId`, `action`, `reason`, `fraudAlert` | `server/routes/admin/admin.routes.ts:409-423` | Route crashes with ReferenceError at runtime — vendor approval completely broken | LOW — Remove dead code / fix variable references |
| B3 | Sovereign→Legacy Order Fallback | Sovereign engine returns 500 on failure with no legacy fallback; LEGACY engine is default | `server/orders/order.engine.ts` + `server/orders/routes.ts` | If Sovereign fails (DB timeout, schema mismatch), ALL orders fail — no graceful degradation | MEDIUM — Add fallback to legacy, or fully route to sovereign with validation |
| B4 | Online Payment Flow | Checkout shows "online payment" as option but backend has no payment gateway integration; response lacks `paymentLink` | `server/orders/routes.ts` + `client/src/pages/checkout.tsx:161-170` | User selects "online payment" → reaches broken state — trust destroyed | LOW — Either disable online payment UI option or add stubbed redirect |
| B5 | Admin Response Contracts | Inconsistent response shapes across admin endpoints — some use `{ success, data }`, others use `{ success, data: { ... } }`, some raw `res.json` | `server/routes/admin/admin.routes.ts:72-83` vs `server/routes/admin.routes.ts:57-78` | Frontend admin pages silently fail to parse responses, show empty/404 states | MEDIUM — Standardize wrapper in ~5 endpoints |

## P1 BLOCKER BORDERLINE — HIGH RISK

| # | Component | Finding | File:Line | Risk | Fix Complexity |
|---|---|---|---|---|---|
| B6 | Stock Reservation Leak | SovereignEngine's `reserveInventory()` never expires reserved stock — abandoned carts tie up inventory forever | `server/orders/order.engine.ts:136-148` | Inventory exhaustion on high-demand products during pilot | MEDIUM — Add TTL-based reservation expiry or reservation cleanup job |
| B7 | Vendor Orphan Risk | `Vendor.districtId` is nullable — auto-provisioned vendors could lack district context | `prisma/schema.prisma:60` | Vendor invisible to district-scoped queries, cannot be managed by district admin | LOW — Make districtId required on Vendor |
| B8 | User Trust Claims Misaligned | Checkout says "100% सुरक्षित भुगतान", order page shows "DSSL Protected Transaction" — neither backed by runtime | `client/src/pages/checkout.tsx` + `client/src/pages/order-success.tsx` | Users lose trust when they see no actual protection or payment capability | LOW — Align UI text with actual capabilities |

## P2 DEFERRABLE — POST-LAUNCH SAFE

| # | Component | Finding | Priority | Notes |
|---|---|---|---|---|
| D1 | Product Pagination | `/admin/products/all` returns up to 1000 products with no cursor | P2 | Fine for 1000 products, add pagination before scaling beyond |
| D2 | Admin Economy Pagination | `/admin/economy` reportedly lacks pagination | P2 | Not verified in detail — check before 100+ vendors |
| D3 | Three Audit Tables | Overlapping schemas complicate query and reconciliation | P2 | Operational inconvenience, not a pilot blocker |
| D4 | DSSL Recalc Unplugged | DSSL score recalculation is commented out — no dynamic re-scoring | P2 | Vendors' DSSL scores remain at initial values during pilot |
| D5 | Soft Delete Absent | Hard deletes on reviews, products, shops — data recovery impossible | P2 | Acceptable for pilot — implement before full launch |
| D6 | FTS Indexes | Product search uses `contains` (sequential scan) — slow at scale | P2 | Fine for <1000 products in pilot |

---

## DEPLOY DECISION TREE

```
Can all P0 blockers be fixed in ≤3 days?
├── YES → Fix P0s, check P1s, proceed with pilot
└── NO → 
    ├── Can P0s be mitigated with config/flag?
    │   ├── YES → Mitigate, tag as tech debt, proceed
    │   └── NO → DELAY PILOT until P0s resolved
```

## CRITICAL PATH

The following need ≤2 engineering-days total:

1. **Fix B2:** Remove or correct `admin/admin.routes.ts:375-430` broken `approve` route (30 min)
2. **Fix B1:** Add server-side vendorId verification in legacy order engine (2 hours)
3. **Fix B4:** Either disable online payment radio or add informative toast (1 hour)
4. **Fix B5:** Standardize admin response format (2 hours)
5. **Fix B3:** Ensure sovereign engine has graceful fallback (4 hours)

## BOTTOM LINE

**5 P0 blockers identified. None are architecturally deep. All fixable in 1-2 engineering days.**
**Pilot is not blocked by architecture — only by surface-level implementation gaps.**
