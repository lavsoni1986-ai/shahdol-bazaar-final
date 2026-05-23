/**
 * @deprecated Cookie-based auth is canonical now.
 * This file is retained for legacy compatibility, but should not be used for auth decisions.
 */

export interface DecodedJWT {
  userId: number;
  username: string;
  role: string; // Database role: "admin", "customer", "seller"
  shopId?: number | null;
  districtId?: number | null; // For district admins
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Decode JWT token without verification (client-side only)
 * This is safe for reading user data but server must verify for auth
 */
export function decodeJWT(token: string): DecodedJWT | null {
  try {
    if (!token || typeof token !== 'string') {
      console.warn('[JWT] Invalid token: not a string');
      return null;
    }

    // JWT is Base64URL encoded: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[JWT] Invalid token format: expected 3 parts, got', parts.length);
      return null;
    }

    // Decode payload (second part)
    let payload = parts[1];
    
    // Base64URL decode: Replace URL-safe characters and add padding if needed
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed (Base64 requires padding to be multiple of 4)
    while (payload.length % 4) {
      payload += '=';
    }
    
    try {
      const decoded = atob(payload);
      const parsed = JSON.parse(decoded);
      
      // JWT decoded successfully
      
      return parsed as DecodedJWT;
    } catch (decodeError) {
      console.error('[JWT] Failed to decode Base64 or parse JSON:', decodeError);
      return null;
    }
  } catch (error) {
    console.error('[JWT] Failed to decode token:', error);
    return null;
  }
}

/**
 * Get user role from JWT token
 */
export function getRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  
  const decoded = decodeJWT(token);
  return decoded?.role || null;
}

/**
 * Check if token represents an admin user
 * Accepts both "admin" and "SUPER_ADMIN" roles for compatibility
 */
export function isAdminToken(token: string | null): boolean {
  if (!token) return false;
  
  const decoded = decodeJWT(token);
  if (!decoded) return false;
  
  // Accept both "admin" and "SUPER_ADMIN" as valid admin roles
  return decoded.role === 'admin' || decoded.role === 'SUPER_ADMIN';
}

/**
 * Get user ID from token
 */
export function getUserIdFromToken(token: string | null): number | null {
  if (!token) return null;
  
  const decoded = decodeJWT(token);
  return decoded?.userId || null;
}
