import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken, verifyRefreshToken, extractTokenFromHeader, JWTPayload } from './jwt.js';
import { prisma } from '../storage.js';
import { normalizeRole, UserRole, isSuperAdminRole, isAdminRole, isMerchantRole, hasRoleOrHigher, getRoleLevel } from '../../shared/roles.js';

// ============================================
// SECURITY: Async Error Wrapper
// ============================================
// Wraps async route handlers to catch errors and pass them to Express error handler
// This ensures all async errors are properly caught and return JSON responses
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const TENANT_EXEMPT_PATHS = [
  '/api/health', 
  '/api/health-fn',
  '/api/ui/context',
  // Public marketplace routes - no district required
  '/api/products',
  '/api/categories', 
  '/api/shops',
  '/api/banners',
  '/api/offers',
  '/api/marketplace',
  '/api/reviews',
];
const TENANT_EXEMPT_PREFIXES = [
  '/api/districts',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/verify',
  '/api/vendors',
  '/api/hospitals',
  '/api/schools',
  '/api/service-workers',
  '/api/ai',
];
const IGNORED_SUBDOMAINS = new Set(['www', 'api']);

function sanitizeDistrictSlug(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  // Handle malformed values like "shahdol:1"
  const withoutSuffix = trimmed.split(':')[0];
  const normalized = withoutSuffix.replace(/[^a-z0-9-]/g, '');
  return normalized || null;
}

function normalizeHost(value?: string): string {
  if (!value) return '';
  const raw = value.split(',')[0].trim().toLowerCase();
  return raw.split(':')[0];
}

function extractSubdomain(host: string): string | null {
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  const parts = host.split('.');
  if (parts.length < 3) return null;
  const candidate = parts[0];
  if (IGNORED_SUBDOMAINS.has(candidate)) return null;
  return candidate;
}

function firstPathSegment(path: string): string | null {
  const [segment] = path.split('/').filter(Boolean);
  if (!segment || segment === 'api') return null;
  if (segment.includes('.')) return null;
  return segment.toLowerCase();
}

function shouldBypassTenantValidation(req: Request): boolean {
  // Master landing page
  if (req.method === 'GET' && req.path === '/') return true;
  
  // Exact match for exempt paths
  if (TENANT_EXEMPT_PATHS.includes(req.path)) return true;
  
  // Prefix match for exempt routes (e.g., /api/districts, /api/vendors)
  if (TENANT_EXEMPT_PREFIXES.some(prefix => req.path.startsWith(prefix))) return true;
  
  return false;
}

export async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  try {
    if (shouldBypassTenantValidation(req)) {
      req.districtId = null;
      return next();
    }

    const xForwardedHost = req.headers['x-forwarded-host'];
    const hostHeader = Array.isArray(xForwardedHost)
      ? xForwardedHost[0]
      : (typeof xForwardedHost === 'string' ? xForwardedHost : req.headers.host);
    const host = normalizeHost(hostHeader);

    // PRIORITY: Use slug from trusted sources only (NOT x-district-id header)
    // x-district-id can be manipulated by attackers - we only trust slugs
    const districtFromHeader = sanitizeDistrictSlug(
      typeof req.headers['x-district-slug'] === 'string' ? req.headers['x-district-slug'] : null
    );
    const districtFromQuery = sanitizeDistrictSlug(
      typeof req.query.district === 'string' ? req.query.district as string : null
    );
    const districtFromPath = sanitizeDistrictSlug(firstPathSegment(req.path));
    const districtFromSubdomain = sanitizeDistrictSlug(extractSubdomain(host));
    
    // REMOVED: x-district-id header fallback - attackers could manipulate this
    // Only trust slug-based sources (header, query, path, subdomain)
    
    // PRIORITY ORDER: Header > Query > Path > Subdomain
    // These are harder to manipulate than direct numeric IDs
    const districtSlug = districtFromHeader || districtFromQuery || districtFromPath || districtFromSubdomain;
    
    // STRICT: Require explicit district context - no silent fallback
    // If no district is specified, reject the request to prevent data leakage
    if (!districtSlug) {
      return res.status(400).json({
        message: 'District context is required. Please specify a district using X-District-Slug header, ?district= query param, or use a district subdomain.',
        code: 'DISTRICT_REQUIRED',
        availableMethods: [
          'X-District-Slug: shahdol',
          '?district=shahdol',
          'shahdol.example.com'
        ]
      });
    }

    // SECURITY: Always validate slug against database
    const district = await prisma.district.findFirst({
      where: {
        slug: districtSlug,
        isActive: true,
      },
      select: { id: true, slug: true },
    });

    // STRICT: District not found - reject request instead of silent fallback
    // This prevents data leakage from invalid/misspelled district slugs
    if (!district) {
      return res.status(404).json({
        message: `District '${districtSlug}' not found or is inactive`,
        code: 'INVALID_DISTRICT',
        provided: districtSlug,
        hint: 'Please verify the district slug is correct'
      });
    }

    // Override any client-provided districtId with the validated database ID
    req.districtId = district.id;
    req.headers['x-district-id'] = String(district.id);
    req.headers['x-district-slug'] = district.slug;
    next();
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to resolve district',
      code: 'DISTRICT_RESOLUTION_ERROR',
      error: error?.message || 'Unknown error',
    });
  }
}

