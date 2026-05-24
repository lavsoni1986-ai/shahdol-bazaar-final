// shared/api/response-normalizers.ts
// ============================================
// API RESPONSE NORMALIZATION LAYER
// BharatOS Canonical Frontend Contracts
//
// Transforms raw backend responses into:
// SOVEREIGN CANONICAL FRONTEND CONTRACTS
//
// Backend may return: { vendor: {...}, mobile: "..." }
// Frontend receives:  { partner: {...}, phone: "..." }
//
// This creates MIGRATION DECOUPLING - frontend evolves independently.
// ============================================

import { normalizePartnerEntity, type CanonicalPartner } from "../canonical/partner.adapter";
import { getCurrentDistrictSlug } from "../routing/sovereign-routes";
import { resolveEntityRoute } from "../../governance/entity-route-resolver";

export type CanonicalEntityKind = 'partner' | 'hospital' | 'school' | 'service' | 'product';

export interface CanonicalEntity {
  id: number;
  slug: string;
  kind: CanonicalEntityKind;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  dsslScore?: number | null;
  price?: number | null;
  isVerified?: boolean;
  route: string;
  raw: any;
}

function detectEntityKind(entity: any, hint?: CanonicalEntityKind): CanonicalEntityKind {
  if (hint) return hint;

  const type = (entity.type || entity.serviceType || entity.businessType || entity.category || '').toString().toLowerCase();
  const category = (entity.category || entity.businessType || entity.type || '').toString().toLowerCase();
  const name = (entity.name || entity.title || '').toString().toLowerCase();

  if (type === 'product' || entity.price != null || entity.mrp != null) {
    return 'product';
  }

  if (type === 'service' || category === 'service' || category === 'services' || type === 'worker') {
    return 'service';
  }

  if (type === 'hospital' || category.includes('hospital') || name.includes('hospital') || category.includes('clinic')) {
    return 'hospital';
  }

  if (type === 'school' || category.includes('school') || category.includes('college') || category.includes('education')) {
    return 'school';
  }

  return 'partner';
}

function normalizeEntitySlug(entity: any): string {
  if (entity.slug) {
    return String(entity.slug);
  }

  const candidate = String(entity.name || entity.title || entity.productName || entity.schoolName || entity.businessName || 'entity');
  return candidate
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || String(entity.id || Date.now());
}

function buildEntityRoute(kind: CanonicalEntityKind, districtSlug: string, slug: string): string {
  if (!districtSlug) {
    districtSlug = getCurrentDistrictSlug();
  }

  // Map CanonicalEntityKind to ResolvableEntityKind
  const kindMap: Record<string, string> = {
    product: 'product',
    service: 'service',
    hospital: 'healthcare',
    school: 'education',
    partner: 'marketplace',
  };

  const result = resolveEntityRoute({
    entityKind: (kindMap[kind] || 'marketplace') as any,
    slug,
    districtSlug,
  });

  return result.href;
}

