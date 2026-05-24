# 🏛️ BHARAT-OS: GOVERNANCE CONSTITUTION REPORT
## Sovereign Experience Resolver — Frontend Consolidation Audit
### Date: 2026-05-24 | Authority: Chief Architect

---

## 1. GOVERNANCE ARCHITECTURE VERIFIED

| Layer | File | Status |
|-------|------|--------|
| Entity Classification | `entity-intelligence.ts` | ✅ Complete |
| Entity Policies | `entity-policies.ts` | ✅ Complete |
| CTA Resolver | `entity-cta-resolver.ts` | ✅ Complete |
| Route Resolver | `entity-route-resolver.ts` | ✅ Complete |
| **Experience Resolver** | `entity-experience-resolver.ts` | ✅ Complete |
| Barrel Export | `governance/index.ts` | ✅ Complete |

The **canonical governance layer is complete and ready for consumption.**

**Available exports via `@/governance`:**
- `resolveEntityExperience({ entityKind, category, tags, vendorType })` → `ResolvedExperience`
- `resolveEntityCTAs({ kind, category, tags })` → `ResolvedCTAs`
- `hasCommerceDisplay(kind)` → `boolean`
- `hasBookingFlow(kind)` → `boolean`
- `getInteractionMode(kind)` → `InteractionMode`
- `isEntityCommerce(entityKind, category)` → `boolean`
- `CTA_METADATA` — canonical action labels
- `trackEvent` from `@/lib/analytics`

---

## 2. COMPONENT ADOPTION GAP MATRIX

| Component | File | `resolveEntityExperience` | `resolveEntityCTAs` | `trackEvent` | Commerce Leakage | GOV STATUS |
|-----------|------|--------------------------|---------------------|--------------|------------------|-----------|
| **SovereignProductCard** | `shared/SovereignProductCard.tsx` | ❌ | ✅ | ❌ | ✅ None | 🔶 PARTIAL |
| **SovereignStoreCard** | `shared/SovereignStoreCard.tsx` | ❌ | ❌ | ❌ | ✅ None | 🔴 GAP |
| **SovereignEntityCard** | `shared/SovereignEntityCard.tsx` | ❌ | ✅ | ❌ | ✅ None | 🔶 PARTIAL |
| **SovereignTrustBadge** | `shared/SovereignTrustBadge.tsx` | N/A | N/A | N/A | ✅ None | ✅ CLEAN |
| **DistrictIntelligencePrimitives** | `shared/DistrictIntelligencePrimitives.tsx` | N/A | N/A | N/A | ✅ None | ✅ CLEAN |
| **ProductImage** | `product-detail-components.tsx` | ❌ | ❌ | ❌ | ⚠️ None | ✅ CLEAN |
| **PricingStack** | `product-detail-components.tsx` | ❌ | ❌ | ❌ | ✅ None | ✅ CLEAN |
| **TrustBadgeRow** | `product-detail-components.tsx` | ❌ | ✅ (hasCommerceDisplay) | ❌ | ✅ None | 🔶 PARTIAL |
| **PrimaryCTAGroup** | `product-detail-components.tsx` | ❌ | ✅ | ❌ | ✅ None | 🔶 PARTIAL |
| **StickyMobileCTA** | `product-detail-components.tsx` | ❌ | ✅ | ❌ | ⚠️ Always "Add to Cart" | 🔴 GAP |
| **DetailSection** | `product-detail-components.tsx` | N/A | N/A | N/A | ✅ None | ✅ CLEAN |
| **RelatedProducts** | `product-detail-components.tsx` | ❌ | ❌ | ❌ | ✅ None | ✅ CLEAN |
| **SellerInfoCard** | `product-detail-components.tsx` | ❌ | ❌ | ❌ | ✅ None | ✅ CLEAN |
| **ProductDetail** (page) | `pages/product-detail.tsx` | ❌ | ❌ | ❌ | ⚠️ Legacy commerce | 🔴 GAP |
| **MarketplacePage** | `pages/marketplace.tsx` | ❌ | ❌ | ❌ | ✅ None | 🔴 GAP |
| **ShopDetail** (page) | `pages/shop-detail.tsx` | ❌ | ❌ | ❌ | 🔴 Massive hardcoded branching | 🔴 LEGACY |
| **SuperAIHome** | `pages/SuperAIHome.tsx` | ❌ | ❌ | ❌ | ✅ None | 🔴 GAP |
| **Hero** | `components/home/Hero.tsx` | ❌ | ❌ | ❌ | ✅ None | ✅ CLEAN |
| **SearchBar** | `components/search-bar.tsx` | ❌ | ❌ | ❌ (stub) | ✅ None | 🔴 GAP |
| **Layout** | `components/layout.tsx` | ❌ | ❌ | ❌ | ✅ None | 🔴 GAP |
| **Analytics Client** | `lib/analytics.ts` | ❌ | ❌ | ✅ Self | ✅ None | ✅ CLEAN |

---

## 3. CRITICAL VIOLATIONS

### P0: STICKY MOBILE CTA — Hardcoded "Add to Cart"
**File:** `product-detail-components.tsx:571`
```typescript
const ctaLabel = CTA_METADATA.add_to_cart.label; // ALWAYS "Add to Cart"
```
**Problem:** For non-product entities being viewed via product-detail route, this always shows commerce CTA. Should use `resolveEntityCTAs()`.