/**
 * Role definitions - Now imported from shared/roles.ts
 * Use normalizeRole() for all role handling
 */
export { UserRole } from '../../shared/roles.js';
// Alias for backward compatibility
export const Role = UserRole;

/**
 * Role hierarchy (higher number = more permissions)
 * Using shared roles.ts for consistency
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.CITY_ADMIN]: 3,
  [UserRole.MERCHANT]: 2,
  [UserRole.CUSTOMER]: 1,
};

/**
 * Convert legacy role to canonical role system
 * Uses shared normalizeRole() from roles.ts
 * 
 * @deprecated Use normalizeRole() directly from roles.ts
 */
export function mapLegacyRoleToNewRole(legacyRole: string, isAdmin?: boolean): UserRole {
  // Use the shared normalizeRole function
  const normalized = normalizeRole(legacyRole);
  
  // If isAdmin flag is set, ensure SUPER_ADMIN
  if (isAdmin && normalized !== UserRole.SUPER_ADMIN) {
    return UserRole.SUPER_ADMIN;
  }
  
  return normalized;
}

/**
 * Middleware: Require authentication (valid JWT token)
 * Supports both Authorization header and httpOnly cookie
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // First try Authorization header (for backward compatibility)
    const authHeader = req.headers.authorization;
    const bearerMatch = typeof authHeader === 'string'
      ? authHeader.match(/^Bearer\s+(.+)$/i)
      : null;
    let token = bearerMatch?.[1]?.trim() || extractTokenFromHeader(authHeader);
    
    // If no token in header, try httpOnly cookie
    if (!token) {
      token = req.cookies?.accessToken || null;
    }
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    req.userId = payload.userId;
    
    // CRITICAL: Propagate districtId from JWT to req.districtId for tenant isolation
    // This ensures authenticated requests maintain district context
    if (payload.districtId) {
      req.districtId = payload.districtId;
      req.headers['x-district-id'] = String(payload.districtId);
    }
    
    // Also propagate district slug if available in JWT
    if (payload.districtSlug) {
      req.districtSlug = payload.districtSlug;
      req.headers['x-district-slug'] = payload.districtSlug;
    }
    
    // Backward compatibility: Set x-user-id header for existing routes
    req.headers['x-user-id'] = String(payload.userId);
    
    next();
  } catch (error: any) {
    // SECURITY: Use generic error messages in production to prevent information disclosure
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (error instanceof jwt.TokenExpiredError || error?.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: isProduction ? 'Authentication failed' : 'Token expired',
        code: isProduction ? 'AUTH_FAILED' : 'TOKEN_EXPIRED'
      });
    }

    if (error instanceof jwt.JsonWebTokenError || error?.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: isProduction ? 'Authentication failed' : 'Invalid token',
        code: isProduction ? 'AUTH_FAILED' : 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({ 
      message: isProduction ? 'Authentication failed' : (error.message || 'Invalid or expired token'),
      code: isProduction ? 'AUTH_FAILED' : 'INVALID_TOKEN'
    });
  }
}

/**
 * Middleware: Require specific role or higher
 * 
 * SECURITY IMPROVEMENTS:
 * - Strict role validation (exact role match by default)
 * - Optional district isolation for CITY_ADMIN
 * - Optional resource ownership validation for MERCHANT
 */
