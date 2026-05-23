# ARCHITECTURAL LAYOUT CORRECTION - ROOT CAUSE MAP

## Root Cause Confirmation

The header safe-area architecture has THREE competing sticky/fixed layers:

1. **Layout header** (`layout.tsx:89`): `fixed top-0 z-[100]` — 64px height — ALWAYS present
2. **Product detail sticky headers** (product-detail.tsx:289, marketplace-product.tsx:128): `sticky top-0 z-50` — 64px height — SECOND fixed layer
3. **Scroll-triggered search bar** (`layout.tsx:174`): `fixed top-[64px] z-[90]` — FLOATING between header and content

## Stacking Context Fragmentation

| Layer | z-index | Element | Problem |
|-------|---------|---------|---------|
| Layout header | z-[100] | Fixed top nav | Correct |
| Floating search bar | z-[90] | Scroll-triggered AI search | Clips under header |
| Product page header | z-50 | Per-page sticky back nav | DUPLICATED authority |
| Bottom nav | z-[80] | Mobile bottom tabs | No overlap issues |
| StickyMobileCTA | z-[70] | Mobile bottom bar | Sits under bottom nav |
| AI orb | z-[10000] | Center nav button | Arbitrary escalation |
| Floating WA | z-[9999] | WhatsApp bubble | Arbitrary escalation |

## Critical Failures

1. **Double-header collision**: Product pages render a SECOND sticky header inside main content. When scrolled, this header hits `top: 0` (viewport) while Layout header at `z-[100]` overlays it — creating a 64px blind gap at the top.

2. **Banner/poster disconnect**: `pt-[88px]` on Layout's `<main>` only accounts for Layout header (64px) + padding (24px). Product pages' own sticky headers add 64px MORE that isn't accounted for.

3. **Stacking context anarchy**: No centralized z-index governance. Components use arbitrary values (z-[50], z-[70], z-[80], z-[90], z-[100], z-[9999], z-[10000]).

## Architectural Solution

1. **Centralize header authority** → Layout header is the ONLY fixed/sticky top element
2. **Remove per-page sticky headers** → Product pages lose their `<header>` elements
3. **Route-aware Layout header** → Layout detects product routes and renders back/share/save
4. **Z-index governance** → Design tokens define canonical z-index scale
5. **No z-index hacks** → No arbitrary z-[*] values outside design tokens

## Files Modified

1. `client/src/design/tokens.ts` — Canonical z-index constants added
2. `client/src/components/layout.tsx` — Route-aware header, unified padding, canonical z-index
3. `client/src/pages/product-detail.tsx` — Removed duplicate sticky header
4. `client/src/pages/marketplace-product.tsx` — Removed duplicate sticky header
5. `client/src/shared/product-detail-components.tsx` — Removed header skeleton from ProductDetailSkeleton
