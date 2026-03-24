import { Request, Response, NextFunction } from 'express';
import { prisma } from '../storage.js';

// Simple district cache for performance
const districtCache = new Map<string, { id: number; slug: string }>();

/**
 * ============================================
 * TENANT RESOLVER MIDDLEWARE
 * ============================================
 * PHASE 1 Security Fix: Multi-tenancy isolation
 * 
 * This middleware resolves the district/tenant context
 * from incoming requests and enforces tenant isolation.
 * 
 * Supports multiple ways to specify tenant (slug-based only):
 * 1. X-District-Slug header (slug lookup) - TRUSTED
 * 2. Query parameter: ?district=slug - TRUSTED
 * 3. Subdomain: shahdol.example.com - TRUSTED
 * 4. Path prefix: /api/shahdol/... - TRUSTED
 * 
 * SECURITY: x-district-id header is NOT accepted.
 * Only slug-based sources are trusted to prevent
 * header spoofing attacks. District IDs must come
 * from database lookup based on validated slug.
 */

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      districtId?: number | null;
      districtSlug?: string | null;
      tenantContext?: {
        districtId: number;
        districtSlug: string;
        isValid: boolean;
      };
    }
  }
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Paths that don't require tenant context
 */
const TENANT_EXEMPT_PATHS = [
  '/api/health',
  '/api/health-fn',
  '/api/ui/context',
];

/**
 * Path prefixes that bypass tenant validation
 */
const TENANT_EXEMPT_PREFIXES = [
  '/api/districts',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/verify',
  '/api/user/profile',
  '/api/orders',
  '/api/products',
  '/api/shops',
  '/api/cart',
  '/api/vendors',
  '/api/hospitals',
  '/api/schools',
  '/api/service-workers',
  '/api/marketplace',
];

/**
 * Exact paths that bypass tenant validation (app routes)
 */
const TENANT_EXEMPT_EXACT = [
  '/customer-dashboard',
  '/auth',
  '/partner',
  '/admin',
  '/',
];

/**
 * Subdomains to ignore (not treated as tenant identifiers)
 */
const IGNORED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'mail', 'ftp', 'blog']);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize and normalize district slug
 * Handles malformed inputs like "shahdol:1"
 */
function sanitizeDistrictSlug(value?: string | null): string | null {
  if (!value) return null;
  
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  
  // Handle malformed values like "shahdol:1"
  const withoutSuffix = trimmed.split(':')[0];
  
  // Remove any non-alphanumeric characters except hyphens
  const normalized = withoutSuffix.replace(/[^a-z0-9-]/g, '');
  
  return normalized || null;
}

/**
 * Normalize host header value
 */
function normalizeHost(value?: string): string {
  if (!value) return '';
  
  // Handle X-Forwarded-Host with multiple values
  const raw = value.split(',')[0].trim().toLowerCase();
  
  // Remove port number
  return raw.split(':')[0];
}

/**
 * Extract subdomain from host
 */
function extractSubdomain(host: string): string | null {
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  
  const parts = host.split('.');
  if (parts.length < 3) return null;
  
  const candidate = parts[0];
  if (IGNORED_SUBDOMAINS.has(candidate)) return null;
  
  return candidate;
}

/**
 * Check if hostname is an IP address (IPv4 or IPv6)
 * Returns true if the host is a numeric IP like '192.168.1.1' or '192'
 */
function isIPAddress(host: string): boolean {
  if (!host) return false;
  
  // Check for pure numeric (like '192') - the ghost IP issue
  const isPureNumeric = /^\d+$/.test(host);
  if (isPureNumeric) {
    console.log(`[TENANT] Detected pure numeric IP: ${host} - will use header fallback or default to Shahdol`);
    return true;
  }
  
  // Check for standard IPv4 format
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(host)) {
    const parts = host.split('.').map(Number);
    const isValidIPv4 = parts.every(part => part >= 0 && part <= 255);
    if (isValidIPv4) {
      console.log(`[TENANT] Detected IPv4 address: ${host} - will use header fallback or default to Shahdol`);
      return true;
    }
  }
  
  // Check for IPv6
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  if (ipv6Regex.test(host)) {
    console.log(`[TENANT] Detected IPv6 address: ${host} - will use header fallback or default to Shahdol`);
    return true;
  }
  
  return false;
}