export function requireRole(
  allowedRoles: UserRole[],
  options?: {
    strict?: boolean;           // If true, only exact role match allowed (no hierarchy)
    requireDistrict?: boolean; // If true, requires valid district context for CITY_ADMIN
    checkOwnership?: (req: Request) => Promise<boolean>; // Custom ownership check
  }
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role as string;
    const userRoleLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
    // Ensure SUPER_ADMIN is properly recognized - handle both enum and string comparison
    // Also check for legacy 'admin' role and isAdmin flag
    const isSuperAdmin = userRole === UserRole.SUPER_ADMIN || 
                         userRole === 'SUPER_ADMIN' || 
                         userRole === 'SUPERADMIN' ||
                         userRole === 'admin';
    
    // Also check isAdmin flag from JWT payload
    const hasAdminFlag = req.user.isAdmin === true;
    
    // SUPER_ADMIN, admin role, or isAdmin flag has access to everything (bypass all checks)
    if (isSuperAdmin || hasAdminFlag) {
      return next();
    }

    // Strict mode: only exact role match
    if (options?.strict) {
      // Ensure userRole is compared as string to handle both enum and string values
      const userRoleStr = String(userRole);
      const hasExactRole = allowedRoles.some(allowed => 
        String(allowed) === userRoleStr || 
        allowed === userRoleStr
      );
      if (!hasExactRole) {
        return res.status(403).json({ 
          message: 'Insufficient permissions - exact role required',
          code: 'FORBIDDEN_EXACT_ROLE',
          required: allowedRoles,
          current: userRole
        });
      }
      
      // For strict mode, still check district for CITY_ADMIN
      if (userRole === UserRole.CITY_ADMIN && options?.requireDistrict) {
        const userDistrictId = req.user.districtId ?? req.districtId;
        if (!userDistrictId) {
          return res.status(403).json({
            message: 'District context required for city admin operations',
            code: 'DISTRICT_REQUIRED',
          });
        }
      }
      
      return next();
    }
    
    // Default: Check role hierarchy
    const hasPermission = allowedRoles.some(allowedRole => {
      const allowedLevel = ROLE_HIERARCHY[allowedRole] || 0;
      return userRoleLevel >= allowedLevel;
    });

    if (!hasPermission) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: userRole
      });
    }

    // District isolation for CITY_ADMIN
    if (userRole === UserRole.CITY_ADMIN) {
      const userDistrictId = req.user.districtId ?? req.districtId;
      
      if (options?.requireDistrict && !userDistrictId) {
        return res.status(403).json({
          message: 'District context required for city admin operations',
          code: 'DISTRICT_REQUIRED',
        });
      }
      
      // For district-scoped requests, verify the district matches
      const requestedDistrictId = req.districtId;
      if (requestedDistrictId && userDistrictId && requestedDistrictId !== userDistrictId) {
        return res.status(403).json({
          message: 'Access restricted to your district only',
          code: 'DISTRICT_ISOLATION',
          yourDistrict: userDistrictId,
          requestedDistrict: requestedDistrictId
        });
      }
    }

    // Custom ownership check for MERCHANT role
    if (userRole === UserRole.MERCHANT && options?.checkOwnership) {
      try {
        const hasOwnership = await options.checkOwnership(req);
        if (!hasOwnership) {
          return res.status(403).json({
            message: 'You can only access your own resources',
            code: 'OWNERSHIP_REQUIRED',
          });
        }
      } catch (ownershipError) {
        console.error('Ownership check failed:', ownershipError);
        return res.status(500).json({
          message: 'Authorization check failed',
          code: 'AUTH_CHECK_ERROR',
        });
      }
    }

    next();
  };
}

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Use centralized normalizeRole() for secure role validation
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  // CRITICAL: Use normalizeRole() to handle all role variants securely
  const normalizedRole = normalizeRole(req.user.role);
  if (normalizedRole === UserRole.SUPER_ADMIN || req.user.isAdmin === true) {
    next();
  } else {
    res.status(403).json({ message: 'Unauthorized: Super Admin access required', code: 'FORBIDDEN' });
  }
};

