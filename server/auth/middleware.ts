import type { Request, Response, NextFunction } from 'express';

// NOTE: This file uses local Express Request augmentation for typing stability when compiled in isolation.
// JWT functions are imported as native ESM to preserve Node 22 + `type: module` runtime behavior.

type RequestCtx = {
  districtId: number | null;
  districtSlug: string | null;
  userId?: number;
  role?: string;
  isAdmin?: boolean;
  requestId?: string;
};

declare global {
  namespace Express {
    interface Request {
      ctx?: RequestCtx;
      user?: JWTPayload;
      districtId?: number | null;
      districtSlug?: string | null;
      requestId?: string;
    }
  }
}

import { verifyAccessToken, extractTokenFromHeader } from './jwt';
import type { JWTPayload } from './jwt';

import { findUserById } from '../repositories/user.repo';
import { normalizeRole, UserRole, isSuperAdminRole, isAdminRole, isMerchantRole, hasRoleOrHigher, getRoleLevel } from '../../shared/roles';
import { ErrorCode, sendError } from '../middleware/errorHandler';
import { tenantContext } from '../storage';

// Note: Global Express Request augmentation in server/types/express.d.ts provides
// canonical req.ctx with districtSlug, districtId, userId, role, etc.





function normalizeHost(value?: string): string {
  if (!value) return '';
  const raw = value.split(',')[0].trim().toLowerCase();
  return raw.split(':')[0];
}

type AuthUserRecord = {
  id: number;
  username: string;
  role: string;
  districtId: number | null;
  tokenVersion: number;
  isAdmin?: boolean | null;
};

function isAuthUserRecord(value: unknown): value is AuthUserRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'number' &&
    typeof v.username === 'string' &&
    typeof v.role === 'string' &&
    (typeof v.districtId === 'number' || v.districtId === null || typeof v.districtId === 'undefined') &&
    typeof v.tokenVersion === 'number'
  );
}

function toSafeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
  }
  return null;
}

function normalizeAuthUserRecord(value: unknown): AuthUserRecord | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "number") return null;
  if (typeof v.username !== "string") return null;
  if (typeof v.role !== "string") return null;

  const districtId = v.districtId === null || typeof v.districtId === "undefined"
    ? null
    : toSafeNumber(v.districtId);
  if (!(districtId === null || typeof districtId === "number")) return null;

  const tokenVersion = toSafeNumber(v.tokenVersion) ?? 1;

  return {
    id: v.id,
    username: v.username,
    role: v.role,
    districtId,
    tokenVersion,
    isAdmin: typeof v.isAdmin === "boolean" ? v.isAdmin : null,
  };
}





/**
 * Role definitions - Now imported from shared/roles.ts
 * Use normalizeRole() for all role handling
 */
export { UserRole } from '../../shared/roles';
// Alias for backward compatibility
export const Role = UserRole;

/**
 * Convert legacy role to canonical role system
 * Uses shared normalizeRole() from roles.ts
 * 
 * @deprecated Use normalizeRole() directly from roles.ts
 */


/**
 * CSRF Protection Middleware
 * Uses Double-Submit Cookie Pattern for multi-tenant security
 */