export function normalizeCanonicalEntity(entity: any, districtSlug?: string, kindHint?: CanonicalEntityKind): CanonicalEntity {
  if (!entity) {
    throw new Error('Cannot normalize empty entity to canonical entity');
  }

  const kind = detectEntityKind(entity, kindHint);
  const slug = normalizeEntitySlug(entity);
  const category = typeof entity.category === 'string'
    ? entity.category
    : entity.category?.name || entity.category?.title || null;

  return {
    id: (() => {
      const raw =
        entity.id ??
        entity.productId ??
        entity.serviceId ??
        entity.vendorId ??
        entity.shopId ??
        entity.sellerId ??
        entity.merchantId ??
        entity.storeId;

      if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
        return raw;
      }

      if (
        typeof raw === "string" &&
        /^\d+$/.test(raw)
      ) {
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0
          ? parsed
          : 0;
      }

      return 0;
    })(),
    slug,
    kind,
    title: String(entity.name || entity.title || entity.productName || entity.schoolName || entity.businessName || entity.serviceName || 'Untitled'),
    subtitle: entity.vendor?.name || entity.shopName || entity.businessName || entity.type || null,
    description: entity.description || entity.summary || entity.about || entity.details || null,
    category,
    imageUrl: entity.imageUrl || entity.image || entity.logo || entity.photo || entity.thumbnail || null,
    phone: entity.phone || entity.mobile || entity.contactNumber || entity.phoneNumber || null,
    address: entity.address || entity.location || entity.city || entity.vicinity || null,
    rating: entity.rating ?? entity.avgRating ?? null,
    reviewCount: entity.reviewCount ?? entity.reviews?.length ?? null,
    dsslScore: entity.dsslScore ?? entity.trustScore ?? null,
    price: entity.price ?? entity.fare ?? entity.fees ?? null,
    isVerified: entity.isVerified ?? entity.approved ?? false,
    route: buildEntityRoute(kind, districtSlug || getCurrentDistrictSlug(), slug),
    raw: entity,
  };
}

export function normalizeCanonicalEntities(entities: any[], districtSlug?: string, kindHint?: CanonicalEntityKind): CanonicalEntity[] {
  return Array.isArray(entities)
    ? entities.map(entity => normalizeCanonicalEntity(entity, districtSlug, kindHint))
    : [];
}

export interface CanonicalDistrictSnapshot {
  // District metadata
  district: {
    slug: string;
    name: string;
    state: string;
    locale?: string;
    timezone?: string;
  };

  // Entities organized by kind (new grouping structure)
  entities: {
    partners: CanonicalEntity[];
    products: CanonicalEntity[];
    services: CanonicalEntity[];
    hospitals: CanonicalEntity[];
    schools: CanonicalEntity[];
    buses: CanonicalEntity[];
  };

  // Featured/curated entities
  featured: CanonicalEntity[];

  // Trending entities (high engagement)
  trending: CanonicalEntity[];

  // Personalized recommendations
  recommendations: CanonicalEntity[];

  // Category metadata
  categories: {
    id: string | number;
    name: string;
    slug: string;
    icon?: string;
    count?: number;
    children?: { id: string | number; name: string; slug: string }[];
  }[];

  // District intelligence/metadata
  intelligence: {
    totalPartners: number;
    totalProducts: number;
    totalServices: number;
    totalHospitals: number;
    totalSchools: number;
    avgRating?: number;
    totalReviews?: number;
    avgDsslScore?: number;
    verifiedCount?: number;
    updatedAt?: string;
  };

  // Backward compatibility (computed-like getters)
  partners: CanonicalEntity[];
  products: CanonicalEntity[];
  services: CanonicalEntity[];
  hospitals: CanonicalEntity[];
  schools: CanonicalEntity[];
  allEntities: CanonicalEntity[];

  [key: string]: any;
}

function normalizeRecommendationEntities(items: any[], districtSlug?: string): CanonicalEntity[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item: any) => {
      if (item && typeof item === 'object') {
        return normalizeCanonicalEntity(item, districtSlug);
      }
      if (typeof item === 'string' || typeof item === 'number') {
        return normalizeCanonicalEntity({ id: item, name: String(item) }, districtSlug, 'partner');
      }
      return null;
    })
    .filter(Boolean) as CanonicalEntity[];
}

