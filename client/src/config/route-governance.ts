// 🏛️ BHARAT-OS: SOVEREIGN ROUTE GOVERNANCE
// Centralized route intelligence layer. Single source of truth for ALL route metadata.
// NO scattered pathname.includes checks. NO route detection drift.
// Every layout decision MUST reference this registry.

export type HeaderMode = "full" | "immersive" | "minimal" | "marketplace" | "hidden";
export type SafeAreaMode = "default" | "commerce" | "checkout" | "admin";

export interface RouteConfig {
    /** Header rendering mode */
    headerMode: HeaderMode;
    /** Whether the scroll-triggered search bar is visible */
    showSearch: boolean;
    /** Whether bottom navigation is visible */
    showBottomNav: boolean;
    /** Safe-area padding strategy */
    safeAreaMode: SafeAreaMode;
    /** Whether the header should render product-contextual controls (back/share/save) */
    isProductRoute: boolean;
    /** Whether to hide discovery search on this route */
    isDetailPage: boolean;
    /** Whether sticky mobile CTA should be shown (product detail pages) */
    showStickyCTA: boolean;
    /** Page bottom padding class */
    bottomPaddingClass: string;
}

// ─── ROUTE PATTERN MATCHING ─────────────────────────────
// Centralized — all route detection happens HERE, not in components.

export type RoutePattern = {
    /** Pattern to test against location pathname */
    patterns: RegExp[];
    /** Route configuration */
    config: RouteConfig;
};

/** Determine if ANY pattern in the array matches the location */
function matchesAny(location: string, patterns: RegExp[]): boolean {
    return patterns.some((p) => p.test(location));
}

// ─── DEFAULT (fallback) CONFIG ─────────────────────────
const defaultConfig: RouteConfig = {
    headerMode: "full",
    showSearch: true,
    showBottomNav: true,
    safeAreaMode: "default",
    isProductRoute: false,
    isDetailPage: false,
    showStickyCTA: false,
    bottomPaddingClass: "pb-[120px]",
};

// ─── ADMIN/VENDOR CONFIG ───────────────────────────────
const adminConfig: RouteConfig = {
    headerMode: "full",
    showSearch: false,
    showBottomNav: false,
    safeAreaMode: "admin",
    isProductRoute: false,
    isDetailPage: false,
    showStickyCTA: false,
    bottomPaddingClass: "pb-8",
};

// ─── PRODUCT DETAIL CONFIG ─────────────────────────────
const productDetailConfig: RouteConfig = {
    headerMode: "immersive",
    showSearch: false,
    showBottomNav: true,
    safeAreaMode: "commerce",
    isProductRoute: true,
    isDetailPage: true,
    showStickyCTA: true,
    bottomPaddingClass: "pb-[172px]",
};

// ─── PARTNER/SERVICE/SCHOOL DETAIL CONFIG ───────────────
const detailPageConfig: RouteConfig = {
    headerMode: "full",
    showSearch: false,
    showBottomNav: true,
    safeAreaMode: "default",
    isProductRoute: false,
    isDetailPage: true,
    showStickyCTA: false,
    bottomPaddingClass: "pb-[120px]",
};

// ─── MARKETPLACE LISTING CONFIG ─────────────────────────
const marketplaceConfig: RouteConfig = {
    headerMode: "marketplace",
    showSearch: true,
    showBottomNav: true,
    safeAreaMode: "default",
    isProductRoute: false,
    isDetailPage: false,
    showStickyCTA: false,
    bottomPaddingClass: "pb-[120px]",
};

// ─── ROUTE REGISTRY ─────────────────────────────────────
// Priority-ordered: first match wins.
export const routePatterns: RoutePattern[] = [
    // Admin/vendor routes (highest priority — no bottom nav, no search)
    {
        patterns: [/^\/admin/, /^\/vendor/],
        config: adminConfig,
    },
    // Product detail routes — absolute path patterns
    {
        patterns: [
            /^\/product\//,
            /^\/marketplace\/product/,
            /^\/marketplace\/products\//,
            /^\/([^\/]+)\/product\//,
        ],
        config: productDetailConfig,
    },
    // Partner/service/school detail pages
    {
        patterns: [
            /^\/partner\//,
            /^\/service\//,
            /^\/school\//,
            /^\/shop\//,
        ],
        config: detailPageConfig,
    },
    // Marketplace listing page
    {
        patterns: [/^\/marketplace$/, /^\/marketplace\//],
        config: marketplaceConfig,
    },
    // Checkout route
    {
        patterns: [/^\/checkout/, /^\/cart/],
        config: {
            headerMode: "minimal",
            showSearch: false,
            showBottomNav: false,
            safeAreaMode: "checkout",
            isProductRoute: false,
            isDetailPage: true,
            showStickyCTA: false,
            bottomPaddingClass: "pb-8",
        },
    },
];

// ─── RESOLVER ──────────────────────────────────────────
/**
 * Resolve route configuration for a given location pathname.
 * Uses the centralized route registry — NO scattered pathname checks.
 */
export function resolveRouteConfig(location: string): RouteConfig {
    for (const entry of routePatterns) {
        if (matchesAny(location, entry.patterns)) {
            return entry.config;
        }
    }
    return defaultConfig;
}

// ─── DERIVED HELPERS (for convenience) ─────────────────

export function isAdminOrVendorRoute(location: string): boolean {
    return /^\/admin/.test(location) || /^\/vendor/.test(location);
}

export function isProductDetailRoute(location: string): boolean {
    return /^\/product\//.test(location) ||
        /^\/marketplace\/product/.test(location) ||
        /^\/marketplace\/products\//.test(location) ||
        /^\/([^\/]+)\/product\//.test(location);
}

export function isImmersiveRoute(location: string): boolean {
    const config = resolveRouteConfig(location);
    return config.headerMode === "immersive";
}

export function isDetailPageRoute(location: string): boolean {
    return /^\/partner\//.test(location) ||
        /^\/service\//.test(location) ||
        /^\/school\//.test(location) ||
        /^\/shop\//.test(location) ||
        isProductDetailRoute(location);
}

/**
 * Get the back-navigation href for product detail routes.
 */
export function getProductBackHref(location: string): string {
    if (/^\/product\//.test(location)) return '/';
    if (/^\/marketplace\/product/.test(location)) return '/marketplace';
    const districtMatch = location.match(/^\/([^\/]+)\/product\//);
    if (districtMatch) return `/${districtMatch[1]}/marketplace`;
    return '/';
}
