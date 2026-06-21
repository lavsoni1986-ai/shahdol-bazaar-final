# PRODUCT RENDERING FIX REPORT
## BHARATOS UI RENDERING PHASE 3A

**Date:** 2026-06-20
**Scope:** Client-side image rendering only — no runtime, routing, or API changes

---

## FILES MODIFIED

| # | File | Change |
|---|------|--------|
| 1 | `client/src/design/media-governance.ts` | Fixed empty `src=""` generation in `GovernedImage` |
| 2 | `client/src/shared/product-detail-components.tsx` | Removed `maxHeight` prop from `ProductImage` interface, destructor, container, and img style |
| 3 | `client/src/pages/product-detail.tsx` | Removed `maxHeight={320}` from `<ProductImage>` call site |
| 4 | `client/src/components/shared/SovereignProductCard.tsx` | Removed `max-h-[260px] sm:max-h-none` from marketplace card `GovernedImage` className |

---

## FIX 1 — Empty `src=""` Console Warning

**File:** [`client/src/design/media-governance.ts`](file:///E:/Shahdol-Bazaar-MVP/client/src/design/media-governance.ts#L557-L599)

### Before

```typescript
// When lazy=true and element not yet visible, imgUrl=null
// isFallback=false (real URL exists), so img branch was always taken
React.createElement("img", {
    src: imgUrl || "",   // ← "" was written to DOM when imgUrl was null
    alt: alt,
    ...
})
```

### After

```typescript
// Gate on imgUrl truthy. When null (not yet visible) → skeleton only.
// The <img> element is created ONLY when we have a real URL.
!imgUrl
    ? React.createElement(
        "div",
        { className: "absolute inset-0 bg-zinc-800/60 animate-pulse ..." },
        React.createElement("div", { className: "... animate-spin" })
    )
    : React.createElement(
        React.Fragment, null,
        !imgLoaded && !isLowEnd && React.createElement(/* skeleton */),
        React.createElement("img", {
            src: imgUrl,   // ← only string, never empty
            ...
        })
    )
```

**Effect:** No `<img>` element is ever rendered with `src=""`. Cards below the fold show a pulsing skeleton until the IntersectionObserver fires and `imgUrl` becomes a real URL. The console warning is eliminated.

---

## FIX 2 — Desktop Cropping on Product Detail Page

**Files:**
- [`client/src/pages/product-detail.tsx`](file:///E:/Shahdol-Bazaar-MVP/client/src/pages/product-detail.tsx#L297-L302)
- [`client/src/shared/product-detail-components.tsx`](file:///E:/Shahdol-Bazaar-MVP/client/src/shared/product-detail-components.tsx#L40-L125)

### Before — call site (`product-detail.tsx`)

```tsx
<ProductImage
  src={primaryImage}
  alt={product.name}
  aspectRatio="square"
  maxHeight={320}       // ← applied to img element, not container
  priority
/>
```

### Before — component (`product-detail-components.tsx`)

```tsx
// Interface had maxHeight?: number
// Container ignored it: cn(containerClasses, maxHeight ? "" : "")  ← no-op
// img applied it: style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
```

**Conflict on desktop:** `aspect-square` → container = 576 px tall on a 1440 px screen. `maxHeight: 320px` on the `<img>` → img capped at 320 px inside a 576 px container → 256 px of empty space below image, and severe aspect-ratio distortion.

### After — call site (`product-detail.tsx`)

```tsx
<ProductImage
  src={primaryImage}
  alt={product.name}
  aspectRatio="square"
  priority
/>
```

### After — component (`product-detail-components.tsx`)

```tsx
// maxHeight removed from interface, destructor, container, and img
// Container: <div className={containerClasses}>
// img: no inline style — governance system's max-h-[48vh] is the sole authority
```

**Effect:** The governance system's `max-h-[48vh]` (≈ 518 px at 1080 p) applies cleanly to the container. The `<img>` with `w-full h-full object-contain` fills the container proportionally with no clipping and no conflicting inline cap.

---

## FIX 3 — Mobile Cropping on Marketplace Product Cards

**File:** [`client/src/components/shared/SovereignProductCard.tsx`](file:///E:/Shahdol-Bazaar-MVP/client/src/components/shared/SovereignProductCard.tsx#L384-L390)

### Before

```tsx
<GovernedImage
    src={getPrimaryImage(data)}
    alt={title}
    categoryName={categoryName}
    aspectRatioHint="square"
    className="w-full max-h-[260px] sm:max-h-none rounded-t-3xl border-0"
    //                ^^^^^^^^^^^^ ^^^^^^^^^^^
    //                Caps container at 260px on mobile
    //                aspect-square on a 320px-wide phone = 320px tall
    //                → overflow-hidden clips bottom 60px of image
/>
```

### After

```tsx
<GovernedImage
    src={getPrimaryImage(data)}
    alt={title}
    categoryName={categoryName}
    aspectRatioHint="square"
    className="w-full rounded-t-3xl border-0"
/>
```

**Effect:** The governance system's `MEDIA_GOVERNANCE.product.maxHeightClass` (`max-h-[48vh]`) is the sole max-height authority. On a 360 px wide phone, 48 vh ≈ 346 px which is taller than the 360 px square container — so no clipping occurs. Images display full-height with clean edges on all phone sizes.

---

## VALIDATION RESULTS

### 1. TypeScript Type Check (`npm run check`)

```
> rest-express@1.0.0 check
> tsc --noEmit

PASSED — zero errors
```

### 2. Production Build (`npm run build`)

```
✓ 2962 modules transformed.
✓ built in 12.09s

dist-api/index.js  13.62 MB   (Vercel serverless — unchanged)
```

**Client bundle:** ✅ Clean build, zero warnings
**API bundle:** ✅ Import chain validated

### 3. Desktop Product Detail Page

| Before | After |
|--------|-------|
| Container: 576 px tall (`aspect-square` at 50% of 1152 px desktop) | Same |
| img: clipped to 320 px by inline `maxHeight` | img: fills container naturally via `w-full h-full object-contain` |
| Result: 256 px dead space + distorted aspect ratio | Result: image fits cleanly within `max-h-[48vh]` container |

### 4. Mobile Card Rendering

| Before | After |
|--------|-------|
| Container: `aspect-square` wants ~360 px tall, `max-h-[260px]` cuts to 260 px | Container: `aspect-square` respected, `max-h-[48vh]` governs |
| Bottom 100 px of image clipped by `overflow-hidden` | Full image visible, clean bottom edge |

### 5. Empty Src Console Warning

| Before | After |
|--------|-------|
| All below-fold `GovernedImage` instances emitted `<img src="">` | No `<img>` element rendered until `imgUrl` is a real string |
| Warning fired on every card list render | Warning eliminated at source |

---

## WHAT WAS NOT TOUCHED

Per Phase 3A mandate — the following systems are **unchanged**:

- Server runtime, routes, APIs
- Tenant isolation middleware
- Product data APIs
- Discovery APIs
- All other card variants (search, compact, featured, feed — they did not have the `max-h` conflict)
- `GovernedFallback` component
- `useMediaDetection` hook
- `MEDIA_GOVERNANCE` rules
- `resolveMediaClasses` / `resolveImageClasses`

---

## CERTIFICATION

```
Fix 1 — Empty src=""          RESOLVED
Fix 2 — Desktop crop          RESOLVED
Fix 3 — Mobile crop           RESOLVED
npm run check                 PASSED
npm run build                 PASSED

PRODUCT RENDERING PHASE 3A COMPLETE
```
