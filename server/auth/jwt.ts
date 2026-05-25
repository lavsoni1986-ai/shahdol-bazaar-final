import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import type { Request } from 'express';

type JwtModule = typeof import('jsonwebtoken');
type JwtNamespaceWithDefault = JwtModule & { default?: JwtModule };

// jsonwebtoken is CommonJS in this repo; under Node ESM, `import * as jwt` may expose the real API under `default`.
const jwtApi: JwtModule = (jwt as JwtNamespaceWithDefault).default ?? jwt;

// Throw error in production if JWT_SECRET is not set
// 🛡️ VERCEL GUARD: Env vars are injected at runtime, not build time.
// Don't throw at module load — JWT operations will fail gracefully if missing.
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

if (isProduction && !isVercel && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}
if (isProduction && !isVercel && !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error('REFRESH_TOKEN_SECRET environment variable is required in production');
}

// In development, allow fallback to random secrets (for ease of setup)
// In production, this will throw above if not set or empty
const envJwtSecret = process.env.JWT_SECRET;
const envRefreshSecret = process.env.REFRESH_TOKEN_SECRET;

// STRICT: In production, reject empty strings (skip on Vercel — runtime injects after build)
if (isProduction && !isVercel) {
  if (!envJwtSecret || envJwtSecret.trim() === '') {
    throw new Error('JWT_SECRET environment variable is required in production (empty string not allowed)');
  }
  if (!envRefreshSecret || envRefreshSecret.trim() === '') {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is required in production (empty string not allowed)');
  }
}

const JWT_SECRET = envJwtSecret || randomBytes(64).toString('hex');
const REFRESH_TOKEN_SECRET = envRefreshSecret || randomBytes(64).toString('hex');

export interface JWTPayload {
  userId: number;
  username: string;
  role: 'SUPER_ADMIN' | 'CITY_ADMIN' | 'MERCHANT' | 'CUSTOMER';
  districtId?: number | null;
  districtSlug?: string | null;
  tokenVersion?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access token (7 days expiry)
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwtApi.sign(payload, JWT_SECRET, {
    expiresIn: '30m', // 30 minutes session timeout
    issuer: 'shahdol-bazaar',
    audience: 'shahdol-bazaar-client',
  });
}

/**
 * Generate refresh token (7 days expiry)
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwtApi.sign({
    userId: payload.userId,
    username: payload.username,
    districtId: payload.districtId,
    role: payload.role,
    tokenVersion: payload.tokenVersion || 1
  }, REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
    issuer: 'shahdol-bazaar',
    audience: 'shahdol-bazaar-client',
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: JWTPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwtApi.verify(token, JWT_SECRET, {
      issuer: 'shahdol-bazaar',
      audience: 'shahdol-bazaar-client',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: number; username: string; districtId?: number; role?: string; tokenVersion?: number } {
  try {
    const decoded = jwtApi.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: 'shahdol-bazaar',
      audience: 'shahdol-bazaar-client',
    }) as { userId: number; username: string; districtId?: number; role?: string; tokenVersion?: number };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  // ✅ HANDLE ARRAY CASE
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (typeof header !== "string") return null;

  if (!header.startsWith("Bearer ")) return null;

  const token = header.split(" ")[1];
  if (!token || token.trim() === "") return null;

  return token;
}