export function normalizeDistrictSnapshot(rawResponse: any): CanonicalDistrictSnapshot {
  const payload = rawResponse?.data ?? rawResponse ?? {};
  const districtSlug = payload.districtSlug || getCurrentDistrictSlug();

  // Normalize core entity types
  const partners = normalizeCanonicalEntities(
    [...(Array.isArray(payload.stores) ? payload.stores : []),
    ...(Array.isArray(payload.vendors) ? payload.vendors : []),
    ...(Array.isArray(payload.shops) ? payload.shops : [])],
    districtSlug,
    'partner'
  );

  const products = normalizeCanonicalEntities(payload.products || [], districtSlug, 'product');
  const services = normalizeCanonicalEntities(payload.services || payload.workers || [], districtSlug, 'service');
  const hospitals = normalizeCanonicalEntities(payload.hospitals || [], districtSlug, 'hospital');
  const schools = normalizeCanonicalEntities(payload.schools || [], districtSlug, 'school');
  const buses = normalizeCanonicalEntities(payload.buses || [], districtSlug, 'partner');

  // Normalize recommendations
  const recommendations = normalizeRecommendationEntities(
    payload.recommendations || payload.recommendedEntities || payload.recommendedStores || [],
    districtSlug,
  );

  // Normalize featured/curated entities
  const featured = normalizeRecommendationEntities(
    payload.featured || payload.curated || payload.highlights || [],
    districtSlug,
  );

  // Normalize trending entities
  const trending = normalizeRecommendationEntities(
    payload.trending || payload.popular || payload.hot || payload.topRated || [],
    districtSlug,
  );

  // Normalize categories
  const categories = (payload.categories || payload.categoryList || []).map((cat: any) => ({
    id: cat.id || cat.categoryId,
    name: cat.name || cat.title,
    slug: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-'),
    icon: cat.icon || cat.iconUrl || cat.imageUrl,
    count: cat.count || cat.entityCount || cat.total,
    children: (cat.children || cat.subcategories || []).map((child: any) => ({
      id: child.id || child.categoryId,
      name: child.name || child.title,
      slug: child.slug || child.name?.toLowerCase().replace(/\s+/g, '-'),
    })),
  }));

  // Build entities object
  const entities = { partners, products, services, hospitals, schools, buses };

  // Compute allEntities for backward compatibility
  const allEntities = [
    ...partners,
    ...products,
    ...services,
    ...hospitals,
    ...schools,
    ...buses,
    ...recommendations,
  ];

  // Compute intelligence metrics
  const allEntitiesFlat = [...partners, ...products, ...services, ...hospitals, ...schools, ...buses];
  const verifiedCount = allEntitiesFlat.filter(e => e.isVerified).length;

  const ratings = allEntitiesFlat
    .map(e => e.rating)
    .filter((r): r is number => typeof r === 'number' && r > 0);

  const dsslScores = allEntitiesFlat
    .map(e => e.dsslScore)
    .filter((s): s is number => typeof s === 'number' && s > 0);

  const reviewCounts = allEntitiesFlat
    .map(e => e.reviewCount)
    .filter((c): c is number => typeof c === 'number' && c > 0);

  const intelligence = {
    totalPartners: partners.length,
    totalProducts: products.length,
    totalServices: services.length,
    totalHospitals: hospitals.length,
    totalSchools: schools.length,
    totalBuses: buses.length,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined,
    totalReviews: reviewCounts.length ? reviewCounts.reduce((a, b) => a + b, 0) : undefined,
    avgDsslScore: dsslScores.length ? dsslScores.reduce((a, b) => a + b, 0) / dsslScores.length : undefined,
    verifiedCount,
    updatedAt: payload.updatedAt || payload.lastUpdated || new Date().toISOString(),
  };

  // District metadata
  const district = {
    slug: districtSlug,
    name: payload.districtName || payload.district?.name || payload.name || '',
    state: payload.state || payload.district?.state || '',
    locale: payload.locale || payload.language || 'en',
    timezone: payload.timezone || 'Asia/Kolkata',
  };

  return {
    district,
    entities,
    featured,
    trending,
    recommendations,
    categories,
    intelligence,
    // Backward compatibility: expose individual arrays at top level
    partners,
    products,
    services,
    hospitals,
    schools,
    buses,
    allEntities,
    // Preserve raw payload
    raw: payload,
  };
}

// ============================================
// MARKETPLACE SNAPSHOT NORMALIZATION
// ============================================

/**
 * Normalizes marketplace home snapshot response
 * Transforms: stores/vendors/shops → partners
 */
