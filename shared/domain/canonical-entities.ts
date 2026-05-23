// shared/domain/canonical-entities.ts
// ============================================
// BHARATOS DATA CONTRACT STABILIZATION
// Canonical entity definitions to eliminate chaos
// ============================================

// 🎯 CANONICAL ENTITIES
// These are the official entity types used across BharatOS

export const ENTITY_TYPES = {
  PARTNER: 'PARTNER',  // Canonical term for all business entities
  PRODUCT: 'PRODUCT',
  ORDER: 'ORDER',
  USER: 'USER',
  DISTRICT: 'DISTRICT',
  REVIEW: 'REVIEW'
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];

// 🔄 LEGACY ALIASES (DEPRECATED)
// Map old chaotic terms to canonical ones
// TODO: Gradually migrate all code to use canonical terms

export const LEGACY_ENTITY_ALIASES = {
  // Partner aliases
  VENDOR: ENTITY_TYPES.PARTNER,
  MERCHANT: ENTITY_TYPES.PARTNER,
  SELLER: ENTITY_TYPES.PARTNER,
  SHOP: ENTITY_TYPES.PARTNER,
  PROVIDER: ENTITY_TYPES.PARTNER,
  BUSINESS: ENTITY_TYPES.PARTNER,

  // Product aliases
  ITEM: ENTITY_TYPES.PRODUCT,
  SERVICE: ENTITY_TYPES.PRODUCT,
  OFFERING: ENTITY_TYPES.PRODUCT,

  // Order aliases
  PURCHASE: ENTITY_TYPES.ORDER,
  TRANSACTION: ENTITY_TYPES.ORDER,
  BOOKING: ENTITY_TYPES.ORDER,

  // User aliases
  CUSTOMER: ENTITY_TYPES.USER,
  BUYER: ENTITY_TYPES.USER,
  CLIENT: ENTITY_TYPES.USER,

  // District aliases
  REGION: ENTITY_TYPES.DISTRICT,
  AREA: ENTITY_TYPES.DISTRICT,
  ZONE: ENTITY_TYPES.DISTRICT
} as const;

// 🎭 DISPLAY NAMES
// Human-readable names for canonical entities

export const ENTITY_DISPLAY_NAMES = {
  [ENTITY_TYPES.PARTNER]: 'Partner',
  [ENTITY_TYPES.PRODUCT]: 'Product',
  [ENTITY_TYPES.ORDER]: 'Order',
  [ENTITY_TYPES.USER]: 'User',
  [ENTITY_TYPES.DISTRICT]: 'District',
  [ENTITY_TYPES.REVIEW]: 'Review'
} as const;

// 🔍 VALIDATION HELPERS

export function isCanonicalEntityType(type: string): type is EntityType {
  return Object.values(ENTITY_TYPES).includes(type as EntityType);
}

export function resolveEntityType(legacyOrCanonical: string): EntityType | null {
  // First check if it's already canonical
  if (isCanonicalEntityType(legacyOrCanonical)) {
    return legacyOrCanonical as EntityType;
  }

  // Check legacy aliases
  const canonical = LEGACY_ENTITY_ALIASES[legacyOrCanonical as keyof typeof LEGACY_ENTITY_ALIASES];
  if (canonical) {
    console.warn(`⚠️ Using deprecated entity alias '${legacyOrCanonical}', prefer '${canonical}'`);
    return canonical;
  }

  return null;
}

export function getEntityDisplayName(type: EntityType): string {
  return ENTITY_DISPLAY_NAMES[type] || type;
}

// 📋 FIELD MAPPINGS
// Canonical field names for consistent API responses

export const CANONICAL_FIELD_NAMES = {
  // Identity
  id: 'id',
  name: 'name',  // NOT title
  slug: 'slug',

  // Contact
  phone: 'phone',  // NOT mobile
  email: 'email',

  // Location
  address: 'address',

  // Business
  category: 'category',

  // Pricing
  price: 'price',  // NOT fare, cost

  // Status
  status: 'status',
  isActive: 'isActive',

  // Timestamps
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
} as const;

// 🔄 LEGACY FIELD ALIASES (DEPRECATED)

export const LEGACY_FIELD_ALIASES = {
  title: CANONICAL_FIELD_NAMES.name,
  mobile: CANONICAL_FIELD_NAMES.phone,
  fare: CANONICAL_FIELD_NAMES.price,
  cost: CANONICAL_FIELD_NAMES.price,
  active: CANONICAL_FIELD_NAMES.isActive
} as const;

export function resolveFieldName(legacyOrCanonical: string): string {
  return LEGACY_FIELD_ALIASES[legacyOrCanonical as keyof typeof LEGACY_FIELD_ALIASES] || legacyOrCanonical;
}