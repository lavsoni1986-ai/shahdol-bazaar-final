# P0 STABILIZATION REPORT — Reviews Route Prisma Drift Fix

## Overview

**Phase:** Final P0 Stabilization — Runtime Relation-Filter Stabilization Patch  
**Target:** `server/routes/marketplace/reviews.routes.ts`  
**Status:** ✅ COMPLETE

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `server/routes/marketplace/reviews.routes.ts` | 3 surgical fixes applied | ✅ |

---

## Fix 1 — Middleware Context Alignment (GET route)

**Before:**
```ts
const districtId = Number((req as any).districtId);
```

**After:**
```ts
const districtId = Number((req as any).ctx?.districtId);
```

**Why:** Sovereign architecture uses `req.ctx.districtId`, not `req.districtId`. The raw `req.districtId` property is a legacy artifact from pre-sovereign middleware that is no longer set, meaning the route would always receive `NaN` for districtId.

---

## Fix 2 — Middleware Context Alignment (POST route)

**Before:**
```ts
const districtId = Number((req as any).districtId);
```

**After:**
```ts
const districtId = Number((req as any).ctx?.districtId);
```

**Why:** Same drift — both GET and POST had the same legacy access pattern.

---

## Fix 3 — Prisma Relation Filter Correction (GET route)

**Before:**
```ts
where: {
  productId,
  isApproved: true,
  product: {
    districtId
  }
},
```

**After:**
```ts
where: {
  productId,
  isApproved: true,
  product: {
    is: {
      vendor: {
        districtId
      }
    }
  },
},
```

**Why:** The Product model does NOT have a `districtId` field. The chain is `Review → Product → Vendor → districtId`. The original code attempted to filter `product.districtId` which doesn't exist on the Prisma schema. The corrected filter properly navigates through the `product → vendor → districtId` relation chain using `is:` syntax.

---

## Fix 4 — Product Existence Check in POST Route

**Before:**
```ts
const product = await prisma.product.findFirst({
  where: { id: productId, districtId },
  select: { id: true },
});
```

**After:**
```ts
const product = await prisma.product.findFirst({
  where: {
    id: productId,
    vendor: { districtId: districtId }
  },
  select: { id: true },
});
```

**Why:** Same root cause — Product model lacks `districtId`. Navigated through `vendor` relation.

---

## Fix 5 — Dead Field Removal from Review Create

**Before:**
```ts
const review = await prisma.review.create({
  data: {
    productId,
    userId,
    districtId,  // ❌ Does not exist on Review model
    rating,
    comment,
  },
});
```

**After:**
```ts
const review = await prisma.review.create({
  data: {
    productId,
    userId,
    rating,
    comment,
  },
});
```

**Why:** The `districtId` field does not exist on the `Review` Prisma model. This was a dead copy-paste artifact that would cause a Prisma runtime error.

---

## Validation Results

| Check | Result |
|-------|--------|
| TypeScript compilation (`reviews.routes.ts`) | ✅ 0 errors |
| Runtime GET `/api/marketplace/reviews/1` | ✅ `{ success: true, data: [] }` |
| Response shape is canonical | ✅ `success` + `data` fields present |
| District isolation enforced | ✅ `vendor: { districtId }` filter active |
| No Prisma schema changes | ✅ Not touched |
| No transport regressions | ✅ Route still mounted under `/api/marketplace` |
| Server logs show district resolution | ✅ `District: Shahdol` resolved correctly |

## Constitutionally Safe

All fixes are:
- **Minimal:** Only changed the minimum lines needed
- **Constitutional:** Aligned with sovereign `ctx` architecture and correct Prisma relation syntax
- **No redesign:** Zero architectural changes
- **No governance weakening:** District isolation preserved via correct relation filter

## Remaining Non-Critical Drift Observed

`server/services/dssl.service.ts` has the **same class** of Prisma relation drift:
- Line 110: `districtId` filter on Product (should use `vendor: { districtId }`)
- Line 113: Same issue in nested review query
- Line 117: Same issue
- Lines 96, 164: `trustScore` does not exist on Vendor model

These are pre-existing and out of scope for this surgical patch but should be addressed in the next stabilization pass.
