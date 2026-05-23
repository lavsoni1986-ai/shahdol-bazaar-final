// shared/canonical/partner.adapter.ts
// ============================================
// CANONICAL PARTNER ADAPTER LAYER
// Migration insulation architecture for Vendor → Partner transition
//
// This adapter converts legacy entities (vendor, shop, seller, merchant, store)
// into canonical PARTNER shape WITHOUT touching backend yet.
//
// Frontend components consume: CanonicalPartner
// Backend still returns: legacy { vendor: {...} }
//
// This creates MIGRATION DECOUPLING - safe architectural insulation.
// ============================================

// ============================================
// CANONICAL PARTNER INTERFACE
// Sovereign truth shape for economic entities
// ============================================

export interface CanonicalPartner {
  // Core identity (canonical doctrine compliant)
  id: number;
  slug: string;
  name: string;
  type: string;
  districtId: number;

  // Contact information
  phone?: string | null;
  email?: string | null;
  address?: string | null;

  // Digital presence
  imageUrl?: string | null;
  logo?: string | null;

  // Trust & verification
  isVerified?: boolean;
  dsslScore?: number;
  rating?: number;
  avgRating?: number;
  reviewCount?: number;

  // Business attributes
  category?: string;
  description?: string;
  status?: string;

  // Migration tracking (preserves legacy IDs for data integrity)
  legacyVendorId?: number;
  legacyShopId?: number;
  legacySellerId?: number;
  legacyMerchantId?: number;
  legacyStoreId?: number;

  // Source metadata (for debugging/auditing)
  dataSource: 'vendor' | 'shop' | 'seller' | 'merchant' | 'store' | 'unknown';
}

// ============================================
// LEGACY FIELD MAPPINGS
// Maps chaotic legacy fields to canonical partner fields
// ============================================

const LEGACY_FIELD_MAPPINGS = {
  // Identity mappings
  vendorId: 'legacyVendorId',
  shopId: 'legacyShopId',
  sellerId: 'legacySellerId',
  merchantId: 'legacyMerchantId',
  storeId: 'legacyStoreId',

  // Field name normalization
  mobile: 'phone',           // vendor.mobile → phone
  phoneNumber: 'phone',      // shop.phoneNumber → phone
  contactNumber: 'phone',    // seller.contactNumber → phone

  image: 'imageUrl',         // shop.image → imageUrl
  logoUrl: 'logo',           // vendor.logoUrl → logo
  photo: 'imageUrl',         // store.photo → imageUrl

  categoryName: 'category',  // shop.categoryName → category
  businessType: 'type',      // vendor.businessType → type
  sellerType: 'type',        // seller.sellerType → type

  description: 'description', // Universal mapping
  address: 'address',         // Universal mapping
  email: 'email',             // Universal mapping

  // Trust mappings
  trustScore: 'dsslScore',    // vendor.trustScore → dsslScore
  score: 'dsslScore',         // shop.score → dsslScore
  rating: 'avgRating',        // Universal rating mapping
} as const;

// ============================================
// CANONICAL PARTNER NORMALIZER
// Converts any legacy entity into CanonicalPartner
// ============================================

