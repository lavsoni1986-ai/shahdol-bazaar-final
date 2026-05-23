import 'express';

/**
 * Sovereign Express Request Interface - BharatOS Standard
 * All custom properties centralized for type safety
 */
declare global {
  namespace Express {
    interface Request {
      // Legacy transitional fields (keep temporarily)
      districtId?: number | null;
      districtSlug?: string | null;
      userId?: number;
      user?: import('../auth/jwt').JWTPayload;
      vendorId?: number;

      rawBody?: Buffer;
      ip?: string;
      userAgent?: string;
      sessionId?: string;
      requestId?: string;
      startTime?: number;

      isAdminRoute?: boolean;
      isPublicRoute?: boolean;
      requiresAuth?: boolean;

      // 🛡️ CANONICAL SOVEREIGN AUTHORITY
      ctx?: {
        districtId: number | null;
        districtSlug?: string | null;
        userId?: number;
        role?: string;
        isAdmin?: boolean;
        requestId?: string;
      };
    }
  }
}

export {};