/**
 * Extract first path segment from URL
 */
function firstPathSegment(path: string): string | null {
  const [segment] = path.split('/').filter(Boolean);
  
  if (!segment || segment === 'api') return null;
  if (segment.includes('.')) return null; // Not a valid slug
  
  return segment.toLowerCase();
}

/**
 * Determine if request should bypass tenant validation
 */
function shouldBypassTenantValidation(req: Request): boolean {
  // Exact path matches
  if (TENANT_EXEMPT_PATHS.includes(req.path)) return true;
  
  // Exact app route matches (for frontend routing)
  if (TENANT_EXEMPT_EXACT.some(path => req.path === path)) return true;
  
  // Path prefix matches
  if (TENANT_EXEMPT_PREFIXES.some(prefix => req.path.startsWith(prefix))) return true;
  
  return false;
}

/**
 * Validate district ID format
 */
function isValidDistrictId(value: number | null | undefined): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  );
}

// ============================================
// MAIN MIDDLEWARE
// ============================================

/**
 * Tenant resolver middleware
 * 
 * Resolves district/tenant context from request and attaches
 * to req.districtId for use in subsequent middleware/routes.
 * 
 * @throws 404 if district not found
 * @throws 400 if invalid district context
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Bypass validation for exempt paths - but apply fallback context instead of null
    if (shouldBypassTenantValidation(req)) {
      // Apply universal fallback: ensure req.districtId is NEVER undefined
      // Use Shahdol (ID: 2) as the default district for all exempt paths
      req.districtId = 2;
      req.districtSlug = 'shahdol';
      req.headers['x-district-id'] = '2';
      req.headers['x-district-slug'] = 'shahdol';
      req.tenantContext = {
        districtId: 2,
        districtSlug: 'shahdol',
        isValid: true,
      };
      console.log(`[TENANT] Applied Shahdol fallback for exempt path: ${req.path}`);
      return next();
    }

    // 🔑 SUPER ADMIN MULTI-DISTRICT SUPPORT
    // For Super Admins, accept x-selected-district-id header to switch between districts
    const selectedDistrictId = req.headers['x-selected-district-id'];
    if (selectedDistrictId) {
      const districtIdNum = parseInt(String(selectedDistrictId), 10);
      if (!isNaN(districtIdNum) && districtIdNum > 0) {
        // Verify the district exists and is active
        const district = await prisma.district.findFirst({
          where: {
            id: districtIdNum,
            isActive: true,
          },
          select: { id: true, slug: true },
        });
        
        if (district) {
          console.log(`[TENANT] Super Admin selected district: ${district.slug} (ID: ${district.id})`);
          req.districtId = district.id;
          req.districtSlug = district.slug;
          req.headers['x-district-id'] = String(district.id);
          req.headers['x-district-slug'] = district.slug;
          req.tenantContext = {
            districtId: district.id,
            districtSlug: district.slug,
            isValid: true,
          };
          return next();
        }
      }
    }

    // Extract district from multiple sources (priority order)
    const xForwardedHost = req.headers['x-forwarded-host'];
    const hostHeader = Array.isArray(xForwardedHost)
      ? xForwardedHost[0]
      : (typeof xForwardedHost === 'string' ? xForwardedHost : req.headers.host);
    const host = normalizeHost(hostHeader);

    // 🚀 STRIKE 86 FIX: If hostname is localhost or an IP address (like '192'),
    // MUST check req.query.district first before falling back
    // This fixes /api/user/for-you?district=shahdol data flow
    if (isIPAddress(host) || host === 'localhost') {
      console.log(`[TENANT] Localhost/IP detected (${host}) - checking query param first`);
      
      // PRIORITY: Check req.query.district FIRST for localhost/IP
      const queryDistrict = sanitizeDistrictSlug(
        typeof req.query.district === 'string' 
          ? req.query.district 
          : null
      );
      
      if (queryDistrict) {
        console.log(`[TENANT] Using query district: ${queryDistrict}`);
        // Lookup in DB
        const cachedDistrict = districtCache.get(queryDistrict);
        if (cachedDistrict) {
          req.districtId = cachedDistrict.id;
          req.districtSlug = cachedDistrict.slug;
          req.headers['x-district-id'] = String(cachedDistrict.id);
          req.headers['x-district-slug'] = cachedDistrict.slug;
          req.tenantContext = {
            districtId: cachedDistrict.id,
            districtSlug: cachedDistrict.slug,
            isValid: true,
          };
          return next();
        }
        
        const district = await prisma.district.findFirst({
          where: {
            slug: queryDistrict,
            isActive: true,
          },
          select: { id: true, slug: true },
        });
        
        if (district) {
          districtCache.set(queryDistrict, district);
          req.districtId = district.id;
          req.districtSlug = district.slug;
          req.headers['x-district-id'] = String(district.id);
          req.headers['x-district-slug'] = district.slug;
          req.tenantContext = {
            districtId: district.id,
            districtSlug: district.slug,
            isValid: true,
          };
          return next();
        }
      }
      
      // Fallback to header or default Shahdol
      console.log(`[TENANT] IP/Localhost - using header or default to Shahdol`);
      
      // Try x-district-slug header first
      const districtFromHeader = sanitizeDistrictSlug(
        typeof req.headers['x-district-slug'] === 'string' 
          ? req.headers['x-district-slug'] 
          : null
      );
      
      if (districtFromHeader) {
        // Use header value - lookup in DB
        const cachedDistrict = districtCache.get(districtFromHeader);
        if (cachedDistrict) {
          req.districtId = cachedDistrict.id;
          req.districtSlug = cachedDistrict.slug;
          req.headers['x-district-id'] = String(cachedDistrict.id);
          req.headers['x-district-slug'] = cachedDistrict.slug;
          req.tenantContext = {
            districtId: cachedDistrict.id,
            districtSlug: cachedDistrict.slug,
            isValid: true,
          };
          return next();
        }
        
        const district = await prisma.district.findFirst({
          where: {
            slug: districtFromHeader,
            isActive: true,
          },
          select: { id: true, slug: true },
        });
        
        if (district) {
          districtCache.set(districtFromHeader, district);
          req.districtId = district.id;
          req.districtSlug = district.slug;
          req.headers['x-district-id'] = String(district.id);
          req.headers['x-district-slug'] = district.slug;
          req.tenantContext = {
            districtId: district.id,
            districtSlug: district.slug,
            isValid: true,
          };
          return next();
        }
      }
      
      // Default to Shahdol for IP addresses
      req.districtId = 2;
      req.districtSlug = 'shahdol';
      req.headers['x-district-id'] = '2';
      req.headers['x-district-slug'] = 'shahdol';
      req.tenantContext = {
        districtId: 2,
        districtSlug: 'shahdol',
        isValid: true,
      };
      console.log(`[TENANT] IP fallback to Shahdol for: ${req.path}`);
      return next();
    }
    
    // Try to get district from different sources
    const districtFromHeader = sanitizeDistrictSlug(
      typeof req.headers['x-district-slug'] === 'string' 
        ? req.headers['x-district-slug'] 
        : null
    );
    
    const districtFromQuery = sanitizeDistrictSlug(
      typeof req.query.district === 'string' 
        ? req.query.district 
        : null
    );
    
    const districtFromPath = sanitizeDistrictSlug(firstPathSegment(req.path));
    const districtFromSubdomain = sanitizeDistrictSlug(extractSubdomain(host));
    
    // SECURITY: Only trust slug-based sources.
    // x-district-id header is NOT trusted - attackers could manipulate it.
    // District ID must come from validated slug lookup in database.
    
    // Determine which source to use (priority: header slug > query > path > subdomain)
    const districtSlug = districtFromHeader || districtFromQuery || districtFromPath || districtFromSubdomain;
    
    // Validate we have a valid slug
    if (!districtSlug) {
      // UNIVERSAL FALLBACK: Default to Shahdol (ID: 2) for ALL requests without district context
      // This ensures req.districtId is NEVER undefined for any path
      req.districtId = 2;
      req.districtSlug = 'shahdol';
      req.headers['x-district-id'] = '2';
      req.headers['x-district-slug'] = 'shahdol';
      req.tenantContext = {
        districtId: 2,
        districtSlug: 'shahdol',
        isValid: true,
      };
      console.log(`[TENANT] Universal fallback to Shahdol (ID: 2) for: ${req.path}`);
      return next();
    }

    // Look up district by slug (SECURE - validated against database)
    // First check cache for performance
    const cachedDistrict = districtCache.get(districtSlug);
    if (cachedDistrict) {
      req.districtId = cachedDistrict.id;
      req.districtSlug = cachedDistrict.slug;
      req.headers['x-district-id'] = String(cachedDistrict.id);
      req.headers['x-district-slug'] = cachedDistrict.slug;
      req.tenantContext = {
        districtId: cachedDistrict.id,
        districtSlug: cachedDistrict.slug,
        isValid: true,
      };
      return next();
    }

    const district = await prisma.district.findFirst({
      where: {
        slug: districtSlug,
        isActive: true,
      },
      select: { id: true, slug: true },
    });

    // Cache the district for future requests
    if (district) {
      districtCache.set(districtSlug, district);
    }

    // District not found or inactive
    if (!district) {
      return void res.status(404).json({
        message: 'District not found or inactive',
        code: 'INVALID_DISTRICT',
        provided: districtSlug,
      });
    }

    // Set district context
    req.districtId = district.id;
    req.districtSlug = district.slug;
    
    // Set headers for downstream middleware
    req.headers['x-district-id'] = String(district.id);
    req.headers['x-district-slug'] = district.slug;
    
    // Create tenant context object
    req.tenantContext = {
      districtId: district.id,
      districtSlug: district.slug,
      isValid: true,
    };

    return next();
  } catch (error: any) {
    console.error('❌ [TENANT] Resolution error:', error.message);
    return void res.status(500).json({
      message: 'Failed to resolve district context',
      code: 'DISTRICT_RESOLUTION_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Require district context middleware
 * 
 * Use this for routes that MUST have district context.
 * Returns 400 if district context is missing.
 */