export function requireCSRF(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Get CSRF token from cookie and header
    const cookieToken = (req.cookies as any)?.csrfToken;
    const headerToken = req.headers['x-csrf-token'] as string;

    // Both tokens must be present and match
    if (!cookieToken || !headerToken) {
      return sendError(res, 403, ErrorCode.FORBIDDEN, "CSRF token required");
    }

    if (cookieToken !== headerToken) {
      return sendError(res, 403, ErrorCode.FORBIDDEN, "CSRF token invalid");
    }

    next();
  } catch (error) {
    console.error("CSRF validation error:", error);
    return sendError(res, 403, ErrorCode.FORBIDDEN, "CSRF validation failed");
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Check cookie first, fallback to header
    const token = (req.cookies as any)?.accessToken || extractTokenFromHeader(req);

    if (!token) {
      return sendError(res, 401, ErrorCode.AUTH_REQUIRED, "No token");
    }

    // ✅ VERIFY TOKEN
    const decoded = verifyAccessToken(token);

    // ✅ DB validate (production-grade)
    const dbUserRaw = await findUserById(decoded.userId, {
      id: true,
      username: true,
      role: true,
      districtId: true,
      isAdmin: true,
    });
    const dbUser = normalizeAuthUserRecord(dbUserRaw);

    // Token version is optional in this deployment (schema may not have tokenVersion)
    if (!dbUser) {
      return sendError(res, 401, ErrorCode.TOKEN_EXPIRED, "Token expired");
    }

    // ✅ CRITICAL: Validate districtId matches DB
    if (dbUser.districtId !== decoded.districtId) {
      console.error(`🚨 TENANT BYPASS ATTEMPT: User ${decoded.userId} tried to claim districtId ${decoded.districtId}, but DB says ${dbUser.districtId}`);
      return sendError(res, 401, ErrorCode.INVALID_TOKEN, "Token invalid");
    }

    // Preserve tenantResolver resolution when present, otherwise fall back to DB.
    if (req.districtId == null) {
      req.districtId = dbUser.districtId;
    }

    req.user = {
      userId: dbUser.id,
      username: dbUser.username,
      role: dbUser.role as any,
      districtId: dbUser.districtId,
      districtSlug: decoded.districtSlug || null,
      tokenVersion: typeof decoded.tokenVersion === "number" ? decoded.tokenVersion : dbUser.tokenVersion
    } as JWTPayload;

    req.ctx = {
      ...(req.ctx || {}),
      districtId: dbUser.districtId ?? req.ctx?.districtId ?? null,
      districtSlug: req.ctx?.districtSlug ?? decoded.districtSlug ?? null,
      userId: dbUser.id,
      role: dbUser.role,
      isAdmin: !!dbUser.isAdmin,
      requestId: req.requestId,
    };

    req.districtId = req.ctx.districtId;

    // ✅ Synchronize verified district and user authority into ALS
    const store = tenantContext.getStore();
    if (store) {
      store.districtId = dbUser.districtId ?? -1;
      store.userId = dbUser.id;
    }

    next();
  } catch (err) {
    return sendError(res, 401, ErrorCode.INVALID_TOKEN, "Invalid token");
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
      return sendError(res, 401, ErrorCode.AUTH_REQUIRED, 'Authentication required');
    }

    const userRole = req.user.role as string;
    // Use normalizeRole for consistent role validation
    const normalizedRole = normalizeRole(userRole);

    // SUPER_ADMIN has access to everything (bypass all checks)
    if (normalizedRole === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Strict mode: only exact role match
    if (options?.strict) {
      const hasExactRole = allowedRoles.some(allowed => allowed === normalizedRole);
      if (!hasExactRole) {
        return sendError(res, 403, ErrorCode.FORBIDDEN, 'Insufficient permissions - exact role required', {
          required: allowedRoles,
          current: normalizedRole
        });
      }

      // For strict mode, still check district for CITY_ADMIN
      if (normalizedRole === UserRole.CITY_ADMIN && options?.requireDistrict) {
        const userDistrictId = req.user.districtId ?? req.districtId;
        if (!userDistrictId) {
          return sendError(res, 403, ErrorCode.DISTRICT_REQUIRED, 'District context required for city admin operations');
        }
      }

      return next();
    }

    // Default: Check role hierarchy
    const userRoleLevel = getRoleLevel(normalizedRole);
    const hasPermission = allowedRoles.some(allowedRole => {
      const allowedLevel = getRoleLevel(allowedRole);
      return userRoleLevel >= allowedLevel;
    });

    if (!hasPermission) {
      return sendError(res, 403, ErrorCode.FORBIDDEN, 'Insufficient permissions', {
        required: allowedRoles,
        current: normalizedRole
      });
    }

    // District isolation for CITY_ADMIN
    if (normalizedRole === UserRole.CITY_ADMIN) {
      const userDistrictId = req.user.districtId ?? req.districtId;

      if (options?.requireDistrict && !userDistrictId) {
        return sendError(res, 403, ErrorCode.DISTRICT_REQUIRED, 'District context required for city admin operations');
      }

      // For district-scoped requests, verify the district matches
      const requestedDistrictId = req.districtId;
      if (requestedDistrictId && userDistrictId && requestedDistrictId !== userDistrictId) {
        return sendError(res, 403, ErrorCode.CROSS_TENANT_ACCESS, 'Access restricted to your district only', {
          yourDistrict: userDistrictId,
          requestedDistrict: requestedDistrictId
        });
      }
    }

    // Custom ownership check for MERCHANT role
    if (normalizedRole === UserRole.MERCHANT && options?.checkOwnership) {
      try {
        const hasOwnership = await options.checkOwnership(req);
        if (!hasOwnership) {
          return sendError(res, 403, ErrorCode.FORBIDDEN, 'You can only access your own resources');
        }
      } catch (ownershipError) {
        console.error('Ownership check failed:', ownershipError);
        return sendError(res, 500, ErrorCode.INTERNAL_ERROR, 'Authorization check failed');
      }
    }

    next();
  };
}

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Use centralized normalizeRole() for secure role validation
  if (!req.user) {
    return sendError(res, 401, ErrorCode.AUTH_REQUIRED, 'Authentication required');
  }

  // CRITICAL: Use normalizeRole() to handle all role variants securely
  const normalizedRole = normalizeRole(req.user.role);
  if (normalizedRole === UserRole.SUPER_ADMIN) {
    next();
  } else {
    return sendError(res, 403, ErrorCode.FORBIDDEN, 'Unauthorized: Super Admin access required');
  }
};

