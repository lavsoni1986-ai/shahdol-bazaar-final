// 🏛️ BHARAT-OS: TYPOGRAPHY GOVERNANCE
// Semantic typography hierarchy for sovereign commerce.
// Mobile-first, Hindi/English safe, low-end Android readable.
// NO random font-size drift. ALL text must use these semantic levels.

import { fontWeights } from "./tokens";

// ─── TYPE SPEC ──────────────────────────────────────────
// Each level defines: size (rem), weight, tracking (letter-spacing),
// line-height, and semantic usage.

export interface TypeSpec {
    /** Font size in rem (mobile-first clamp) */
    size: string;
    /** Font weight */
    weight: number;
    /** Letter spacing in em */
    tracking: string;
    /** Line height */
    leading: string;
    /** Semantic description of where to use this */
    usage: string;
}

// ─── TYPOGRAPHY SCALE (clamp-based, mobile-first) ───────
// Values use clamp() for fluid scaling without breakpoint media queries.
// Minimum size ensures readability on small devices.
// Maximum size prevents oversized text on large screens.

export const typography = {
    // ── DISPLAY / HERO ──
    /** Page titles, hero headings — e.g. "SHAHDOL MARKET" */
    display: {
        size: "clamp(1.75rem, 4vw + 0.5rem, 3.5rem)",
        weight: fontWeights.black,
        tracking: "-0.03em",
        leading: "1.1",
        usage: "Hero headings, page titles, brand statements",
    } satisfies TypeSpec,

    /** Section headings — e.g. "Featured Products" */
    heading1: {
        size: "clamp(1.25rem, 2.5vw + 0.5rem, 1.75rem)",
        weight: fontWeights.black,
        tracking: "-0.02em",
        leading: "1.2",
        usage: "Major section headings, category titles",
    } satisfies TypeSpec,

    /** Subsection headings — e.g. "Product Details" */
    heading2: {
        size: "clamp(1.1rem, 1.8vw + 0.3rem, 1.35rem)",
        weight: fontWeights.bold,
        tracking: "-0.01em",
        leading: "1.25",
        usage: "Subsection titles, card titles, modal headings",
    } satisfies TypeSpec,

    // ── COMMERCE SPECIFIC ──
    /** Product names, store names */
    productTitle: {
        size: "clamp(0.95rem, 1.5vw + 0.3rem, 1.15rem)",
        weight: fontWeights.bold,
        tracking: "0em",
        leading: "1.3",
        usage: "Product titles, store names, listing item names",
    } satisfies TypeSpec,

    /** Prices — e.g. "₹1,299" */
    price: {
        size: "clamp(1.1rem, 2vw + 0.3rem, 1.5rem)",
        weight: fontWeights.black,
        tracking: "-0.02em",
        leading: "1.1",
        usage: "Primary price display",
    } satisfies TypeSpec,

    /** Large prices — featured/hero pricing */
    priceLarge: {
        size: "clamp(1.5rem, 3vw + 0.5rem, 2.25rem)",
        weight: fontWeights.black,
        tracking: "-0.02em",
        leading: "1.1",
        usage: "Hero pricing, featured product prices",
    } satisfies TypeSpec,

    /** MRP / strikethrough prices */
    priceStrikethrough: {
        size: "clamp(0.8rem, 1.2vw + 0.2rem, 0.95rem)",
        weight: fontWeights.medium,
        tracking: "0em",
        leading: "1.2",
        usage: "MRP display, strikethrough original prices",
    } satisfies TypeSpec,

    /** Discount badges — e.g. "-40%" */
    discountBadge: {
        size: "clamp(0.65rem, 1vw + 0.1rem, 0.8rem)",
        weight: fontWeights.black,
        tracking: "0em",
        leading: "1",
        usage: "Discount percentage badges, sale indicators",
    } satisfies TypeSpec,

    // ── METADATA / LABELS ──
    /** Category labels, section labels — e.g. "GROCERY" */
    label: {
        size: "clamp(0.6rem, 0.8vw + 0.1rem, 0.7rem)",
        weight: fontWeights.black,
        tracking: "0.2em",
        leading: "1.2",
        usage: "Category labels, metadata tags, uppercase labels",
    } satisfies TypeSpec,

    /** Trust labels — e.g. "Verified", "DSSL 85" */
    trustLabel: {
        size: "clamp(0.55rem, 0.7vw + 0.1rem, 0.65rem)",
        weight: fontWeights.bold,
        tracking: "0.1em",
        leading: "1.2",
        usage: "Trust badges, verification status, DSSL scores",
    } satisfies TypeSpec,

    /** Small captions — e.g. "by Store Name" */
    caption: {
        size: "clamp(0.65rem, 0.9vw + 0.1rem, 0.75rem)",
        weight: fontWeights.medium,
        tracking: "0em",
        leading: "1.3",
        usage: "Seller attribution, timestamps, secondary metadata",
    } satisfies TypeSpec,

    // ── BODY TEXT ──
    /** Paragraphs, descriptions */
    body: {
        size: "clamp(0.85rem, 1.2vw + 0.2rem, 0.95rem)",
        weight: fontWeights.regular,
        tracking: "0em",
        leading: "1.6",
        usage: "Product descriptions, paragraphs, body content",
    } satisfies TypeSpec,

    /** Small body text — compact info */
    bodySmall: {
        size: "clamp(0.75rem, 1vw + 0.1rem, 0.85rem)",
        weight: fontWeights.regular,
        tracking: "0em",
        leading: "1.5",
        usage: "Compact descriptions, delivery info, fine print",
    } satisfies TypeSpec,

    // ── CTA / ACTION ──
    /** Primary CTA text — e.g. "Add to Cart" */
    ctaText: {
        size: "clamp(0.75rem, 1vw + 0.2rem, 0.9rem)",
        weight: fontWeights.black,
        tracking: "0.1em",
        leading: "1",
        usage: "Button labels, call-to-action text, primary CTAs",
    } satisfies TypeSpec,

    /** Small CTA text — compact action buttons */
    ctaSmall: {
        size: "clamp(0.65rem, 0.8vw + 0.1rem, 0.75rem)",
        weight: fontWeights.black,
        tracking: "0.08em",
        leading: "1",
        usage: "Small action buttons, secondary CTAs, icon labels",
    } satisfies TypeSpec,

    // ── SELLER / STORE ──
    /** Store/shop names */
    storeName: {
        size: "clamp(0.9rem, 1.4vw + 0.2rem, 1.1rem)",
        weight: fontWeights.bold,
        tracking: "-0.01em",
        leading: "1.2",
        usage: "Store names, vendor names, partner names",
    } satisfies TypeSpec,

    /** District intelligence text — e.g. "Available in Shahdol" */
    districtInfo: {
        size: "clamp(0.6rem, 0.8vw + 0.1rem, 0.7rem)",
        weight: fontWeights.semibold,
        tracking: "0em",
        leading: "1.2",
        usage: "District labels, locality info, delivery area indicators",
    } satisfies TypeSpec,
} as const;

