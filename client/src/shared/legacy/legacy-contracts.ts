// shared/legacy/legacy-contracts.ts
// ============================================
// LEGACY CONTRACTS ISOLATION ZONE
// BharatOS Deprecated API Shapes & Payloads
//
// ⚠️ ARCHITECTURAL QUARANTINE ZONE ⚠️
// These contracts are DEPRECATED and ISOLATED.
// DO NOT BUILD NEW FEATURES ON THESE CONTRACTS.
// DO NOT EXPAND THESE CONTRACTS.
//
// This file exists ONLY for:
// - Migration compatibility
// - Gradual transition support
// - Legacy system operation
//
// For new development: Use shared/canonical/ contracts
// ============================================

/**
 * @deprecated
 * LEGACY MARKETPLACE SNAPSHOT CONTRACT
 * Transitional compatibility only - DO NOT EXPAND
 *
 * Old payload shape with mixed entity semantics.
 * Will be replaced by canonical district cognition engine.
 */
export interface LegacyMarketplaceSnapshot {
  /** @deprecated Use partners array instead */
  stores?: any[];
  /** @deprecated Use partners array instead */
  vendors?: any[];
  /** @deprecated Use partners array instead */
  shops?: any[];
  /** @deprecated Use services array instead */
  workers?: any[];
  /** @deprecated Use products array instead */
  products?: any[];
  /** @deprecated Usually canonical, but part of legacy payload */
  hospitals?: any[];
  /** @deprecated Usually canonical, but part of legacy payload */
  schools?: any[];
}

/**
 * @deprecated
 * LEGACY PARTNER CONTRACT
 * Mixed semantic payload - DO NOT USE
 */
export interface LegacyPartnerContract {
  /** @deprecated Use CanonicalPartner instead */
  vendor?: any;
  /** @deprecated Use CanonicalPartner instead */
  shop?: any;
  /** @deprecated Use CanonicalPartner instead */
  seller?: any;
  /** @deprecated Use CanonicalPartner instead */
  merchant?: any;
  /** @deprecated Use CanonicalPartner instead */
  store?: any;

  // Mixed field semantics
  /** @deprecated Use phone instead */
  mobile?: string;
  /** @deprecated Use phone instead */
  phoneNumber?: string;
  /** @deprecated Use phone instead */
  contactNumber?: string;

  /** @deprecated Use imageUrl instead */
  image?: string;
  /** @deprecated Use imageUrl instead */
  photo?: string;

  /** @deprecated Use type instead */
  businessType?: string;
  /** @deprecated Use category instead */
  categoryName?: string;
}

/**
 * @deprecated
 * LEGACY PRODUCT CONTRACT
 * Vendor-centric product payload - DO NOT USE
 */
export interface LegacyProductContract {
  /** @deprecated Use partner instead */
  vendor?: LegacyPartnerContract;
  /** @deprecated Use partner instead */
  shop?: LegacyPartnerContract;
  /** @deprecated Use partner instead */
  seller?: LegacyPartnerContract;

  // Product fields (usually canonical)
  id?: number;
  name?: string;
  title?: string; // @deprecated Use name
  price?: number;
  mrp?: number;
  imageUrl?: string;
  category?: string;
}

/**
 * @deprecated
 * LEGACY AUTH ROLE CONTRACT
 * Chaotic role semantics - DO NOT USE
 */
export interface LegacyAuthContract {
  /** @deprecated Use PARTNER role instead */
  role?: 'SELLER' | 'VENDOR' | 'MERCHANT' | 'STORE' | 'SHOP' | string;
  /** @deprecated Use canonical user fields */
  [key: string]: any;
}

// ============================================
// DEPRECATED API ENDPOINT CONTRACTS
// ============================================

/**
 * @deprecated
 * LEGACY MARKETPLACE ENDPOINTS
 * Chaotic discovery API - DO NOT EXPAND
 */
export const LEGACY_MARKETPLACE_ENDPOINTS = {
  /** @deprecated Use canonical home-snapshot */
  'home-snapshot': '/api/marketplace/home-snapshot',
  /** @deprecated Use canonical stores endpoint */
  'stores': '/api/marketplace/stores',
  /** @deprecated Use canonical vendors endpoint */
  'vendors': '/api/marketplace/vendors',
  /** @deprecated Use canonical shops endpoint */
  'shops': '/api/marketplace/shops',
} as const;

