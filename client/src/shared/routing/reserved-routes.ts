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

  // Services
  "schools",
  "school",
  "education",
  "hospitals",
  "services",
  "service",
  "bus",
  "bus-timetable",

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
 * Check if a route segment is reserved (not a district slug)
 */
export function isReservedRoute(route: string): boolean {
  return RESERVED_GLOBAL_ROUTES.has(route.toLowerCase());
}

/**
 * Extract potential district slug from URL path
 * Returns null if the first segment is reserved
 */
export function extractDistrictSlug(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const firstSegment = segments[0].toLowerCase();
  if (isReservedRoute(firstSegment)) return null;

  return firstSegment;
}

/**
 * Validate district slug format
 * Ensures slugs follow district naming conventions
 */
export function isValidDistrictSlug(slug: string | null): boolean {
  if (!slug) return false;

  // Basic validation: alphanumeric, hyphens, underscores
  // No special characters that could conflict with routes
  const districtSlugRegex = /^[a-zA-Z0-9_-]+$/;
  return districtSlugRegex.test(slug) && slug.length >= 2 && slug.length <= 50;
}