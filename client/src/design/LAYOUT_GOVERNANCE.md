# 🏛️ LAYOUT GOVERNANCE — HEADER SAFE-AREA ARCHITECTURE

## Authority Model

**Layout.tsx** is the SINGLE owner of the fixed header zone.
Page components MUST NOT render their own sticky/fixed headers.

## Header Safe-Area Layers

```
┌──────────────────────────────────────────┐
│  LAYOUT HEADER (fixed top-0 z-[100])    │ ← ROUTE-AWARE
│  ┌────────────────────────────────────┐  │
│  │ Normal routes: hamburger | brand  │  │
│  │               | profile            │  │
│  │ Product routes: back | brand     │  │
│  │               | share/save         │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│  MAIN CONTENT (pt-[88px])               │
│  = Layout header (64px) + padding       │
│  (24px)                                  │
└──────────────────────────────────────────┘
```

## Z-Index Canonical Scale

Use constants from `@/design/tokens` → `zIndex`:
- `zIndex.content` (1) — Page content
- `zIndex.sticky` (50) — Sticky within page flow (filters, tabs)
- `zIndex.nav` (60) — Navigation bars
- `zIndex.overlay` (70) — Mobile CTAs, bottom sheets
- `zIndex.modal` (80) — Modals, dialogs
- `zIndex.toast` (90) — Toasts, search dropdowns
- `zIndex.header` (100) — Layout header (SINGLE AUTHORITY)
- `zIndex.tooltip` (110) — Tooltips
- `zIndex.max` (9999) — Emergency (AI orb, WhatsApp)

**NO arbitrary z-[*] values. NO z-index hacks. NO patch-on-top.**

## Enforcement Rules

1. **No page-level sticky headers** — Layout.tsx handles all fixed top navigation
2. **No page-level `<header>` elements** — Only Layout.tsx renders `<header>`
3. **All z-index values must reference `zIndex` from tokens** — No inline arbitrary values
4. **Blank/gap prevention** — `pt-[88px]` on `<main>` accounts for header (64px) + padding (24px)
5. **Product routes** — Layout detects `/product/` or `/marketplace/product` and renders contextual back/share/save

## Verification Checklist

- [ ] No `sticky top-0 z-50` headers in page components
- [ ] No `fixed top-0` except in Layout.tsx
- [ ] No arbitrary `z-[*]` values outside design/tokens
- [ ] Product pages use Layout's route-aware header
