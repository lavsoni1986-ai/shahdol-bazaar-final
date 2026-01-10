import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Hash password using scrypt (no plaintext fallback)
 */
export function hashPassword(password: string): string {
  if (!password || password.length < 3) {
    throw new Error('Password must be at least 3 characters long');
  }
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password (strict - no plaintext fallback)
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !password) {
    return false;
  }
  
  const parts = stored.split(':');
  
  // Strict validation: must be in format salt:hash
  if (parts.length !== 2) {
    console.warn('⚠️ [SECURITY] Attempted login with plaintext/legacy password format. Password must be rehashed.');
    return false; // NO PLAINTEXT FALLBACK
  }
  
  const [salt, storedHash] = parts;
  
  // Validate hash format
  if (!salt || !storedHash || salt.length !== 32 || storedHash.length !== 128) {
    console.warn('⚠️ [SECURITY] Invalid password hash format detected.');
    return false;
  }
  
  try {
    const hash = scryptSync(password, salt, 64);
    const hashBuf = Buffer.from(storedHash, 'hex');
    
    if (hashBuf.length !== hash.length) {
      return false;
    }
    
    // Timing-safe comparison to prevent timing attacks
    return timingSafeEqual(hash, hashBuf);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Check if password needs to be rehashed (legacy format detection)
 */
export function needsRehash(stored: string): boolean {
  if (!stored) return true;
  const parts = stored.split(':');
  return parts.length !== 2;
}
