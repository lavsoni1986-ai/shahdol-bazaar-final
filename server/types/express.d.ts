import 'express';

/**
 * Extended Express Request interface for Shahdol Bazaar
 * Adds custom properties used throughout the application
 */
declare global {
  namespace Express {
    interface Request {
      // Tenant/District context
      districtId?: number | null;
      districtSlug?: string | null;
      
      // User context
      userId?: number;
      user?: import('../auth/jwt.js').JWTPayload;
      
      // Vendor context (for merchant routes)
      vendorId?: number;
      
      // Raw body for webhook verification
      rawBody?: Buffer;
    }
  }
}

export {};