// Sovereign middleware - uses centralized normalizeRole() from shared/roles.ts
export function requireSuperAdminSovereign(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  // CRITICAL: Use normalizeRole() for secure, centralized role validation
  const normalizedRole = normalizeRole(req.user.role);
  const hasAdminFlag = req.user.isAdmin === true;
  
  if (normalizedRole === UserRole.SUPER_ADMIN || hasAdminFlag) {
    return next();
  }
  
  return res.status(403).json({ 
    message: 'Super admin access required',
    code: 'FORBIDDEN'
  });
}

/**
 * Convenience middleware: Require CITY_ADMIN or higher
 * With strict district isolation
 */
export const requireCityAdmin = requireRole([UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN], {
  requireDistrict: true
});

/**
 * Convenience middleware: Require MERCHANT or higher
 * With ownership validation for their own resources
 */
export const requireMerchant = requireRole([UserRole.MERCHANT, UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]);

/**
 * Middleware: Optional auth (sets user if token exists, but doesn't fail if missing)
 * Supports both Authorization header, accessToken cookie, AND refreshToken cookie
 * 
 * TRANSPARENCY: Logs all auth decisions for debugging
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Get safe path (without query params to prevent sensitive data in logs)
  const safePath = req.path.split('?')[0];
  
  try {
    // First try Authorization header (backward compatibility)
    let token = extractTokenFromHeader(req.headers.authorization);
    
    // Also check accessToken cookie (for cookie-based auth)
    if (!token) {
      token = req.cookies?.accessToken || null;
    }
    
    // Also check refreshToken cookie - if present, validate and generate new access token
    if (!token && req.cookies?.refreshToken) {
      try {
        const decoded = verifyRefreshToken(req.cookies.refreshToken);
        // Generate new access token from refresh token
        const { storage } = await import('../storage.js');
        const user = await storage.getUserByUsername(decoded.username);
        if (user) {
          // Generate new access token
          const { generateTokenPair } = await import('../auth/jwt.js');
          const { accessToken } = generateTokenPair({
            userId: user.id,
            username: user.username,
            role: mapLegacyRoleToNewRole(user.role, user.isAdmin),
            isAdmin: user.isAdmin, // 👈 THE MISSING SOVEREIGN KEY
            shopId: null,
          });
          token = accessToken;
          // PII PURGE: No longer logging username for production security
        }
      } catch (refreshError) {
        console.warn(`[OPTIONAL_AUTH] ⚠️  Refresh token validation failed: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`);
      }
    }
    
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
      req.userId = payload.userId;
      
      // CRITICAL: Propagate districtId from JWT to req.districtId for tenant isolation
      if (payload.districtId) {
        req.districtId = payload.districtId;
        req.headers['x-district-id'] = String(payload.districtId);
      }
      
      // Also propagate district slug if available in JWT
      if (payload.districtSlug) {
        req.districtSlug = payload.districtSlug;
        req.headers['x-district-slug'] = payload.districtSlug;
      }
      
      req.headers['x-user-id'] = String(payload.userId);
      // PII PURGE: Minimal logging only - no user data in production logs
    } else {
      // PII PURGE: Guest access - no user data logged
    }
  } catch (error) {
    // Log errors for debugging but don't fail - auth is optional
    if (error instanceof Error) {
      console.warn(`[OPTIONAL_AUTH] ⚠️  Token validation failed: ${error.message} - ${req.method} ${safePath}`);
    } else {
      console.warn(`[OPTIONAL_AUTH] ⚠️  Token validation failed: Unknown error - ${req.method} ${safePath}`);
    }
  }
  next();
}
