// 🏛️ BHARAT-OS: COMMERCE GRID GOVERNANCE
// Unified commerce grid system for homepage, marketplace, AI recommendations,
// search results, related products, stores, and services.
// EXACT gap consistency. Predictable breakpoints. No broken mobile wrapping.

import { breakpoints } from "./breakpoints";

// ─── GRID PRESETS ───────────────────────────────────────

export type GridPreset =
    /** 2 cols mobile → 5 cols desktop — products, marketplace */
    | "product-grid"
    /** 1 col mobile → 3 cols desktop — stores, vendors */
    | "store-grid"
    /** 1 col mobile → 2 cols desktop — featured items */
    | "featured-grid"
    /** Horizontal scroll on mobile, grid on desktop */
    | "scroll-grid"
    /** Full-width single column — hero, banners */
    | "full-width"
    /** 2 cols mobile → 4 cols desktop — related products */
    | "related-grid"
    /** Small thumbnails — services, categories */
    | "thumbnail-grid";

// ─── GRID CONFIGURATION ─────────────────────────────────

export interface GridConfig {
    /** Mobile columns (< 640px) */
    mobile: number;
    /** Small tablet (640px+) */
    sm: number;
    /** Tablet (768px+) */
    md: number;
    /** Desktop (1024px+) */
    lg: number;
    /** Large desktop (1280px+) */
    xl: number;
    /** Gap between items */
    gap: string;
    /** Whether to use horizontal scroll on mobile (for scroll-grid) */
    scrollOnMobile: boolean;
    /** Container padding */
    padding: string;
}

export const gridPresets: Record<GridPreset, GridConfig> = {
    "product-grid": {
        mobile: 2,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 5,
        gap: "gap-3 sm:gap-4",
        scrollOnMobile: false,
        padding: "px-3 sm:px-4 md:px-6",
    },
    "store-grid": {
        mobile: 1,
        sm: 2,
        md: 2,
        lg: 3,
        xl: 3,
        gap: "gap-3 sm:gap-4 md:gap-5",
        scrollOnMobile: false,
        padding: "px-3 sm:px-4 md:px-6",
    },
    "featured-grid": {
        mobile: 1,
        sm: 2,
        md: 2,
        lg: 2,
        xl: 2,
        gap: "gap-4 sm:gap-5",
        scrollOnMobile: false,
        padding: "px-3 sm:px-4 md:px-6",
    },
    "scroll-grid": {
        mobile: 2,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 5,
        gap: "gap-3 sm:gap-4",
        scrollOnMobile: true,
        padding: "px-3 sm:px-4 md:px-6",
    },
    "full-width": {
        mobile: 1,
        sm: 1,
        md: 1,
        lg: 1,
        xl: 1,
        gap: "gap-0",
        scrollOnMobile: false,
        padding: "px-0",
    },
    "related-grid": {
        mobile: 2,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 4,
        gap: "gap-3 sm:gap-4",
        scrollOnMobile: false,
        padding: "px-3 sm:px-4 md:px-6",
    },
    "thumbnail-grid": {
        mobile: 3,
        sm: 3,
        md: 4,
        lg: 4,
        xl: 5,
        gap: "gap-2 sm:gap-3",
        scrollOnMobile: false,
        padding: "px-3 sm:px-4 md:px-6",
    },
};

// ─── TAILWIND CLASS GENERATORS ──────────────────────────

/**
 * Generate responsive grid columns Tailwind classes.
 * Example:
 *   getGridColumns("product-grid")
 *   → "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
 */
export function getGridColumns(preset: GridPreset): string {
    const config = gridPresets[preset];
    const classes = [
        `grid-cols-${config.mobile}`,
        config.sm !== config.mobile ? `sm:grid-cols-${config.sm}` : "",
        config.md !== config.sm ? `md:grid-cols-${config.md}` : "",
        config.lg !== config.md ? `lg:grid-cols-${config.lg}` : "",
        config.xl !== config.lg ? `xl:grid-cols-${config.xl}` : "",
    ]
        .filter(Boolean)
        .join(" ");
    return classes;
}

/**
 * Get full grid container classes for a preset.
 */
export function getGridContainerClasses(preset: GridPreset): string {
    const config = gridPresets[preset];
    const cols = getGridColumns(preset);
    return [
        "grid",
        cols,
        config.gap,
        config.padding,
    ].join(" ");
}

/**
 * Get horizontal scroll wrapper classes (for scroll-grid on mobile).
 */
export function getScrollWrapperClasses(preset: GridPreset): string {
    const config = gridPresets[preset];
    if (!config.scrollOnMobile) return "";

    return [
        "flex lg:grid overflow-x-auto snap-x snap-mandatory scrollbar-hide",
        getGridColumns(preset).replace("grid-cols", "lg:grid-cols"),
        config.gap,
        "-mx-3 px-3 lg:mx-0 lg:px-0",
    ].join(" ");
}

/**
 * Scroll item sizing for horizontal scroll grids.
 */
export function getScrollItemClasses(preset: GridPreset): string {
    if (!gridPresets[preset].scrollOnMobile) return "";

    const scrollablePresets = new Set<GridPreset>(["product-grid", "scroll-grid"]);
    if (!scrollablePresets.has(preset)) return "";

    return "min-w-[calc(50%-0.375rem)] lg:min-w-0";
}

// ─── EQUAL HEIGHT ENFORCEMENT ───────────────────────────

/**
 * Get classes that enforce equal row heights in the grid.
 * Apply to the grid container for consistent card heights.
 */
export function getEqualHeightClasses(): string {
    return "items-stretch auto-rows-fr";
}

// ─── SECTION WRAPPER ────────────────────────────────────

/**
 * Full section wrapper for grid sections with heading.
 */
export function getSectionWrapperClasses(): string {
    return "py-4 sm:py-6 md:py-8 w-full";
}

export default {
    gridPresets,
    getGridColumns,
    getGridContainerClasses,
    getScrollWrapperClasses,
    getScrollItemClasses,
    getEqualHeightClasses,
    getSectionWrapperClasses,
};