export function normalizeMarketplaceSnapshot(rawResponse: any): CanonicalMarketplaceSnapshot {
  if (!rawResponse?.data) {
    return { partners: [], products: [], services: [], hospitals: [] };
  }

  const data = rawResponse.data;

  // Transform stores/vendors/shops into canonical partners
  const partners: CanonicalPartner[] = [];

  // Handle different backend payload shapes
  if (data.stores && Array.isArray(data.stores)) {
    // Legacy: stores array
    data.stores.forEach((store: any) => {
      const partner = normalizePartnerEntity(store);
      partners.push(partner);
    });
  }

  if (data.vendors && Array.isArray(data.vendors)) {
    // Legacy: vendors array
    data.vendors.forEach((vendor: any) => {
      const partner = normalizePartnerEntity(vendor);
      partners.push(partner);
    });
  }

  if (data.shops && Array.isArray(data.shops)) {
    // Legacy: shops array
    data.shops.forEach((shop: any) => {
      const partner = normalizePartnerEntity(shop);
      partners.push(partner);
    });
  }

  // Normalize products
  const products = normalizeProducts(data.products || []);

  // Normalize services
  const services = normalizeServices(data.services || data.workers || []);

  // Normalize hospitals (usually already canonical)
  const hospitals = data.hospitals || [];

  return {
    partners,
    products,
    services,
    hospitals,
    // Preserve any additional fields
    ...data
  };
}

// ============================================
// PRODUCT RESPONSE NORMALIZATION
// ============================================

/**
 * Normalizes product detail response
 * Transforms: product.vendor → product.partner
 */
export function normalizeProductResponse(rawResponse: any): CanonicalProductResponse {
  if (!rawResponse?.data) {
    throw new Error('Invalid product response');
  }

  const product = rawResponse.data;

  // Normalize the vendor/shop reference to canonical partner
  let partner: CanonicalPartner | null = null;

  if (product.vendor) {
    partner = normalizePartnerEntity(product.vendor);
  } else if (product.shop) {
    partner = normalizePartnerEntity(product.shop);
  } else if (product.seller) {
    partner = normalizePartnerEntity(product.seller);
  } else if (product.merchant) {
    partner = normalizePartnerEntity(product.merchant);
  } else if (product.store) {
    partner = normalizePartnerEntity(product.store);
  }

  // Create canonical product structure
  const canonicalProduct = {
    id: product.id,
    name: product.name || product.title,
    slug: product.slug,
    price: product.price,
    mrp: product.mrp,
    description: product.description,
    imageUrl: product.imageUrl || product.image,
    category: product.category,
    isAvailable: product.isAvailable ?? true,
    rating: product.rating,
    reviewCount: product.reviewCount || 0,
    // Canonical partner reference
    partner,
    // Preserve legacy fields for compatibility
    legacyVendorId: product.vendorId || product.vendor?.id,
    legacyShopId: product.shopId || product.shop?.id,
  };

  return {
    success: true,
    data: canonicalProduct,
  };
}

// ============================================
// PARTNER RESPONSE NORMALIZATION
// ============================================

/**
 * Normalizes partner detail response
 * Transforms: vendor/shop/seller → canonical partner
 */
export function normalizePartnerResponse(rawResponse: any): CanonicalPartnerResponse {
  if (!rawResponse?.data) {
    throw new Error('Invalid partner response');
  }

  const partner = normalizePartnerEntity(rawResponse.data);

  return {
    success: true,
    data: partner,
  };
}

// ============================================
// AUTH RESPONSE NORMALIZATION
// ============================================

/**
 * Normalizes authentication response
 * Transforms: SELLER/VENDOR/MERCHANT → PARTNER role semantics
 */
