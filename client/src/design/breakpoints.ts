// 🏛️ BHARAT-OS: BREAKPOINT GOVERNANCE
// Single source of truth for responsive breakpoint decisions.
// Every commerce grid, navigation break, and layout change must use these.

// ─── BREAKPOINT VALUES (in pixels) ──────────────────────
export const breakpoints = {
    /** Mobile phones — 0-639px */
    mobile: 0,
    /** Large phones / small tablets — 640px */
    sm: 640,
    /** Tablets (portrait) — 768px */
    md: 768,
    /** Tablets (landscape) / small laptops — 1024px */
    lg: 1024,
    /** Desktops — 1280px */
    xl: 1280,
    /** Large desktops — 1536px */
    "2xl": 1536,
} as const;

// ─── BREAKPOINT ALIASES ─────────────────────────────────
export type Breakpoint = keyof typeof breakpoints;

// ─── MEDIA QUERY STRINGS ────────────────────────────────
export const mediaQueries = {
    /** Mobile-first: applies to mobile and up */
    mobileFirst: (bp: Breakpoint) => `(min-width: ${breakpoints[bp]}px)`,
    /** Desktop-first: applies to desktop and down */
    desktopFirst: (bp: Breakpoint) => `(max-width: ${breakpoints[bp] - 1}px)`,
    /** Between two breakpoints */
    between: (min: Breakpoint, max: Breakpoint) =>
        `(min-width: ${breakpoints[min]}px) and (max-width: ${breakpoints[max] - 1}px)`,
} as const;

// ─── LAYOUT DECISIONS ───────────────────────────────────

export interface LayoutDecision {
    /** Columns for grid layouts */
    columns: number;
    /** Gap between items */
    gap: string;
    /** Padding for container */
    padding: string;
    /** Card size hint */
    cardWidth: string;
    /** Max visible items before scroll/view all */
    maxVisibleItems: number;
}

/**
 * Get layout decisions for a given screen width.
 * This drives ALL commerce grid layouts consistently.
 */
export function getLayoutForWidth(width: number): LayoutDecision {
    if (width >= breakpoints.xl) {
        return { columns: 5, gap: "gap-5", padding: "px-8", cardWidth: "w-[calc(20%-1rem)]", maxVisibleItems: 10 };
    }
    if (width >= breakpoints.lg) {
        return { columns: 4, gap: "gap-4", padding: "px-6", cardWidth: "w-[calc(25%-0.75rem)]", maxVisibleItems: 8 };
    }
    if (width >= breakpoints.md) {
        return { columns: 3, gap: "gap-4", padding: "px-4", cardWidth: "w-[calc(33.33%-0.67rem)]", maxVisibleItems: 6 };
    }
    if (width >= breakpoints.sm) {
        return { columns: 2, gap: "gap-3", padding: "px-3", cardWidth: "w-[calc(50%-0.375rem)]", maxVisibleItems: 4 };
    }
    // Mobile default
    return { columns: 2, gap: "gap-3", padding: "px-3", cardWidth: "w-[calc(50%-0.375rem)]", maxVisibleItems: 4 };
}

// ─── TAILWIND PREFIX HELPERS ────────────────────────────

export type TailwindBreakPrefix = "" | "sm:" | "md:" | "lg:" | "xl:" | "2xl:";

/**
 * Generate breakpoint-prefixed Tailwind classes.
 * Example: prefixedClass("grid-cols-2", { sm: "grid-cols-3", lg: "grid-cols-4" })
 * Result: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
 */
export function prefixedClasses(
    base: string,
    overrides: Partial<Record<Breakpoint, string>>
): string {
    const prefixMap: Record<Breakpoint, TailwindBreakPrefix> = {
        mobile: "",
        sm: "sm:",
        md: "md:",
        lg: "lg:",
        xl: "xl:",
        "2xl": "2xl:",
    };

    const classes = [base];
    for (const [bp, cls] of Object.entries(overrides)) {
        const prefix = prefixMap[bp as Breakpoint];
        if (prefix !== undefined && cls) {
            classes.push(`${prefix}${cls}`);
        }
    }
    return classes.join(" ");
}

export default {
    breakpoints,
    mediaQueries,
    getLayoutForWidth,
    prefixedClasses,
};