/**
 * @deprecated
 * LEGACY PARTNER ENDPOINTS
 * Mixed semantic partner access - DO NOT USE
 */
export const LEGACY_PARTNER_ENDPOINTS = {
  /** @deprecated Use canonical partner endpoint */
  'vendor-detail': '/api/marketplace/vendors/',
  /** @deprecated Use canonical partner endpoint */
  'shop-detail': '/api/marketplace/shops/',
  /** @deprecated Use canonical partner endpoint */
  'store-detail': '/api/marketplace/stores/',
} as const;

// ============================================
// MIGRATION WARNINGS & ENFORCEMENT
// ============================================

/**
 * @deprecated
 * Migration warning for legacy contract usage
 */
export function legacyContractWarning(contractName: string, replacement: string) {
  console.warn(`⚠️ [LEGACY CONTRACT] Using deprecated ${contractName}`);
  console.warn(`   Replacement: ${replacement}`);
  console.warn('   This is a transitional compatibility layer only.');
  console.warn('   DO NOT BUILD NEW FEATURES ON THIS CONTRACT.');
}

/**
 * @deprecated
 * Detects if response uses legacy payload shape
 */
export function isLegacyPayload(payload: any): boolean {
  return !!(payload?.stores || payload?.vendors || payload?.shops || payload?.workers);
}

/**
 * @deprecated
 * Legacy payload transformation helper
 * For gradual migration support only
 */
export function transformLegacyPayload(legacyPayload: any): any {
  legacyContractWarning('legacy payload transformation', 'canonical response normalizers');

  // Basic transformation - in practice, use canonical normalizers
  if (legacyPayload.stores) {
    legacyPayload.partners = legacyPayload.stores;
    delete legacyPayload.stores;
  }

  if (legacyPayload.workers) {
    legacyPayload.services = legacyPayload.workers;
    delete legacyPayload.workers;
  }

  return legacyPayload;
}

// ============================================
// LEGACY COMPATIBILITY BRIDGES
// ============================================

/**
 * @deprecated
 * Legacy marketplace snapshot adapter
 * For components not yet migrated to canonical contracts
 */
export function createLegacyMarketplaceBridge(canonicalSnapshot: any): LegacyMarketplaceSnapshot {
  legacyContractWarning('legacy marketplace bridge', 'canonical marketplace snapshot');

  return {
    stores: canonicalSnapshot.partners, // Backward compatibility
    workers: canonicalSnapshot.services, // Backward compatibility
    products: canonicalSnapshot.products,
    hospitals: canonicalSnapshot.hospitals,
    schools: canonicalSnapshot.schools,
  };
}

/**
 * @deprecated
 * Legacy partner data adapter
 * For components not yet migrated to canonical partners
 */
export function createLegacyPartnerBridge(canonicalPartner: any): LegacyPartnerContract {
  legacyContractWarning('legacy partner bridge', 'canonical partner entity');

  return {
    vendor: canonicalPartner, // Backward compatibility
    mobile: canonicalPartner.phone, // Backward compatibility
    image: canonicalPartner.imageUrl, // Backward compatibility
  };
}

// ============================================
// ARCHITECTURAL QUARANTINE MARKERS
// ============================================

/**
 * ARCHITECTURAL LAW:
 *
 * Any file importing from shared/legacy/ MUST contain:
 * - @deprecated annotations
 * - Migration plan comments
 * - Removal timeline
 * - Contact for migration questions
 *
 * VIOLATION = ARCHITECTURAL CRIME
 */

export const LEGACY_QUARANTINE_METADATA = {
  STATUS: 'DEPRECATED',
  QUARANTINE_LEVEL: 'HIGH',
  MIGRATION_PATH: 'Canonical contracts in shared/canonical/',
  REMOVAL_TIMELINE: 'After Vendor → Partner migration complete',
  MAINTAINER: 'BharatOS Sovereign Architecture Council',
  ENFORCEMENT: 'MANDATORY - No new features on legacy contracts',
} as const;