// ─── TAILWIND CLASS GENERATORS ──────────────────────────
// These map semantic types to Tailwind classes for convenience.

export type TypographyLevel = keyof typeof typography;

/**
 * Get Tailwind typography classes for a semantic text level.
 * Provides a consistent mapping from our design tokens to Tailwind.
 */
export function getTypographyClasses(level: TypographyLevel): string {
    const map: Record<TypographyLevel, string> = {
        display: "font-black tracking-tighter",
        heading1: "font-black",
        heading2: "font-bold",
        productTitle: "font-bold leading-snug",
        price: "font-black tracking-tight",
        priceLarge: "font-black tracking-tight",
        priceStrikethrough: "font-medium text-zinc-500 line-through",
        discountBadge: "font-black",
        label: "font-black uppercase tracking-widest",
        trustLabel: "font-bold uppercase",
        caption: "font-medium text-zinc-400",
        body: "leading-relaxed",
        bodySmall: "leading-relaxed",
        ctaText: "font-black uppercase tracking-wider",
        ctaSmall: "font-black uppercase tracking-wider",
        storeName: "font-bold",
        districtInfo: "font-semibold",
    };
    return map[level] || "";
}

// ─── FLUID SIZE ACCESSOR ────────────────────────────────
/**
 * Get the fluid clamp() value for a typography level.
 * Use with `style={{ fontSize: typography.productTitle.size }}` for precision.
 */
export function getFluidSize(level: TypographyLevel): string {
    return typography[level].size;
}

export default {
    typography,
    getTypographyClasses,
    getFluidSize,
};
