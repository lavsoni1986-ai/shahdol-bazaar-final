// shared/core/sovereign-doctrine.ts
// ============================================
// BHARATOS SOVEREIGN IDENTITY DOCTRINE
// Official Constitution for Architectural Purity
//
// This file is LAW. It defines:
// - Canonical entity truth
// - Forbidden naming patterns
// - Migration doctrine
// - Future governance rules
//
// NO CODE may violate these rules.
// ============================================

// ============================================
// 1. CANONICAL ENTITY TRUTH
// These are the ONLY official entity types in BharatOS
// ============================================

export const SOVEREIGN_ENTITY_DOCTRINE = {
  // Economic/business entity (the sovereign business unit)
  ECONOMIC_ENTITY: 'PARTNER',

  // Geographic/administrative entity
  DISTRICT_ENTITY: 'DISTRICT',

  // Human consumer entity
  USER_ENTITY: 'USER',

  // Economic offering entity
  PRODUCT_ENTITY: 'PRODUCT',

  // Economic transaction entity
  ORDER_ENTITY: 'ORDER',

  // Intelligence memory entity
  REVIEW_ENTITY: 'REVIEW',

  // Service provision entity
  SERVICE_ENTITY: 'SERVICE',
} as const;

export type SovereignEntity = typeof SOVEREIGN_ENTITY_DOCTRINE[keyof typeof SOVEREIGN_ENTITY_DOCTRINE];

// ============================================
// 2. LEGACY ENTITY MAPPINGS
// Official migration path from chaos to canonical
// ============================================

export const LEGACY_ENTITY_MAPPINGS = {
  // All these map to PARTNER (the canonical economic entity)
  vendor: SOVEREIGN_ENTITY_DOCTRINE.ECONOMIC_ENTITY,
  seller: SOVEREIGN_ENTITY_DOCTRINE.ECONOMIC_ENTITY,
  merchant: SOVEREIGN_ENTITY_DOCTRINE.ECONOMIC_ENTITY,
  shop: SOVEREIGN_ENTITY_DOCTRINE.ECONOMIC_ENTITY,
  business: SOVEREIGN_ENTITY_DOCTRINE.ECONOMIC_ENTITY,
  provider: SOVEREIGN_ENTITY_DOCTRINE.ECONOMIC_ENTITY,
  store: SOVEREIGN_ENTITY_DOCTRINE.ECONOMIC_ENTITY,
} as const;

// ============================================
// 3. CANONICAL ID FIELD DOCTRINE
// These are the ONLY allowed ID field names
// ============================================

export const CANONICAL_ID_FIELDS = {
  PARTNER_ID: 'partnerId',
  USER_ID: 'userId',
  DISTRICT_ID: 'districtId',
  PRODUCT_ID: 'productId',
  ORDER_ID: 'orderId',
  REVIEW_ID: 'reviewId',
  SERVICE_ID: 'serviceId',
} as const;

export type CanonicalIdField = typeof CANONICAL_ID_FIELDS[keyof typeof CANONICAL_ID_FIELDS];

// ============================================
// 4. FORBIDDEN NAMING PATTERNS
// These patterns are ILLEGAL in new code
// Existing violations must be migrated
// ============================================

export const FORBIDDEN_ENTITY_PATTERNS = [
  // ID field variations
  'sellerId',
  'merchantId',
  'vendorId',
  'shopId',
  'storeId',
  'businessId',
  'providerId',

  // Slug/route variations
  'sellerSlug',
  'merchantSlug',
  'vendorSlug',
  'shopSlug',
  'storeSlug',
  'businessSlug',

  // Database column variations
  'seller_id',
  'merchant_id',
  'vendor_id',
  'shop_id',
  'store_id',
  'business_id',

  // Type variations
  'sellerType',
  'merchantType',
  'vendorType',
  'shopType',
  'storeType',

  // Legacy route patterns
  '/sellers/',
  '/merchants/',
  '/vendors/',
  '/shops/',
  '/stores/',
  '/businesses/',
] as const;

// ============================================
// 5. ROUTE DOCTRINE
// Canonical routing principles
// ============================================