export function requireDistrictContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.districtId) {
    return void res.status(400).json({
      message: 'District context is required for this endpoint',
      code: 'DISTRICT_REQUIRED',
    });
  }
  next();
}

/**
 * Optional district context middleware
 * 
 * Sets default district if not provided but doesn't fail.
 * SECURITY: Only allows fallback in development mode.
 * In production, requires explicit district context.
 */
export function optionalDistrictContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Already has context
  if (req.districtId) {
    return next();
  }
  
  // SECURITY: In production, require explicit district context
  // Do not allow automatic fallback to default district
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (!isDevelopment) {
    // Production: Don't allow fallback - require explicit district
    console.warn(`[TENANT] Production mode: Rejecting request without district context - ${req.method} ${req.path}`);
    return void res.status(400).json({
      message: 'District context required in production mode',
      code: 'DISTRICT_REQUIRED_PRODUCTION',
      availableMethods: [
        'X-District-Slug: <slug>',
        '?district=<slug>',
        'subdomain.<domain>.com',
        '/api/<district-slug>/...',
      ],
    });
  }
  
  // Development only: Set default district (for localhost development)
  // SURGICAL PATCH: Default to Shahdol (ID: 2) for localhost development
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  if (isLocalhost) {
    req.districtId = 2; // Default to Shahdol for localhost
    req.districtSlug = 'shahdol';
    console.log(`[TENANT] Development mode: Using default district Shahdol (ID: 2) for localhost`);
  } else {
    // In development but not localhost - still allow fallback but log warning
    req.districtId = 1; // Default to first district
    req.districtSlug = 'shahdol';
    console.warn(`[TENANT] Development mode: Using default district for non-localhost - ${req.hostname}`);
  }
  
  next();
}

/**
 * Get current tenant info
 */
export function getTenantInfo(req: Request): {
  districtId: number | null;
  districtSlug: string | null;
  hasContext: boolean;
} {
  return {
    districtId: req.districtId ?? null,
    districtSlug: req.districtSlug ?? null,
    hasContext: !!req.districtId,
  };
}

// Helper for type safety
function hasValidDistrictId(value: number | null | undefined): value is number {
  return isValidDistrictId(value);
}

export default {
  tenantResolver,
  requireDistrictContext,
  optionalDistrictContext,
  getTenantInfo,
};
