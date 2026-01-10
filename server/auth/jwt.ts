import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || randomBytes(64).toString('hex');
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || randomBytes(64).toString('hex');

export interface JWTPayload {
  userId: number;
  username: string;
  role: 'SUPER_ADMIN' | 'CITY_ADMIN' | 'MERCHANT' | 'CUSTOMER';
  shopId?: number | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access token (15 minutes expiry)
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m',
    issuer: 'shahdol-bazaar',
    audience: 'shahdol-bazaar-client',
  });
}

/**
 * Generate refresh token (7 days expiry)
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign({ userId: payload.userId, username: payload.username }, REFRESH_TOKEN_SECRET, {
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
    const decoded = jwt.verify(token, JWT_SECRET, {
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
export function verifyRefreshToken(token: string): { userId: number; username: string } {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: 'shahdol-bazaar',
      audience: 'shahdol-bazaar-client',
    }) as { userId: number; username: string };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}