export const ROUTE_DOCTRINE = {
  // Base routes (no district prefix)
  PARTNER_BASE_ROUTE: '/partner',
  USER_BASE_ROUTE: '/user',
  ADMIN_BASE_ROUTE: '/admin',
  AUTH_BASE_ROUTE: '/auth',

  // District-prefixed routes (require district context)
  DISTRICT_PRODUCTS_ROUTE: '/products',
  DISTRICT_SERVICES_ROUTE: '/services',
  DISTRICT_ORDERS_ROUTE: '/orders',

  // Global routes (never district-prefixed)
  GLOBAL_SEARCH_ROUTE: '/search',
  GLOBAL_DISCOVERY_ROUTE: '/discovery',

  // District prefix enforcement
  DISTRICT_PREFIX_REQUIRED: true,
  GLOBAL_ROUTES_EXEMPT: true,
} as const;

// ============================================
// 6. VALIDATION FUNCTIONS
// Runtime enforcement of doctrine
// ============================================

/**
 * Validates if an entity name follows canonical doctrine
 */
export function isCanonicalEntity(entityName: string): entityName is SovereignEntity {
  return Object.values(SOVEREIGN_ENTITY_DOCTRINE).includes(entityName as SovereignEntity);
}

/**
 * Maps legacy entity names to canonical doctrine
 */
export function resolveToCanonicalEntity(legacyName: string): SovereignEntity | null {
  const canonical = LEGACY_ENTITY_MAPPINGS[legacyName.toLowerCase() as keyof typeof LEGACY_ENTITY_MAPPINGS];
  return canonical || null;
}

/**
 * Checks if a field name violates forbidden patterns
 */
export function isForbiddenFieldName(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return FORBIDDEN_ENTITY_PATTERNS.some(pattern => lowerField.includes(pattern.toLowerCase()));
}

/**
 * Gets the canonical ID field name for an entity
 */
export function getCanonicalIdField(entity: SovereignEntity): CanonicalIdField | null {
  switch (entity) {
    case SOVEREIGN_ENTITY_DOCTRINE.ECONOMIC_ENTITY:
      return CANONICAL_ID_FIELDS.PARTNER_ID;
    case SOVEREIGN_ENTITY_DOCTRINE.USER_ENTITY:
      return CANONICAL_ID_FIELDS.USER_ID;
    case SOVEREIGN_ENTITY_DOCTRINE.DISTRICT_ENTITY:
      return CANONICAL_ID_FIELDS.DISTRICT_ID;
    case SOVEREIGN_ENTITY_DOCTRINE.PRODUCT_ENTITY:
      return CANONICAL_ID_FIELDS.PRODUCT_ID;
    case SOVEREIGN_ENTITY_DOCTRINE.ORDER_ENTITY:
      return CANONICAL_ID_FIELDS.ORDER_ID;
    case SOVEREIGN_ENTITY_DOCTRINE.REVIEW_ENTITY:
      return CANONICAL_ID_FIELDS.REVIEW_ID;
    case SOVEREIGN_ENTITY_DOCTRINE.SERVICE_ENTITY:
      return CANONICAL_ID_FIELDS.SERVICE_ID;
    default:
      return null;
  }
}

// ============================================
// 7. FUTURE EXPANSION AREAS
// These will be added as doctrine evolves
// ============================================

// TODO: Add when tenancy doctrine is formalized
// export const TENANCY_DOCTRINE = { ... }

// TODO: Add when cognition doctrine is formalized
// export const COGNITION_DOCTRINE = { ... }

// TODO: Add when routing doctrine is complete
// export const ROUTING_REGISTRY = { ... }

// ============================================
// 8. DOCTRINE METADATA
// ============================================

export const DOCTRINE_METADATA = {
  VERSION: '1.0.0',
  CREATED: '2026-05-07',
  AUTHORITY: 'BharatOS Sovereign Architecture Council',
  ENFORCEMENT: 'MANDATORY',
  AUDIT_REQUIRED: true,
} as const;

// ============================================
// ARCHITECTURAL LAW
//
// This doctrine serves as:
//
// 1. Migration authority - what to change to what
// 2. Future audit baseline - what is allowed
// 3. Code review checklist - what to reject
// 4. Documentation source - canonical terminology
// 5. Testing boundary - what invariants to enforce
//
// VIOLATIONS OF THIS DOCTRINE ARE ARCHITECTURAL CRIMES.
//
// ============================================