export function normalizeAuthResponse(rawResponse: any): CanonicalAuthResponse {
  if (!rawResponse?.data) {
    return rawResponse; // Pass through if no data
  }

  const user = rawResponse.data;

  // Normalize role semantics
  let canonicalRole = user.role;

  if (['SELLER', 'VENDOR', 'MERCHANT', 'STORE', 'SHOP'].includes(user.role?.toUpperCase())) {
    canonicalRole = 'PARTNER';
  }

  // Normalize user object
  const canonicalUser = {
    ...user,
    role: canonicalRole,
    // Preserve legacy role for compatibility
    legacyRole: user.role,
  };

  return {
    ...rawResponse,
    data: canonicalUser,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeProducts(products: any[]): CanonicalProduct[] {
  return products.map(product => ({
    id: product.id,
    name: product.name || product.title,
    slug: product.slug,
    price: product.price,
    imageUrl: product.imageUrl || product.image,
    category: product.category,
  }));
}

function normalizeServices(services: any[]): CanonicalService[] {
  return services.map(service => ({
    id: service.id,
    name: service.name || service.title,
    type: service.type || service.serviceType,
    phone: service.phone || service.mobile || service.contactNumber,
    imageUrl: service.imageUrl || service.image || service.photo,
    category: service.category,
    rating: service.rating,
    isAvailable: service.isAvailable ?? true,
  }));
}

// ============================================
// CANONICAL RESPONSE TYPES
// ============================================

export interface CanonicalMarketplaceSnapshot {
  partners: CanonicalPartner[];
  products: CanonicalProduct[];
  services: CanonicalService[];
  hospitals: any[];
  [key: string]: any; // Preserve additional fields
}

export interface CanonicalProductResponse {
  success: boolean;
  data: CanonicalProduct;
}

export interface CanonicalPartnerResponse {
  success: boolean;
  data: CanonicalPartner;
}

export interface CanonicalAuthResponse {
  success?: boolean;
  data?: any;
  [key: string]: any;
}

export interface CanonicalProduct {
  id: number;
  name: string;
  slug: string;
  price?: number;
  imageUrl?: string;
  category?: string;
}

export interface CanonicalService {
  id: number;
  name: string;
  type: string;
  phone?: string;
  imageUrl?: string;
  category?: string;
  rating?: number;
  isAvailable: boolean;
}

// ============================================
// NORMALIZATION PIPELINE
// ============================================

/**
 * Applies all relevant normalizations to an API response
 */
export function normalizeApiResponse(endpoint: string, rawResponse: any): any {
  // Route-based normalization
  if (endpoint.includes('/marketplace/home-snapshot')) {
    return normalizeMarketplaceSnapshot(rawResponse);
  }

  if (endpoint.includes('/marketplace/products/') && !endpoint.includes('/marketplace/products?')) {
    return normalizeProductResponse(rawResponse);
  }

  if (endpoint.includes('/marketplace/vendors/') || endpoint.includes('/marketplace/stores/')) {
    return normalizePartnerResponse(rawResponse);
  }

  if (endpoint.includes('/auth/')) {
    return normalizeAuthResponse(rawResponse);
  }

  // Return unchanged if no normalization needed
  return rawResponse;
}

// ============================================
// COMPATIBILITY BRIDGE
// ============================================

/**
 * Creates legacy-compatible response for gradual migration
 */
export function createCompatibilityBridge(canonicalResponse: any, legacyFormat: 'vendor' | 'shop' | 'store' | 'seller' | 'merchant' = 'vendor') {
  // This would create a legacy-shaped response from canonical data
  // For gradual migration of components that haven't been updated yet
  return {
    legacy: canonicalResponse,
    canonical: canonicalResponse,
  };
}

// ============================================
// NORMALIZATION METADATA
// ============================================

export const NORMALIZATION_METADATA = {
  VERSION: '1.0.0',
  CREATED: '2026-05-07',
  PURPOSE: 'API response normalization for migration decoupling',
  STRATEGY: 'Frontend canonical contracts while backend evolves',
  SAFETY_LEVEL: 'HIGH - No backend changes required',
} as const;