### P0: shop-detail.tsx — Legacy Monolith
**File:** `shop-detail.tsx`
**Problem:** Uses legacy `getCTAConfig`, `getWhatsAppContext`, `supportsBookings`, `getCategoryColor` from `cta-helpers`. 679 lines of monolithic branching. No governance adoption.
**Verdict:** Cannot refactor partially. Needs full migration to `SovereignEntityDetail`.

### P1: SovereignStoreCard — Zero Governance
**File:** `shared/SovereignStoreCard.tsx`
**Problem:** No `resolveEntityCTAs()`, no `resolveEntityExperience()`, no analytics. Hardcoded "Direct" and "Call" buttons.

### P1: SovereignProductCard — Experience Resolver Not Used
**File:** `shared/SovereignProductCard.tsx`
**Problem:** Uses `resolveEntityCTAs` but not `resolveEntityExperience`. Missing CTA icons, analytics tracking via `trackEvent`.

### P1: search-bar.tsx — Analytics Stub
**File:** `search-bar.tsx:20`
```typescript
const trackAISignal = (..._args: any[]) => { }; // EMPTY STUB
```
**Problem:** Should use `trackEvent` from `@/lib/analytics`. No analytics data flowing from search interactions.

### P2: marketplace.tsx — No Governance
**File:** `pages/marketplace.tsx`
**Problem:** No governance integration. Uses `any` types. Generic query approach.

### P2: SuperAIHome — No CTA Governance on Homepage
**File:** `pages/SuperAIHome.tsx`
**Problem:** Uses `SovereignEntityCard` correctly, but doesn't use `resolveEntityExperience` for homepage-specific layout decisions.

---

## 4. STRATEGIC RECOMMENDATIONS

### IMMEDIATE (P0) — 30 min
1. Fix `StickyMobileCTA` to use `resolveEntityCTAs({ kind })` instead of hardcoded `add_to_cart`
2. Wire `trackEvent` from analytics into `SovereignProductCard` click handler
3. Delete the `trackAISignal` stub in `search-bar.tsx`, wire to `trackEvent`

### HIGH (P1) — 2 hours
4. Integrate `resolveEntityExperience` into `SovereignStoreCard` for CTA resolution
5. Integrate `resolveEntityExperience` into `SovereignEntityCard` for CTA resolution
6. Add `resolveEntityExperience` to `SovereignProductCard` for icon/media/layout binding
7. Wire `trackEvent` into `SovereignStoreCard` and `SovereignEntityCard`

### MEDIUM (P2) — 4+ hours
8. Create `SovereignEntityDetail` — consolidated detail page replacing legacy `shop-detail.tsx`
9. Add `resolveEntityExperience` to `product-detail.tsx` (post detail-page consolidation)
10. Add governance to `marketplace.tsx` (route-level interaction mode)
11. Add governance to `SuperAIHome.tsx` (experience-aware sections)

### LOW (P3) — Future
12. Fully deprecate `shop-detail.tsx`
13. Remove `cta-helpers.ts` entirely (replace all consumers with governance)
14. Add TypeScript strict mode enforcement across all component imports from governance

---

## 5. CURRENT STATE

### What IS working
```
✅ resolveEntityCTAs — used in 3 components (ProductCard, EntityCard, product-detail-components)
✅ hasCommerceDisplay — used in 2 components
✅ CTA_METADATA — used for label resolution (not hardcoded text)
✅ Barrel export — single import point from @/governance
✅ Analytics client — canonical trackEvent with typed payloads
✅ Route governance — resolveEntityRoute, route-governance.ts
✅ Media governance — media-governance.ts
✅ District primitives — DistrictIntelligencePrimitives
✅ Trust badge — SovereignTrustBadge
```

### What needs consolidation
```
❌ resolveEntityExperience — used in 0 components
❌ trackEvent from analytics — used in 0 components
❌ EntityKind type enforcement — any type leak in marketplace
❌ StickyMobileCTA — always commerce
❌ shop-detail.tsx — full legacy
❌ search-bar.tsx — analytics stub
```

---

## EXECUTION PLAN

### Phase 1 (This Session): Quick Wins
- ✅ Fix SovereignProductCard imports (done)
- [ ] Fix StickyMobileCTA → governance-driven
- [ ] Wire trackEvent into ProductCard clicks
- [ ] Wire trackEvent into EntityCard clicks

### Phase 2 (Next Session): Core Components
- [ ] SovereignStoreCard → resolveEntityExperience + resolveEntityCTAs + trackEvent
- [ ] SovereignEntityCard → resolveEntityExperience
- [ ] SovereignProductCard → resolveEntityExperience (icons, media)

### Phase 3 (Scheduled): Detail Page Consolidation
- [ ] Create SovereignEntityDetail canonical component
- [ ] Migrate shop-detail.tsx to SovereignEntityDetail
- [ ] Full deprecation of cta-helpers.ts

---

*Report generated by Chief Architect — Shahdol Bazaar / BharatOS Governance Layer v1.1.0*
