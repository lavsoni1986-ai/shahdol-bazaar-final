import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from './jwt.js';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: number;
    }
  }
}

/**
 * Role definitions
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CITY_ADMIN = 'CITY_ADMIN',
  MERCHANT = 'MERCHANT',
  CUSTOMER = 'CUSTOMER',
}

/**
 * Role hierarchy (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 4,
  [Role.CITY_ADMIN]: 3,
  [Role.MERCHANT]: 2,
  [Role.CUSTOMER]: 1,
};

/**
 * Convert legacy role to new role system
 */
export function mapLegacyRoleToNewRole(legacyRole: string, isAdmin?: boolean): Role {
  if (isAdmin || legacyRole === 'admin') {
    return Role.SUPER_ADMIN;
  }
  if (legacyRole === 'seller' || legacyRole === 'merchant') {
    return Role.MERCHANT;
  }
  if (legacyRole === 'city_admin' || legacyRole === 'city-admin') {
    return Role.CITY_ADMIN;
  }
  return Role.CUSTOMER;
}

/**
 * Middleware: Require authentication (valid JWT token)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    req.userId = payload.userId;
    
    // Backward compatibility: Set x-user-id header for existing routes
    req.headers['x-user-id'] = String(payload.userId);
    
    next();
  } catch (error: any) {
    return res.status(401).json({ 
      message: error.message || 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Middleware: Require specific role or higher
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;
    
    // Check if user has any of the allowed roles or a higher role
    const hasPermission = allowedRoles.some(allowedRole => {
      const allowedLevel = ROLE_HIERARCHY[allowedRole] || 0;
      return userRoleLevel >= allowedLevel;
    });

    // SUPER_ADMIN has access to everything
    if (userRole === Role.SUPER_ADMIN) {
      return next();
    }

    if (!hasPermission) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
}

/**
 * Convenience middleware: Require SUPER_ADMIN
 */
export const requireSuperAdmin = requireRole([Role.SUPER_ADMIN]);

/**
 * Convenience middleware: Require CITY_ADMIN or higher
 */
export const requireCityAdmin = requireRole([Role.CITY_ADMIN, Role.SUPER_ADMIN]);

/**
 * Convenience middleware: Require MERCHANT or higher
 */
export const requireMerchant = requireRole([Role.MERCHANT, Role.CITY_ADMIN, Role.SUPER_ADMIN]);

/**
 * Middleware: Optional auth (sets user if token exists, but doesn't fail if missing)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
      req.userId = payload.userId;
      req.headers['x-user-id'] = String(payload.userId);
    }
  } catch (error) {
    // Silently fail for optional auth
  }
  next();
}
