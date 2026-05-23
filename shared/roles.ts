/**
 * ============================================
 * SHARED ROLES - Single Source of Truth
 * ============================================
 * BharatOS Identity System
 * 
 * This file provides unified role handling across:
 * - Server (middleware, routes)
 * - Client (AuthContext, App.tsx, pages)
 * 
 * Eliminates "admin" vs "SUPER_ADMIN" vs "superadmin" conflicts
 * by normalizing ALL roles to canonical values.
 */

/**
 * Canonical User Roles - Use these everywhere
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CITY_ADMIN = 'CITY_ADMIN',
  MERCHANT = 'MERCHANT',
  CUSTOMER = 'CUSTOMER',
}

/**
 * Legacy role aliases mapping
 * Maps old/incorrect role strings to canonical values
 */
const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  // Admin variants
  'admin': UserRole.SUPER_ADMIN,
  'superadmin': UserRole.SUPER_ADMIN,
  'super_admin': UserRole.SUPER_ADMIN,
  'ADMIN': UserRole.SUPER_ADMIN,
  'SUPERADMIN': UserRole.SUPER_ADMIN,
  'SUPER_ADMIN': UserRole.SUPER_ADMIN,
  
  // City/District Admin variants
  'city_admin': UserRole.CITY_ADMIN,
  'cityadmin': UserRole.CITY_ADMIN,
  'district_admin': UserRole.CITY_ADMIN,
  'districtadmin': UserRole.CITY_ADMIN,
  'DISTRICT_ADMIN': UserRole.CITY_ADMIN,
  
  // Merchant/Seller variants
  'seller': UserRole.MERCHANT,
  'merchant': UserRole.MERCHANT,
  'SELLER': UserRole.MERCHANT,
  'MERCHANT': UserRole.MERCHANT,
  'vendor': UserRole.MERCHANT,
  'VENDOR': UserRole.MERCHANT,
  
  // Customer variants
  'customer': UserRole.CUSTOMER,
  'CUSTOMER': UserRole.CUSTOMER,
  'user': UserRole.CUSTOMER,
  'USER': UserRole.CUSTOMER,
  'guest': UserRole.CUSTOMER,
  '': UserRole.CUSTOMER,
};

/**
 * Normalize any role string to canonical UserRole
 * Uses LEGACY_ROLE_MAP to handle old JWT tokens + new roles
 * 
 * @param role - Role string from database or API (case-insensitive)
 * @returns Canonical UserRole enum value
 * 
 * @example
 * normalizeRole('admin')        // returns UserRole.SUPER_ADMIN
 * normalizeRole('superadmin')   // returns UserRole.SUPER_ADMIN  
 * normalizeRole('SUPER_ADMIN')   // returns UserRole.SUPER_ADMIN
 * normalizeRole('super admin')  // returns UserRole.SUPER_ADMIN
 * normalizeRole('seller')       // returns UserRole.MERCHANT
 * normalizeRole('SELLER')       // returns UserRole.MERCHANT
 * normalizeRole('customer')     // returns UserRole.CUSTOMER
 */
export function normalizeRole(role: string | undefined | null): UserRole {
  if (!role) return UserRole.CUSTOMER;

  const r = role.trim().toUpperCase();

  // First check: exact enum values
  if (Object.values(UserRole).includes(r as UserRole)) {
    return r as UserRole;
  }

  // Second check: legacy role mapping (for old JWT tokens)
  const legacy = LEGACY_ROLE_MAP[r.toLowerCase()];
  if (legacy) {
    return legacy;
  }

  // Strictly fallback to Customer if anything is suspicious
  console.warn(`⚠️ [ROLES] Unknown role, defaulting to CUSTOMER: ${role}`);
  return UserRole.CUSTOMER; 
}

/**
 * Check if user has admin privileges (SUPER_ADMIN or CITY_ADMIN)
 */
export function isAdminRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === UserRole.SUPER_ADMIN || normalized === UserRole.CITY_ADMIN;
}

/**
 * Check if user is a merchant/seller
 */
export function isMerchantRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === UserRole.MERCHANT;
}

/**
 * Check if user is a super admin (full system access)
 */
export function isSuperAdminRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === UserRole.SUPER_ADMIN;
}

/**
 * Check if user is a city/district admin
 */
export function isCityAdminRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === UserRole.CITY_ADMIN;
}

/**
 * Get role hierarchy level (higher = more privileges)
 * Useful for comparing roles
 */
export function getRoleLevel(role: string | undefined | null): number {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case UserRole.SUPER_ADMIN: return 100;
    case UserRole.CITY_ADMIN: return 50;
    case UserRole.MERCHANT: return 25;
    case UserRole.CUSTOMER: return 10;
    default: return 0;
  }
}

/**
 * Check if user has required role or higher (hierarchy-based)
 */
export function hasRoleOrHigher(userRole: string | undefined | null, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Get redirect path based on user role
 * Used for post-login redirects
 */
export function getRoleRedirectPath(role: string | undefined | null): string {
  const normalized = normalizeRole(role);
  
  switch (normalized) {
    case UserRole.SUPER_ADMIN:
    case UserRole.CITY_ADMIN:
      return '/admin';
    case UserRole.MERCHANT:
      return '/partner';
    case UserRole.CUSTOMER:
    default:
      return '/customer-dashboard';
  }
}

/**
 * Role display names (for UI)
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.CITY_ADMIN]: 'District Admin',
  [UserRole.MERCHANT]: 'Partner',
  [UserRole.CUSTOMER]: 'Customer',
};

/**
 * Check if route is admin-only
 */
export function isAdminRoute(path: string): boolean {
  return path.startsWith('/admin');
}

/**
 * Check if route is partner/merchant-only
 */
export function isPartnerRoute(path: string): boolean {
  return path.startsWith('/partner') || path.startsWith('/merchant');
}

export default {
  UserRole,
  normalizeRole,
  isAdminRole,
  isMerchantRole,
  isSuperAdminRole,
  isCityAdminRole,
  getRoleLevel,
  hasRoleOrHigher,
  getRoleRedirectPath,
  ROLE_DISPLAY_NAMES,
  isAdminRoute,
  isPartnerRoute,
};