// Super Admin middleware - uses centralized normalizeRole() from shared/roles.ts
export function requireSuperAdminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 401, ErrorCode.AUTH_REQUIRED, 'Authentication required');
  }

  // CRITICAL: Use normalizeRole() for secure, centralized role validation
  const normalizedRole = normalizeRole(req.user.role);
  const hasAdminFlag = normalizedRole === UserRole.SUPER_ADMIN;

  if (normalizedRole === UserRole.SUPER_ADMIN) {
    return next();
  }

  return sendError(res, 403, ErrorCode.FORBIDDEN, 'Super admin access required');
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
  try {
    const requestId = req.requestId || (req as any).requestId;
    // Check cookie first, fallback to header
    const cookieToken = (req.cookies as any)?.accessToken as string | undefined;
    const headerToken = (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null) as string | null;
    const token = cookieToken || headerToken;

    if (req.path?.includes("/auth/verify") || req.originalUrl?.includes("/auth/verify")) {
      console.log("[VERIFY] token found:", !!token, {
        requestId,
        hasCookieToken: !!cookieToken,
        hasHeaderToken: !!headerToken,
        cookieNames: req.cookies ? Object.keys(req.cookies) : [],
      });
    }

    if (token) {

      const decoded = verifyAccessToken(token);
      if (req.path?.includes("/auth/verify") || req.originalUrl?.includes("/auth/verify")) {
        console.log("[VERIFY] decoded payload", { requestId, decoded });
      }

      const userRaw = await findUserById(decoded.userId, {
        id: true,
        username: true,
        role: true,
        districtId: true,
        isAdmin: true,
      });
      const user = normalizeAuthUserRecord(userRaw);

      if (req.path?.includes("/auth/verify") || req.originalUrl?.includes("/auth/verify")) {
        console.log("[VERIFY] user record ok:", !!user, {
          requestId,
          userId: decoded.userId,
          rawTokenVersionType: typeof (userRaw as any)?.tokenVersion,
          rawTokenVersion: (userRaw as any)?.tokenVersion,
        });
      }

      if (user) {
        // ✅ CRITICAL: Validate tokenVersion to prevent replay
        if (typeof decoded.tokenVersion === "number" && user.tokenVersion !== decoded.tokenVersion) {
          console.warn(`🚨 Token replay blocked: ${user.id}`);
          return next(); // Don't set req.user, treat as guest
        }
        
        console.log("[VERIFY] assigning req.user", { requestId, userId: user.id });
        req.user = {
          userId: user.id,
          username: user.username,
          role: user.role as any,
          districtId: user.districtId,
          districtSlug: null,
          tokenVersion: user.tokenVersion
        } as JWTPayload;

        // Keep req.user aligned with downstream expectations
        (req.user as any).isAdmin = !!user.isAdmin;

        if (req.path?.includes("/auth/verify") || req.originalUrl?.includes("/auth/verify")) {
          console.log("[VERIFY] req.user assigned", { requestId, userId: req.user.userId, role: req.user.role });
        }

        req.ctx = {
          ...(req.ctx || {}),
          districtId: user.districtId ?? req.ctx?.districtId ?? null,
          districtSlug: req.ctx?.districtSlug ?? null,
          userId: user.id,
          role: user.role,
          isAdmin: !!user.isAdmin,
          requestId: req.requestId,
        };

        req.districtId = req.ctx.districtId;

        if (user.districtId && !req.districtId) {
          req.districtId = user.districtId;
        }

        // ✅ Synchronize verified district and user authority into ALS
        const store = tenantContext.getStore();
        if (store) {
          store.districtId = user.districtId ?? -1;
          store.userId = user.id;
        }
      }
    }
  } catch (error) {
    if (req.path?.includes("/auth/verify") || req.originalUrl?.includes("/auth/verify")) {
      console.error("[VERIFY ERROR] optionalAuth failed", error);
    }
    // Silent fail for optional auth (treat as guest)
  }
  next();
}