export function normalizePartnerEntity(entity: any): CanonicalPartner {
  if (!entity) {
    throw new Error('Cannot normalize null/undefined entity to CanonicalPartner');
  }

  // Determine data source for debugging
  const dataSource = detectDataSource(entity);

  // Create canonical partner with defensive fallbacks
  const canonical: CanonicalPartner = {
    // Core identity (required fields with fallbacks)
    id: entity.id || entity.vendorId || entity.shopId || entity.sellerId || entity.merchantId || entity.storeId || 0,
    slug: entity.slug || generateFallbackSlug(entity),
    name: entity.name || entity.title || entity.businessName || 'Unnamed Partner',
    type: entity.type || entity.businessType || entity.category || 'SERVICE',
    districtId: entity.districtId || entity.district_id || 1,

    // Contact information
    phone: normalizePhone(entity),
    email: entity.email || null,
    address: entity.address || entity.location || null,

    // Digital presence
    imageUrl: normalizeImageUrl(entity),
    logo: entity.logo || entity.logoUrl || null,

    // Trust & verification
    isVerified: entity.isVerified ?? entity.approved ?? entity.verified ?? false,
    dsslScore: entity.dsslScore ?? entity.trustScore ?? entity.score ?? 70,
    rating: entity.rating ?? entity.avgRating ?? null,
    avgRating: entity.avgRating ?? entity.rating ?? null,
    reviewCount: entity.reviewCount ?? 0,

    // Business attributes
    category: entity.category || entity.categoryName || null,
    description: entity.description || null,
    status: entity.status || 'ACTIVE',

    // Legacy ID preservation (critical for data integrity)
    legacyVendorId: entity.vendorId || entity.id,
    legacyShopId: entity.shopId,
    legacySellerId: entity.sellerId,
    legacyMerchantId: entity.merchantId,
    legacyStoreId: entity.storeId,

    // Source tracking
    dataSource,
  };

  return canonical;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function detectDataSource(entity: any): CanonicalPartner['dataSource'] {
  if (entity.vendorId || entity.dsslScore || entity.businessType) return 'vendor';
  if (entity.shopId || entity.approved) return 'shop';
  if (entity.sellerId || entity.contactNumber) return 'seller';
  if (entity.merchantId) return 'merchant';
  if (entity.storeId || entity.photo) return 'store';
  return 'unknown';
}

function normalizePhone(entity: any): string | null {
  return entity.phone ||
         entity.mobile ||
         entity.phoneNumber ||
         entity.contactNumber ||
         null;
}

function normalizeImageUrl(entity: any): string | null {
  return entity.imageUrl ||
         entity.image ||
         entity.photo ||
         entity.logoUrl ||
         entity.logo ||
         null;
}

function generateFallbackSlug(entity: any): string {
  const baseName = entity.name || entity.title || entity.businessName || 'partner';
  return baseName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50);
}

// ============================================
// BATCH NORMALIZATION
// For arrays of legacy entities
// ============================================

export function normalizePartnerEntities(entities: any[]): CanonicalPartner[] {
  return entities.map(normalizePartnerEntity);
}

// ============================================
// LEGACY COMPATIBILITY HELPERS
// Temporary bridges during migration
// ============================================

export function createLegacyBridge(partner: CanonicalPartner) {
  // Create a legacy-compatible object for gradual migration
  return {
    // Legacy vendor shape
    vendor: {
      id: partner.legacyVendorId || partner.id,
      name: partner.name,
      slug: partner.slug,
      phone: partner.phone,
      imageUrl: partner.imageUrl,
      category: partner.category,
      isVerified: partner.isVerified,
      dsslScore: partner.dsslScore,
    },

    // Legacy shop shape
    shop: partner.legacyShopId ? {
      id: partner.legacyShopId,
      name: partner.name,
      slug: partner.slug,
      phone: partner.phone,
      image: partner.imageUrl,
      category: partner.category,
      isVerified: partner.isVerified,
    } : null,

    // Canonical shape
    partner,
  };
}

// ============================================
// VALIDATION & SANITY CHECKS
// ============================================

export function validateCanonicalPartner(partner: CanonicalPartner): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!partner.id || partner.id <= 0) {
    errors.push('Invalid partner ID');
  }

  if (!partner.name || partner.name.trim().length === 0) {
    errors.push('Missing partner name');
  }

  if (!partner.slug || partner.slug.trim().length === 0) {
    errors.push('Missing partner slug');
  }

  if (!partner.districtId || partner.districtId <= 0) {
    errors.push('Invalid district ID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// MIGRATION METADATA
// ============================================

export const PARTNER_ADAPTER_METADATA = {
  VERSION: '1.0.0',
  CREATED: '2026-05-07',
  PURPOSE: 'Migration insulation layer for Vendor → Partner transition',
  STRATEGY: 'Boundary normalization without backend changes',
  SAFETY_LEVEL: 'HIGH',
} as const;