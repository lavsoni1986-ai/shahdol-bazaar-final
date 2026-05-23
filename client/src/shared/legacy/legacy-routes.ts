// shared/legacy/legacy-routes.ts
// ============================================
// LEGACY ROUTES ISOLATION ZONE
// BharatOS Deprecated Route Redirects & Aliases
//
// ⚠️ ARCHITECTURAL QUARANTINE ZONE ⚠️
// These routes are DEPRECATED and ISOLATED.
// DO NOT BUILD NEW FEATURES ON THESE ROUTES.
// DO NOT EXPAND THESE ROUTES.
//
// This file contains ONLY:
// - Redirects for backward compatibility
// - Route aliases for migration support
// - NO active business logic
//
// For new routing: Use shared/routing/sovereign-routes.ts
// ============================================

import { partnerRoutes, legacyRoutes } from "../routing/sovereign-routes";

/**
 * @deprecated
 * LEGACY ROUTE REDIRECTS
 * For backward compatibility during migration
 */
export const LEGACY_ROUTE_REDIRECTS = {
  // Vendor routes → Partner routes
  '/vendor/dashboard': '/partner/dashboard',
  '/vendor/register': '/auth?role=partner&mode=register',

  // Shop routes → Partner routes
  '/shop/dashboard': '/partner/dashboard',
  '/shop/register': '/auth?role=partner&mode=register',

  // Seller routes → Partner routes
  '/seller/dashboard': '/partner/dashboard',
  '/seller/register': '/auth?role=partner&mode=register',

  // Merchant routes → Partner routes
  '/merchant/dashboard': '/partner/dashboard',
  '/merchant/register': '/auth?role=partner&mode=register',

  // Store routes → Partner routes
  '/store/dashboard': '/partner/dashboard',
  '/store/register': '/auth?role=partner&mode=register',
} as const;

/**
 * @deprecated
 * LEGACY PARTNER SLUG REDIRECTS
 * Maps old route patterns to canonical partner routes
 */
export const LEGACY_PARTNER_SLUG_REDIRECTS = {
  // Function to redirect vendor slug to partner slug
  redirectVendorSlug: (districtSlug: string, vendorSlug: string): string => {
    console.warn('⚠️ [LEGACY ROUTE] Vendor slug route accessed');
    console.warn('   Redirecting to canonical partner route');
    return partnerRoutes.profile(districtSlug, vendorSlug);
  },

  // Function to redirect shop slug to partner slug
  redirectShopSlug: (districtSlug: string, shopSlug: string): string => {
    console.warn('⚠️ [LEGACY ROUTE] Shop slug route accessed');
    console.warn('   Redirecting to canonical partner route');
    return partnerRoutes.profile(districtSlug, shopSlug);
  },

  // Function to redirect seller slug to partner slug
  redirectSellerSlug: (districtSlug: string, sellerSlug: string): string => {
    console.warn('⚠️ [LEGACY ROUTE] Seller slug route accessed');
    console.warn('   Redirecting to canonical partner route');
    return partnerRoutes.profile(districtSlug, sellerSlug);
  },

  // Function to redirect merchant slug to partner slug
  redirectMerchantSlug: (districtSlug: string, merchantSlug: string): string => {
    console.warn('⚠️ [LEGACY ROUTE] Merchant slug route accessed');
    console.warn('   Redirecting to canonical partner route');
    return partnerRoutes.profile(districtSlug, merchantSlug);
  },

  // Function to redirect store slug to partner slug
  redirectStoreSlug: (districtSlug: string, storeSlug: string): string => {
    console.warn('⚠️ [LEGACY ROUTE] Store slug route accessed');
    console.warn('   Redirecting to canonical partner route');
    return partnerRoutes.profile(districtSlug, storeSlug);
  },
};

/**
 * @deprecated
 * LEGACY ROUTE DETECTION
 * Identifies legacy route patterns for migration warnings
 */
