// shared/routing/reserved-routes.ts
// ============================================
// CANONICAL RESERVED ROUTES REGISTRY
// Single source of truth for route classification
// Prevents district slug hijacking and routing drift
// ============================================

/**
 * Routes that are reserved for global functionality
 * These should NEVER be treated as district slugs
 * Used by both DistrictContext and api-client for consistent behavior
 */
export const RESERVED_GLOBAL_ROUTES = new Set([
  // Empty route (home)
  "",

  // Authentication & User Management
  "auth",
  "login",
  "register",
  "logout",

  // API endpoints (never district slugs)
  "api",

  // District management (global)
  "districts",

  // Dashboard routes
  "customer-dashboard",
  "merchant-dashboard",
  "partner-dashboard",
  "partner",

  // User profile & settings
  "profile",
  "settings",

  // Commerce
  "wallet",
  "cart",
  "checkout",
  "checkout-success",
  "orders",
  "order-success",
  "my-orders",
  "payment",

  // Marketplace (global access)
  "marketplace",
  "marketplace-stores",
  "marketplace-store",
  "marketplace-product",
  "shops",
  "shop",
  "product",

  // Search & AI
  "search",
  "ai",

  // Healthcare & Services
  "healthcare",
  "hospitals",
  "hospital",
  "schools",
  "school",
  "education",
  "services",
  "service",
  "bus",
  "bus-timetable",
  "emergency",
  "professionals",
  "professional",
  "restaurants",
  "restaurant",
  "bookings",
  "booking",

  // Static pages
  "pricing",
  "contact",
  "about",
  "terms",

  // Vendor management
  "vendor",
  "vendor-login",
  "vendor-register",

  // Admin interfaces
  "admin",
  "superadmin",

  // Legacy routes (preserve for compatibility)
  "seller-onboarding",
  "merchant-onboarding",
  "merchant-store-setup",
]);

/**
 * CANONICAL REGISTERED ACTIVE DISTRICTS
 * Single source of truth for the multi-tenant district partition.
 * An arbitrary string or syntactically valid slug is NOT a district unless registered here.
 */
export const REGISTERED_DISTRICTS = {
  shahdol: { id: 1, slug: "shahdol", name: "Shahdol" },
  anuppur: { id: 2, slug: "anuppur", name: "Anuppur" },
  umaria: { id: 3, slug: "umaria", name: "Umaria" },
} as const;

export type RegisteredDistrictSlug = keyof typeof REGISTERED_DISTRICTS;

export const REGISTERED_DISTRICT_SLUGS = new Set<string>(
  Object.keys(REGISTERED_DISTRICTS)
);

export const DEFAULT_DISTRICT_SLUG: RegisteredDistrictSlug = "shahdol";

/**
 * Check if a slug is a registered active district.
 * Validates membership against the canonical district registry, not just syntax.
 */
export function isRegisteredDistrictSlug(slug: string | null | undefined): slug is RegisteredDistrictSlug {
  if (!slug) return false;
  return REGISTERED_DISTRICT_SLUGS.has(slug.toLowerCase().trim());
}

/**
 * Get canonical district ID for a registered district slug.
 * Guaranteed to return the corresponding ID or default to 1 (Shahdol).
 */
export function getDistrictIdFromRegisteredSlug(slug: string | null | undefined): number {
  if (!slug) return 1;
  const normalized = slug.toLowerCase().trim();
  if (normalized in REGISTERED_DISTRICTS) {
    return REGISTERED_DISTRICTS[normalized as RegisteredDistrictSlug].id;
  }
  return 1;
}

/**
 * Check if a route segment is reserved (not a district slug)
 */
export function isReservedRoute(route: string): boolean {
  return RESERVED_GLOBAL_ROUTES.has(route.toLowerCase().trim());
}

/**
 * Extract potential district slug from URL path
 * Returns the slug ONLY if it is a registered active district and not a reserved route.
 */
export function extractDistrictSlug(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const firstSegment = segments[0].toLowerCase().trim();
  if (isReservedRoute(firstSegment)) return null;
  if (!isRegisteredDistrictSlug(firstSegment)) return null;

  return firstSegment;
}

/**
 * Validate district slug format (syntax only)
 * Ensures slugs follow district naming conventions
 */
export function isValidDistrictSlug(slug: string | null): boolean {
  if (!slug) return false;

  // Basic validation: alphanumeric, hyphens, underscores
  const districtSlugRegex = /^[a-zA-Z0-9_-]+$/;
  return districtSlugRegex.test(slug) && slug.length >= 2 && slug.length <= 50;
}
