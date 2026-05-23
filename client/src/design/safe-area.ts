// 🏛️ BHARAT-OS: SOVEREIGN SAFE-AREA GOVERNANCE
// Single source of truth for ALL viewport offset calculations.
// Prevents collisions between header, bottom nav, sticky CTAs, floating actions, modals, keyboards.
// NO arbitrary bottom spacing. NO mt/pb hacks. NO pathname.includes checks.
// Every viewport-sensitive surface MUST consume these tokens.

import { spacingValues } from "./tokens";

// ─── CANONICAL SAFE-AREA OFFSETS (px) ───────────────────
// These represent the TOTAL pixel offset a layer occupies.
// Bottom = distance from viewport bottom edge.
// Top = distance from viewport top edge.
export const SAFE_AREAS = {
    /** Fixed header total height (64px header + 24px extra padding) */
    header: spacingValues.layout + spacingValues.section, // 64 + 24 = 88
    /** Bottom navigation bar height */
    bottomNav: 80,
    /** AI floating orb (overlaps bottom nav, measured from viewport bottom) */
    floatingOrb: 96,
    /** Sticky mobile CTA bar (overlaps bottom nav) */
    stickyCTA: 92,
    /** Estimated mobile keyboard open offset */
    keyboardOffset: 120,
    /** Modal/sheet bottom padding when keyboard is visible */
    modalPadding: spacingValues.section, // 24
    /** Page bottom padding to prevent content clipping under nav (80px nav + 40px comfortable gap) */
    pageBottomPadding: 120, // stable: tested as pb-[120px]
    /** WhatsApp FAB offset from bottom (above bottom nav) */
    whatsappFAB: 80, // bottom-20 = 80px from bottom
    /** Bottom nav item icon size */
    navItemSize: 20,
    /** AI orb diameter */
    orbSize: 56, // w-14 h-14
} as const;

// ─── COMPUTED CONSTANTS ─────────────────────────────────
export const SAFE_BOTTOM = {
    /** Space to leave when bottom nav is visible */
    withNav: SAFE_AREAS.bottomNav,
    /** Space to leave when sticky CTA + bottom nav are both visible */
    withStickyCTA: SAFE_AREAS.stickyCTA + SAFE_AREAS.bottomNav, // 172
    /** Space to leave when keyboard is open (hides bottom nav) */
    withKeyboard: SAFE_AREAS.keyboardOffset,
    /** Minimum bottom padding for any content area */
    minimum: spacingValues.section, // 24
} as const;

// ─── LAYER OFFsets (from viewport edge) ─────────────────
// Helps components determine their absolute position.

export const LAYER_OFFSETS = {
    /** Header sits at top: 0 */
    header: { top: 0, height: SAFE_AREAS.header },
    /** Floating search bar sits directly below header */
    searchBar: { top: SAFE_AREAS.header, height: 64 },
    /** Bottom nav sits at the very bottom */
    bottomNav: { bottom: 0, height: SAFE_AREAS.bottomNav },
    /** Sticky CTA sits above bottom nav (product pages) */
    stickyCTA: { bottom: SAFE_AREAS.bottomNav, height: SAFE_AREAS.stickyCTA },
    /** WhatsApp FAB sits above bottom nav */
    whatsappFAB: { bottom: SAFE_AREAS.bottomNav + spacingValues.layout, height: 48 },
} as const;

// ─── HELPER FUNCTIONS ───────────────────────────────────

/**
 * Calculate safe top offset for content beneath the fixed header.
 * Currently always returns header total, but centralized for future dynamic behavior.
 */
export function getSafeTop(): number {
    return SAFE_AREAS.header;
}

/**
 * Calculate safe bottom offset based on visible UI layers.
 * @param options.layers - Bitmask of visible layers
 * @param options.keyboardOpen - Whether mobile keyboard is visible
 */
export function getSafeBottom(options?: {
    keyboardOpen?: boolean;
    hideBottomNav?: boolean;
    showStickyCTA?: boolean;
}): number {
    if (options?.keyboardOpen) {
        return SAFE_BOTTOM.withKeyboard;
    }

    let bottom = SAFE_BOTTOM.minimum;

    if (!options?.hideBottomNav) {
        bottom += SAFE_AREAS.bottomNav;
    }

    if (options?.showStickyCTA) {
        bottom += SAFE_AREAS.stickyCTA;
    }

    return bottom;
}

/**
 * Calculate bottom offset for sticky CTA to avoid overlapping bottom nav.
 * Sticky CTA should sit directly above bottom nav.
 */
export function getStickyCTAOffset(): number {
    return SAFE_AREAS.bottomNav;
}

/**
 * Get the top offset for the floating search bar.
 * Sits directly below the fixed header when visible.
 */
export function getSearchBarTop(): number {
    return SAFE_AREAS.header;
}

/**
 * Ensure a bottom-positioned element does not collide with bottom nav
 * Returns the maximum allowed bottom value.
 */
export function getMaxBottom(minOffset?: number): number {
    return SAFE_AREAS.bottomNav + (minOffset ?? 0);
}

/**
 * Get page bottom padding for main content.
 * Ensures content is never clipped behind bottom nav + sticky CTA.
 */
export function getPageBottomPadding(options?: {
    hideBottomNav?: boolean;
    showStickyCTA?: boolean;
}): number {
    let padding = spacingValues.section; // 24px base
    if (!options?.hideBottomNav) padding += SAFE_AREAS.bottomNav;
    if (options?.showStickyCTA) padding += SAFE_AREAS.stickyCTA;
    return padding;
}

// ─── CSS CLASS HELPERS ─────────────────────────────────
export const safeAreaClasses = {
    /** Standard page content padding bottom */
    pageBottom: "pb-[120px]",
    /** Admin/vendor pages (no bottom nav) */
    adminBottom: "pb-8",
    /** Product detail page (sticky CTA visible) */
    productBottom: "pb-[172px]",
} as const;

export type SafeAreaOptions = {
    keyboardOpen?: boolean;
    hideBottomNav?: boolean;
    showStickyCTA?: boolean;
};