export const LEGACY_ROUTE_PATTERNS = {
  // Vendor patterns
  vendorDashboard: /^\/vendor\/dashboard/,
  vendorRegister: /^\/vendor\/register/,
  vendorSlug: /^\/[^\/]+\/vendor\/[^\/]+$/,

  // Shop patterns
  shopDashboard: /^\/shop\/dashboard/,
  shopRegister: /^\/shop\/register/,
  shopSlug: /^\/[^\/]+\/shop\/[^\/]+$/,

  // Seller patterns
  sellerDashboard: /^\/seller\/dashboard/,
  sellerRegister: /^\/seller\/register/,
  sellerSlug: /^\/[^\/]+\/seller\/[^\/]+$/,

  // Merchant patterns
  merchantDashboard: /^\/merchant\/dashboard/,
  merchantRegister: /^\/merchant\/register/,
  merchantSlug: /^\/[^\/]+\/merchant\/[^\/]+$/,

  // Store patterns
  storeDashboard: /^\/store\/dashboard/,
  storeRegister: /^\/store\/register/,
  storeSlug: /^\/[^\/]+\/store\/[^\/]+$/,
};

/**
 * @deprecated
 * LEGACY ROUTE WARNING SYSTEM
 * Logs migration warnings for legacy route access
 */
export function logLegacyRouteAccess(pathname: string) {
  console.warn('🚨 [LEGACY ROUTE ACCESS]');
  console.warn(`   Path: ${pathname}`);
  console.warn('   This route is deprecated and will be removed.');
  console.warn('   Use canonical routes from shared/routing/sovereign-routes.ts');
  console.warn('   Contact: BharatOS Sovereign Architecture Council');
}

/**
 * @deprecated
 * LEGACY ROUTE REDIRECTOR
 * Provides redirect logic for legacy routes
 */
export function getLegacyRouteRedirect(pathname: string): string | null {
  // Check for exact redirects
  if (LEGACY_ROUTE_REDIRECTS[pathname as keyof typeof LEGACY_ROUTE_REDIRECTS]) {
    const redirect = LEGACY_ROUTE_REDIRECTS[pathname as keyof typeof LEGACY_ROUTE_REDIRECTS];
    logLegacyRouteAccess(pathname);
    console.log(`   Redirecting to: ${redirect}`);
    return redirect;
  }

  // Check for pattern-based redirects
  for (const [pattern, regex] of Object.entries(LEGACY_ROUTE_PATTERNS)) {
    if (regex.test(pathname)) {
      logLegacyRouteAccess(pathname);
      console.log(`   Pattern match: ${pattern}`);

      // For slug patterns, extract components and redirect
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length >= 3) {
        const districtSlug = segments[0];
        const entitySlug = segments[2];

        switch (pattern) {
          case 'vendorSlug':
            return legacyRoutes.vendor(districtSlug, entitySlug);
          case 'shopSlug':
            return legacyRoutes.store(districtSlug, entitySlug);
          case 'sellerSlug':
            return legacyRoutes.seller(districtSlug, entitySlug);
          case 'merchantSlug':
            return legacyRoutes.merchant(districtSlug, entitySlug);
          case 'storeSlug':
            return legacyRoutes.store(districtSlug, entitySlug);
        }
      }

      // For dashboard/register patterns, redirect to canonical
      if (pathname.includes('/dashboard')) {
        return '/partner/dashboard';
      }
      if (pathname.includes('/register')) {
        return '/auth?role=partner&mode=register';
      }
    }
  }

  return null; // No redirect available
}

// ============================================
// LEGACY ROUTE METADATA
// ============================================

export const LEGACY_ROUTE_METADATA = {
  STATUS: 'DEPRECATED',
  QUARANTINE_LEVEL: 'HIGH',
  REDIRECT_STRATEGY: 'Gradual migration with warnings',
  REMOVAL_TIMELINE: 'After Vendor → Partner route migration complete',
  MAINTAINER: 'BharatOS Sovereign Architecture Council',
  ENFORCEMENT: 'MANDATORY - Log warnings for legacy route access',
} as const;