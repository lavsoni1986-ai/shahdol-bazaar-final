/**
 * SOVEREIGN ROUTE BUILDER
 * Centralized API route definitions.
 * Every frontend route must go through this module.
 * NO hardcoded route drift allowed.
 */

export const sovereignApiRoutes = {
  /** Auth */
  auth: {
    verify: () => "/auth/verify",
    login: () => "/auth/login",
    register: () => "/auth/register",
    logout: () => "/auth/logout",
    refresh: () => "/auth/refresh",
  },

  /** Marketplace — vendor/store routes */
  marketplace: {
    stores: (params?: { limit?: number; category?: string }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.category) query.set("category", params.category);
      const qs = query.toString();
      return `/marketplace/stores${qs ? `?${qs}` : ""}`;
    },
    storeBySlug: (slug: string) => `/marketplace/stores/${slug}`,
    /** ✅ SOVEREIGN: Canonical vendor-by-ID route */
    vendorById: (id: number | string) => `/marketplace/vendors/id/${id}`,
    products: (vendorId?: number) => {
      if (vendorId) return `/marketplace/products?vendorId=${vendorId}`;
      return "/marketplace/products";
    },
    productById: (id: number | string) => `/marketplace/products/${id}`,
    productBySlug: (slug: string) => `/marketplace/products/slug/${slug}`,
    reviews: (productId?: number) => {
      if (productId) return `/marketplace/reviews?productId=${productId}`;
      return "/marketplace/reviews";
    },
  },

  /** Orders */
  orders: {
    create: () => "/orders",
    list: () => "/orders",
  },

  /** District */
  districts: {
    list: () => "/districts",
    bySlug: (slug: string) => `/districts/${slug}`,
  },

  /** Analytics */
  analytics: {
    track: () => "/analytics/track",
  },

  /** Health */
  health: () => "/health",
} as const;

/**
 * Frontend route constants
 */
export const frontendRoutes = {
  home: () => "/",
  checkout: () => "/checkout",
  cart: () => "/cart",
  orderSuccess: (id?: string | number) => id ? `/order-success?id=${id}` : "/order-success",
  auth: (mode?: string) => mode ? `/auth?mode=${mode}` : "/auth",
  shopDetail: (slug: string) => `/marketplace/stores/${slug}`,
  productDetail: (slug: string) => `/marketplace/products/${slug}`,
  customerDashboard: () => "/customer-dashboard",
  partnerDashboard: () => "/partner/dashboard",
  admin: () => "/admin",
} as const;

export const authRoutes = {
  home: () => "/auth",
  partnerRegister: () => "/auth?role=partner&mode=register",
};

// ─── BACKWARD COMPATIBILITY ALIASES ───
// Pre-existing code imports these from sovereign-routes.ts
// DO NOT remove until all consumers migrate to sovereignApiRoutes/frontendRoutes

/**
 * @deprecated Use sovereignApiRoutes.marketplace or frontendRoutes instead
 */
export const partnerRoutes = {
  profile: (districtSlug: string, slug: string) => {
    if (slug.startsWith("http")) return slug;
    return `/marketplace/stores/${slug}`;
  },
};

/**
 * @deprecated Use sovereignApiRoutes.marketplace or frontendRoutes instead
 */
export const productRoutes = {
  detail: (districtSlug: string, slug: string | number) => {
    return `/marketplace/products/${slug}`;
  },
};

/**
 * @deprecated Use frontendRoutes or sovereignApiRoutes instead
 */
export const serviceRoutes = {};

/**
 * @deprecated Use a district context or route param instead
 * Returns 'shahdol' as default for backward compatibility
 */
export function getCurrentDistrictSlug(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("currentDistrictSlug");
    if (stored) return stored;
    const path = window.location.pathname;
    const match = path.match(/^\/([^/]+)/);
    if (match) return match[1];
  }
  return "shahdol";
}

/**
 * @deprecated Routes have been consolidated into sovereignApiRoutes.
 * Legacy redirect methods for backward compatibility.
 */
export const legacyRoutes = {
  vendor: (districtSlug: string, entitySlug: string) => `/marketplace/stores/${entitySlug}`,
  store: (districtSlug: string, entitySlug: string) => `/marketplace/stores/${entitySlug}`,
  seller: (districtSlug: string, entitySlug: string) => `/marketplace/stores/${entitySlug}`,
  merchant: (districtSlug: string, entitySlug: string) => `/marketplace/stores/${entitySlug}`,
};

/**
 * Builds canonical route dynamically for any entity, avoiding circular dependencies.
 */
export function buildCanonicalRoute(input: {
  entityKind: string;
  slug?: string | null;
  id?: string | number | null;
  districtSlug?: string;
}): string {
  const identifier = input.slug || (input.id != null ? String(input.id) : '');
  if (!identifier) return '/marketplace';

  const kind = input.entityKind.toLowerCase();
  switch (kind) {
    case 'product':
      return `/marketplace/products/${identifier}`;
    case 'service':
      return `/services/${identifier}`;
    case 'professional':
      return `/professionals/${identifier}`;
    case 'healthcare':
    case 'hospital':
      return `/healthcare/${identifier}`;
    case 'booking':
      return `/bookings/${identifier}`;
    case 'education':
    case 'school':
      return `/schools/${identifier}`;
    case 'restaurant':
      return `/restaurants/${identifier}`;
    case 'emergency':
      return `/emergency/${identifier}`;
    case 'marketplace':
    case 'partner':
    default:
      return `/marketplace/stores/${identifier}`;
  }
}

